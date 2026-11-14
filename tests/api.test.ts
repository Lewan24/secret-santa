import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createApp, hash } from "../server/app.js";
import { JsonStore } from "../server/storage/database.js";
test("pełny przepływ API: prywatność, QR, sesje, restart, blokada losowania i kolejne edycje", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "santa-api-"));
  const store = new JsonStore(dir);
  await store.init();
  const origin = "http://santa.test";
  const config = { password: "bardzo-dlugie-haslo-testowe", baseUrl: origin };
  const server = createApp(store, config).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  type Client = { cookie: string; csrf: string };
  const admin: Client = { cookie: "", csrf: "" };
  const participant: Client = { cookie: "", csrf: "" };
  async function call(
    route: string,
    method = "GET",
    body?: unknown,
    client: Client = admin,
    headers: Record<string, string> = {},
  ) {
    const res = await fetch(base + route, {
      method,
      redirect: "manual",
      headers: {
        origin,
        "Content-Type": "application/json",
        cookie: client.cookie,
        "x-csrf-token": client.csrf,
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const cookie = res.headers.get("set-cookie");
    if (cookie) client.cookie = cookie.split(";")[0];
    return res;
  }
  async function json(
    route: string,
    method = "GET",
    body?: unknown,
    client = admin,
  ) {
    const res = await call(route, method, body, client);
    const data = await res.json();
    assert.ok(res.ok, JSON.stringify(data));
    return data;
  }
  try {
    assert.equal((await call("/api/admin/events")).status, 401);
    assert.equal(
      (await call("/api/admin/login", "POST", { password: "wrong" })).status,
      401,
    );
    assert.equal(
      (
        await call(
          "/api/admin/login",
          "POST",
          { password: config.password },
          admin,
          { origin: "http://evil.test" },
        )
      ).status,
      403,
    );
    const login = await json("/api/admin/login", "POST", {
      password: config.password,
    });
    admin.csrf = login.csrf;
    assert.match(admin.cookie, /santa_session=/);
    assert.equal(
      (
        await call("/api/admin/events", "POST", { name: "bad" }, admin, {
          "x-csrf-token": "wrong",
        })
      ).status,
      403,
    );
    const { id } = await json("/api/admin/events", "POST", {
      name: "Wigilia 2026",
    });
    for (const name of ["Anna", "Anna", "Michał", "Kasia", "Tomek"])
      await json(`/api/admin/events/${id}/participants`, "POST", { name });
    const list = await json("/api/admin/events");
    const people = list[0].participants;
    assert.equal(people.length, 5);
    assert.notEqual(people[0].id, people[1].id);
    assert.ok(!("assignments" in list[0]));
    assert.equal(
      (
        await call(`/api/admin/events/${id}/participants`, "POST", {
          name: "X",
          photo: "../../database.json",
        })
      ).status,
      400,
    );
    await json(`/api/admin/events/${id}/rules`, "PUT", {
      noMutual: true,
      exclusions: [[people[0].id, people[1].id]],
    });
    const codes = await json(`/api/admin/events/${id}/codes`, "POST", {
      ids: people.map((p: { id: string }) => p.id),
    });
    assert.equal(codes.length, 5);
    assert.match(codes[0].qr, /^data:image\/png;base64,/);
    assert.ok(codes[0].url.startsWith(origin + "/invite/"));
    const raw = codes[0].url.split("/").pop();
    const stored = JSON.stringify(store.snapshot());
    assert.ok(!stored.includes(raw));
    assert.ok(stored.includes(hash(raw)));
    const invite = await call("/invite/" + raw, "GET", undefined, participant);
    assert.equal(invite.status, 302);
    assert.equal(invite.headers.get("location"), "/");
    assert.match(invite.headers.get("set-cookie")!, /HttpOnly/);
    participant.csrf = (
      await json("/api/session", "GET", undefined, participant)
    ).csrf;
    const me = await json("/api/me", "GET", undefined, participant);
    assert.equal(me.name, "Anna");
    assert.equal(me.ready, false);
    assert.equal(
      (await call("/api/me/result", "GET", undefined, participant)).status,
      409,
    );
    const draws = await Promise.all([
      call(`/api/admin/events/${id}/draw`, "POST"),
      call(`/api/admin/events/${id}/draw`, "POST"),
    ]);
    assert.deepEqual(draws.map((r) => r.status).sort(), [200, 409]);
    assert.equal(store.snapshot().history.length, 1);
    const result = await json("/api/me/result", "GET", undefined, participant);
    assert.deepEqual(Object.keys(result).sort(), [
      "drawRevision",
      "hasPhoto",
      "name",
    ]);
    assert.equal(
      (await call("/api/admin/events", "GET", undefined, participant)).status,
      401,
    );
    const manipulated = await json(
      "/api/me/result?participantId=" + people[1].id,
      "GET",
      undefined,
      participant,
    );
    assert.deepEqual(manipulated, result);
    assert.equal(
      (
        await call(
          "/api/participants/" + people[1].id + "/result",
          "GET",
          undefined,
          participant,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await call(`/api/admin/events/${id}/participants`, "POST", {
          name: "Intruz",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(`/api/admin/events/${id}/rules`, "PUT", {
          noMutual: false,
          exclusions: [],
        })
      ).status,
      409,
    );
    const before = store.snapshot().events[0].assignments;
    const restarted = new JsonStore(dir);
    await restarted.init();
    assert.deepEqual(restarted.snapshot().events[0].assignments, before);
    assert.equal(
      restarted.snapshot().sessions.length,
      store.snapshot().sessions.length,
    );
    const restartedServer = createApp(restarted, config).listen(0, "127.0.0.1");
    await once(restartedServer, "listening");
    const restartPort = (restartedServer.address() as { port: number }).port;
    try {
      const restoredResult = await fetch(
        `http://127.0.0.1:${restartPort}/api/me/result`,
        { headers: { cookie: participant.cookie } },
      );
      assert.equal(restoredResult.status, 200);
      assert.deepEqual(await restoredResult.json(), result);
      const restoredAdmin = await fetch(
        `http://127.0.0.1:${restartPort}/api/admin/events`,
        { headers: { cookie: admin.cookie } },
      );
      assert.equal(restoredAdmin.status, 200);
    } finally {
      restartedServer.close();
      restartedServer.closeAllConnections();
    }
    const receiverId = before[people[0].id];
    await store.update((db) => {
      db.events[0].participants.find((p) => p.id === receiverId)!.photo =
        "photo.png";
    });
    await writeFile(
      path.join(dir, "photos", "photo.png"),
      Buffer.from([137, 80, 78, 71]),
    );
    const photo = await call("/api/me/photo", "GET", undefined, participant);
    assert.equal(photo.status, 200);
    assert.equal(photo.headers.get("cache-control"), "no-store");
    assert.equal((await call("/data/database.json")).status, 404);
    assert.equal((await call("/photos/photo.png")).status, 404);
    const regenerated = await json(`/api/admin/events/${id}/codes`, "POST", {
      ids: [people[0].id],
    });
    assert.deepEqual(store.snapshot().events[0].assignments, before);
    assert.equal(
      (await call("/api/me", "GET", undefined, participant)).status,
      401,
    );
    assert.equal(
      (await call("/invite/" + raw, "GET", undefined, participant)).headers.get(
        "location",
      ),
      "/?invite=invalid",
    );
    await call(
      "/invite/" + regenerated[0].url.split("/").pop(),
      "GET",
      undefined,
      participant,
    );
    participant.csrf = (
      await json("/api/session", "GET", undefined, participant)
    ).csrf;
    assert.deepEqual(
      await json("/api/me/result", "GET", undefined, participant),
      { name: result.name, hasPhoto: true, drawRevision: 1 },
    );
    await json("/api/logout", "POST", undefined, participant);
    assert.equal(
      (await call("/api/me", "GET", undefined, participant)).status,
      401,
    );
    await json(`/api/admin/events/${id}/codes/${people[0].id}`, "DELETE");
    assert.equal(
      (
        await call(
          "/invite/" + regenerated[0].url.split("/").pop(),
          "GET",
          undefined,
          participant,
        )
      ).headers.get("location"),
      "/?invite=invalid",
    );
    const next = await json("/api/admin/events", "POST", {
      name: "Wigilia 2027",
      copyFrom: id,
    });
    await json(`/api/admin/events/${next.id}/draw`, "POST");
    for (const [giver, to] of Object.entries(
      store.snapshot().events[1].assignments,
    ))
      assert.notEqual(to, before[giver]);
    const { rename, mkdir } = await import("node:fs/promises");
    await rename(store.file, store.file + ".backup");
    await mkdir(store.file);
    const failed = await call("/api/admin/events", "POST", {
      name: "Nie zapisane",
    });
    assert.equal(failed.status, 500);
    assert.equal(store.snapshot().events.length, 2);
    await rm(store.file, { recursive: true });
    await rename(store.file + ".backup", store.file);
    const privateResponse = await call("/api/admin/events");
    assert.equal(privateResponse.headers.get("cache-control"), "no-store");
    assert.ok(
      !JSON.stringify(await privateResponse.json()).includes("tokenHash"),
    );
  } finally {
    server.close();
    server.closeAllConnections();
    await store.drain();
    await rm(dir, { recursive: true, force: true });
  }
});

test("Secure cookies, limit logowania, zmiana hasła i wygaśnięcie sesji", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "santa-security-"));
  const store = new JsonStore(dir);
  await store.init();
  const config = {
    password: "testowe-haslo-12345",
    baseUrl: "https://santa.test",
  };
  const server = createApp(store, config).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const login = await fetch(base + "/api/admin/login", {
      method: "POST",
      headers: { origin: config.baseUrl, "Content-Type": "application/json" },
      body: JSON.stringify({ password: config.password }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")!;
    assert.match(cookie, /; Secure/);
    assert.match(cookie, /; HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    const changed = createApp(store, {
      ...config,
      password: "inne-haslo-67890",
    }).listen(0, "127.0.0.1");
    await once(changed, "listening");
    try {
      assert.equal(
        (
          await fetch(
            `http://127.0.0.1:${(changed.address() as { port: number }).port}/api/admin/events`,
            { headers: { cookie: cookie.split(";")[0] } },
          )
        ).status,
        401,
      );
    } finally {
      changed.close();
      changed.closeAllConnections();
    }
    await store.update((db) => {
      db.sessions.forEach((s) => (s.expires = Date.now() - 1));
    });
    assert.equal(
      (
        await fetch(base + "/api/admin/events", {
          headers: { cookie: cookie.split(";")[0] },
        })
      ).status,
      401,
    );
    for (let i = 0; i < 11; i++)
      assert.equal(
        (
          await fetch(base + "/api/admin/login", {
            method: "POST",
            headers: {
              origin: config.baseUrl,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ password: "wrong" }),
          })
        ).status,
        401,
      );
    assert.equal(
      (
        await fetch(base + "/api/admin/login", {
          method: "POST",
          headers: {
            origin: config.baseUrl,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: config.password }),
        })
      ).status,
      429,
    );
  } finally {
    server.close();
    server.closeAllConnections();
    await store.drain();
    await rm(dir, { recursive: true, force: true });
  }
});
