import { createServer } from "node:http";
import { access } from "node:fs/promises";
import { once } from "node:events";
import { JsonStore } from "./storage/database.js";
import { createApp } from "./app.js";
import type { RuntimeConfig } from "./config.js";
import type { ViteDevServer } from "vite";

export async function startServer(config: RuntimeConfig) {
  if (!config.development) {
    try {
      await access("dist/client/index.html");
    } catch {
      throw Error(
        "Brak zbudowanego frontendu. Wykonaj npm run build albo uruchom npm run dev.",
      );
    }
  }
  const store = new JsonStore(config.dataDir);
  await store.init();
  let vite: ViteDevServer | undefined;
  const app = createApp(
    store,
    config,
    config.development
      ? (req, res, next) => vite!.middlewares(req, res, next)
      : undefined,
  );
  const server = createServer(app);
  let stopped = false;
  async function close() {
    if (stopped) return;
    stopped = true;
    const finished = server.listening
      ? new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        )
      : Promise.resolve();
    server.closeIdleConnections();
    // Close Vite's HMR socket so upgraded connections cannot hold shutdown open.
    if (vite) await vite.close();
    await finished;
    await store.drain();
  }
  try {
    if (config.development) {
      const { createServer: createViteServer } = await import("vite");
      vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: { server },
          allowedHosts: [new URL(config.baseUrl).hostname],
        },
        appType: "spa",
      });
    }
    server.listen(config.port, config.host);
    await once(server, "listening");
  } catch (error) {
    await close();
    throw error;
  }
  return { server, store, close };
}

export function handleShutdown(close: () => Promise<void>) {
  let closing = false;
  const stop = async () => {
    if (closing) return;
    closing = true;
    try {
      await close();
      process.exit(0);
    } catch {
      console.error("Nie udało się poprawnie zamknąć serwera.");
      process.exit(1);
    }
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
