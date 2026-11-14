import { readConfig } from "./config.js";
import { startServer, handleShutdown } from "./start.js";
try {
  const config = readConfig(process.env);
  const runtime = await startServer(config);
  handleShutdown(runtime.close);
  console.log(`Secret Santa: ${config.baseUrl} (port ${config.port})`);
} catch (error) {
  console.error(
    "Nie można uruchomić Secret Santa:",
    (error as NodeJS.ErrnoException).code ?? (error as Error).message,
  );
  process.exitCode = 1;
}
