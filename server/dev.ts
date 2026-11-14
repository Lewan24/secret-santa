import { readConfig } from "./config.js";
import { startServer, handleShutdown } from "./start.js";
import { loadEnvFile } from "node:process";
process.env.NODE_ENV = "development";
try {
  try {
    loadEnvFile(".env.development.local");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const config = readConfig(process.env, true);
  const runtime = await startServer(config);
  handleShutdown(runtime.close);
  console.log(
    `\nSecret Santa — tryb lokalny\n  Aplikacja: ${config.baseUrl}\n  Organizator: ${config.baseUrl}/admin\n  Dane: ${config.dataDir}\n  Frontend + API + HMR na jednym porcie.\n  Konfiguracja: .env.development.local (opcjonalna, nie czyta .env).`,
  );
  if (process.env.ADMIN_PASSWORD === undefined)
    console.log("  Lokalne hasło organizatora: santa-local-2026\n");
} catch (error) {
  const code = (error as NodeJS.ErrnoException).code;
  console.error(
    "Nie można uruchomić wersji lokalnej:",
    code === "EADDRINUSE"
      ? "Port jest zajęty. Zatrzymaj inny serwer albo zmień PORT i PUBLIC_BASE_URL w .env.development.local."
      : (code ?? (error as Error).message),
  );
  process.exitCode = 1;
}
