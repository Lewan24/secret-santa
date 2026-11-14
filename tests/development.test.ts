import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { readConfig } from "../server/config.js";
import { startServer } from "../server/start.js";
test("tryb dev: HTML, HMR, kompilacja React i API na jednym porcie bez dist", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "santa-dev-"));
  const config = { ...readConfig({}, true), port: 0, dataDir: dir };
  const runtime = await startServer(config);
  const base = `http://127.0.0.1:${(runtime.server.address() as { port: number }).port}`;
  try {
    for (const route of ["/", "/admin"]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes("/@vite/client"));
      assert.ok(html.includes("/src/main.tsx"));
      assert.match(
        response.headers.get("content-security-policy")!,
        /script-src 'self' 'unsafe-inline'/,
      );
    }
    for (const route of [
      "/@vite/client",
      "/@react-refresh",
      "/src/main.tsx",
      "/src/styles/app.css",
      "/assets/gift.svg",
    ]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      await response.text();
    }
    const health = await fetch(base + "/health");
    assert.deepEqual(await health.json(), { status: "ok" });
    const login = await fetch(base + "/api/admin/login", {
      method: "POST",
      headers: { origin: config.baseUrl, "Content-Type": "application/json" },
      body: JSON.stringify({ password: config.password }),
    });
    assert.equal(login.status, 200);
    assert.ok(!login.headers.get("set-cookie")!.includes("; Secure"));
    const { csrf } = (await login.json()) as { csrf: string };
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const created = await fetch(base + "/api/admin/events", {
      method: "POST",
      headers: {
        origin: config.baseUrl,
        "Content-Type": "application/json",
        cookie,
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({ name: "Test lokalnego serwera" }),
    });
    assert.equal(created.status, 201);
    assert.equal(
      runtime.store.snapshot().events[0].name,
      "Test lokalnego serwera",
    );
  } finally {
    await runtime.close();
    await rm(dir, { recursive: true, force: true });
  }
});
