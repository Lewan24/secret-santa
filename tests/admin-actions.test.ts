import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { JsonStore } from "../server/storage/database.js";
import { createApp } from "../server/app.js";
test("edycja po losowaniu, bezpieczne przelosowanie i usuwanie wydarzeń", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "santa-admin-"));
  const store = new JsonStore(dir);
  await store.init();
  const origin = "http://santa.test";
  const server = createApp(store, {
    password: "test-admin-password-2026",
    baseUrl: origin,
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  let cookie = "",
    csrf = "";
  async function call(
    route: string,
    method = "GET",
    body?: unknown,
    participantCookie?: string,
  ) {
    return fetch(base + "/api" + route, {
      method,
      headers: {
        origin,
        cookie: participantCookie ?? cookie,
        "x-csrf-token": csrf,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function json(route: string, method = "GET", body?: unknown) {
    const res = await call(route, method, body);
    const data = await res.json();
    assert.ok(res.ok, JSON.stringify(data));
    return data;
  }
  try {
    const login = await call("/admin/login", "POST", {
      password: "test-admin-password-2026",
    });
    cookie = login.headers.get("set-cookie")!.split(";")[0];
    csrf = ((await login.json()) as { csrf: string }).csrf;
    const e = await json("/admin/events", "POST", { name: "Testowa Wigilia" });
    for (const name of ["Anna", "Bartek", "Celina", "Darek", "Ewa"])
      await json(`/admin/events/${e.id}/participants`, "POST", { name });
    const p = store.snapshot().events[0].participants[0];
    const codes = await json(`/admin/events/${e.id}/codes`, "POST", {
      ids: [p.id],
    });
    const invite = await fetch(
      base + "/invite/" + codes[0].url.split("/").pop(),
      { redirect: "manual" },
    );
    const pcookie = invite.headers.get("set-cookie")!.split(";")[0];
    await json(`/admin/events/${e.id}/draw`, "POST");
    const original = store.snapshot().events[0];
    await json(`/admin/events/${e.id}/participants/${p.id}`, "PATCH", {
      name: "Ania",
      photo: "anna.jpg",
    });
    assert.deepEqual(
      store.snapshot().events[0].assignments,
      original.assignments,
    );
    assert.equal(store.snapshot().events[0].participants[0].photo, "anna.jpg");
    assert.equal(
      store.snapshot().events[0].participants[0].tokenHash,
      p.tokenHash ?? original.participants[0].tokenHash,
    );
    assert.equal(
      (
        await call(`/admin/events/${e.id}/participants/${p.id}`, "PATCH", {
          name: "Ania",
          photo: "../secret.jpg",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(`/admin/events/${e.id}/redraw`, "POST", {
          expectedRevision: 1,
        })
      ).status,
      409,
    );
    const next = await json("/admin/events", "POST", {
      name: "Kolejna edycja",
      copyFrom: e.id,
    });
    const redraws = await Promise.all([
      call(`/admin/events/${e.id}/redraw`, "POST", {
        confirmRedraw: true,
        expectedRevision: 1,
      }),
      call(`/admin/events/${e.id}/redraw`, "POST", {
        confirmRedraw: true,
        expectedRevision: 1,
      }),
    ]);
    assert.deepEqual(redraws.map((r) => r.status).sort(), [200, 409]);
    const redrawn = store.snapshot().events[0];
    assert.equal(redrawn.drawRevision, 2);
    assert.notDeepEqual(redrawn.assignments, original.assignments);
    assert.equal(
      store.snapshot().history.filter((h) => h.eventId === e.id).length,
      2,
    );
    assert.equal(
      redrawn.participants[0].tokenHash,
      original.participants[0].tokenHash,
    );
    const me = await call("/me", "GET", undefined, pcookie);
    assert.equal(me.status, 200);
    assert.equal(
      ((await me.json()) as { drawRevision: number }).drawRevision,
      2,
    );
    assert.equal(
      (await call("/me/photo?revision=1", "GET", undefined, pcookie)).status,
      409,
    );
    const own = await call("/me/result", "GET", undefined, pcookie);
    assert.equal(own.status, 200);
    assert.equal(
      ((await own.json()) as { name: string }).name,
      redrawn.participants.find((x) => x.id === redrawn.assignments[p.id])!
        .name,
    );
    assert.equal((await call(`/admin/events/${e.id}`, "DELETE")).status, 400);
    assert.equal(
      (
        await call(
          `/admin/events/${e.id}`,
          "DELETE",
          { confirmDelete: true },
          pcookie,
        )
      ).status,
      403,
    );
    await json(`/admin/events/${e.id}`, "DELETE", { confirmDelete: true });
    assert.equal((await call("/me", "GET", undefined, pcookie)).status, 401);
    const oldInvite = await fetch(
      base + "/invite/" + codes[0].url.split("/").pop(),
      { redirect: "manual" },
    );
    assert.equal(oldInvite.headers.get("location"), "/?invite=invalid");
    assert.ok(!store.snapshot().history.some((h) => h.eventId === e.id));
    assert.ok(!store.snapshot().sessions.some((s) => s.eventId === e.id));
    assert.ok(!store.snapshot().events.some((x) => x.id === e.id));
    const copied = store.snapshot().events.find((x) => x.id === next.id)!;
    assert.equal(copied.previousEventId, undefined);
    assert.deepEqual(copied.previousAssignments, original.assignments);
    const publicEvents = await json("/admin/events");
    assert.ok(!("previousAssignments" in publicEvents[0]));
    assert.equal(publicEvents[0].hasPreviousDraw, true);
    await json(`/admin/events/${next.id}/draw`, "POST");
    for (const [giver, to] of Object.entries(
      store.snapshot().events[0].assignments,
    ))
      assert.notEqual(to, original.assignments[giver]);
    const restarted = new JsonStore(dir);
    await restarted.init();
    assert.equal(restarted.snapshot().events.length, 1);
    await json(`/admin/events/${next.id}`, "DELETE", { confirmDelete: true });
    assert.deepEqual(await json("/admin/events"), []);
    assert.deepEqual(JSON.parse(await readFile(store.file, "utf8")).events, []);
    // The only allowed 2-person assignment cannot be changed: retain the old result.
    const two = await json("/admin/events", "POST", { name: "Dwie osoby" });
    for (const name of ["A", "B"])
      await json(`/admin/events/${two.id}/participants`, "POST", { name });
    await json(`/admin/events/${two.id}/rules`, "PUT", {
      noMutual: false,
      exclusions: [],
    });
    await json(`/admin/events/${two.id}/draw`, "POST");
    const before = store.snapshot();
    assert.equal(
      (
        await call(`/admin/events/${two.id}/redraw`, "POST", {
          confirmRedraw: true,
          expectedRevision: 1,
        })
      ).status,
      422,
    );
    assert.deepEqual(store.snapshot(), before);
  } finally {
    server.close();
    server.closeAllConnections();
    await store.drain();
    await rm(dir, { recursive: true, force: true });
  }
});
