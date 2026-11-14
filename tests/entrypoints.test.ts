import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

async function freePort() {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  return port;
}
for (const development of [true, false]) {
  test(`${development ? "npm run dev" : "npm start"}: faktyczny skrypt startowy i logowanie`, async (t) => {
    if (!development)
      try {
        await access("dist/server/index.js");
      } catch {
        t.skip("Frontend i backend produkcyjny testowane po npm run build.");
        return;
      }
    const dir = await mkdtemp(path.join(tmpdir(), "santa-entry-"));
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const pkg = JSON.parse(await readFile("package.json", "utf8"));
    // Execute exactly the arguments of the package script without an extra npm shell.
    const args = (development ? pkg.scripts.dev : pkg.scripts.start)
      .split(" ")
      .slice(1);
    const child = spawn(process.execPath, args, {
      env: {
        ...process.env,
        NODE_ENV: development ? "development" : "production",
        PORT: String(port),
        PUBLIC_BASE_URL: base,
        ADMIN_PASSWORD: "test-entry-password-2026",
        DATA_DIR: dir,
        TRUST_PROXY: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const exited = new Promise<void>((resolve) =>
      child.once("exit", () => resolve()),
    );
    let output = "";
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error("Limit oczekiwania na serwer: " + output)),
          20000,
        );
        const read = (chunk: Buffer) => {
          output += chunk.toString();
          if (output.includes(development ? "Aplikacja:" : "Secret Santa:")) {
            clearTimeout(timer);
            resolve();
          }
        };
        child.stdout!.on("data", read);
        child.stderr!.on("data", read);
        child.once("error", (e) => {
          clearTimeout(timer);
          reject(e);
        });
        child.once("exit", (code) => {
          clearTimeout(timer);
          reject(Error("Start zakończony kodem " + code + ": " + output));
        });
      });
      const html = await fetch(base + "/admin");
      assert.equal(html.status, 200);
      const text = await html.text();
      assert.equal(text.includes("/@vite/client"), development);
      const res = await fetch(base + "/api/admin/login", {
        method: "POST",
        headers: { origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({ password: "test-entry-password-2026" }),
      });
      assert.equal(res.status, 200);
      const cookie = res.headers.get("set-cookie")!.split(";")[0];
      const events = await fetch(base + "/api/admin/events", {
        headers: { cookie },
      });
      assert.equal(events.status, 200);
      assert.deepEqual(await events.json(), []);
      if (development) {
        const react = await fetch(base + "/src/main.tsx");
        assert.equal(react.status, 200);
        await react.text();
      } else
        assert.ok(
          !html.headers
            .get("content-security-policy")!
            .match(/script-src[^;]*unsafe-inline/),
        );
    } finally {
      child.kill("SIGTERM");
      await exited;
      await rm(dir, { recursive: true, force: true });
    }
  });
}
