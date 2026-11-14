import { mkdir, readFile, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Database } from "../../shared/types.js";
export class JsonStore {
  private state!: Database;
  private queue: Promise<unknown> = Promise.resolve();
  readonly file: string;
  constructor(readonly directory: string) {
    this.file = path.join(directory, "database.json");
  }
  async init() {
    await mkdir(path.join(this.directory, "photos"), { recursive: true });
    try {
      this.state = JSON.parse(await readFile(this.file, "utf8"));
      if (
        this.state.version !== 1 ||
        !Array.isArray(this.state.events) ||
        !Array.isArray(this.state.sessions) ||
        !Array.isArray(this.state.history)
      )
        throw Error("Niepoprawny format bazy danych.");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const empty: Database = {
        version: 1,
        events: [],
        sessions: [],
        history: [],
      };
      await this.persist(empty);
      this.state = empty;
    }
  }
  snapshot() {
    return structuredClone(this.state);
  }
  private async persist(data: Database) {
    const temp = `${this.file}.${randomUUID()}.tmp`;
    try {
      const handle = await open(temp, "wx", 0o600);
      try {
        await handle.writeFile(JSON.stringify(data, null, 2));
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temp, this.file);
    } catch (error) {
      await unlink(temp).catch(() => {});
      throw error;
    }
  }
  update<T>(operation: (data: Database) => T | Promise<T>): Promise<T> {
    const task = this.queue.then(async () => {
      const next = this.snapshot();
      const result = await operation(next);
      await this.persist(next);
      this.state = next;
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }
  async drain() {
    await this.queue;
  }
}
