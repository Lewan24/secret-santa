import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, mkdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { JsonStore } from "../server/storage/database.js";
test("pierwsze uruchomienie, równoczesne zapisy, restart i opróżnienie kolejki", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "santa-"));
  try {
    const store = new JsonStore(dir);
    await store.init();
    await Promise.all(
      Array.from({ length: 60 }, (_, i) =>
        store.update((db) => {
          db.history.push({
            eventId: String(i),
            drawnAt: "now",
            assignments: {},
          });
        }),
      ),
    );
    await store.drain();
    const restarted = new JsonStore(dir);
    await restarted.init();
    assert.equal(restarted.snapshot().history.length, 60);
    assert.deepEqual(
      JSON.parse(await readFile(store.file, "utf8")),
      store.snapshot(),
    );
    const clone = store.snapshot();
    clone.history = [];
    assert.equal(store.snapshot().history.length, 60);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("błąd zapisu nie zmienia pamięci i nie zatruwa kolejki", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "santa-"));
  try {
    const store = new JsonStore(dir);
    await store.init();
    const initial = store.snapshot();
    await rename(store.file, `${store.file}.backup`);
    await mkdir(store.file);
    await assert.rejects(
      store.update((db) => {
        db.history.push({ eventId: "failed", drawnAt: "now", assignments: {} });
      }),
    );
    assert.deepEqual(store.snapshot(), initial);
    await rm(store.file, { recursive: true });
    await rename(`${store.file}.backup`, store.file);
    await store.update((db) => {
      db.history.push({ eventId: "ok", drawnAt: "now", assignments: {} });
    });
    assert.equal(store.snapshot().history[0].eventId, "ok");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("uszkodzona baza nie jest nadpisywana", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "santa-"));
  try {
    const { writeFile } = await import("node:fs/promises");
    const file = path.join(dir, "database.json");
    await writeFile(file, '{"broken":');
    await assert.rejects(new JsonStore(dir).init());
    assert.equal(await readFile(file, "utf8"), '{"broken":');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
