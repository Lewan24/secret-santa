import type { Config } from "./app.js";
export interface RuntimeConfig extends Config {
  port: number;
  host: string;
  dataDir: string;
}
export function readConfig(
  env: NodeJS.ProcessEnv,
  development = false,
): RuntimeConfig {
  const password =
    env.ADMIN_PASSWORD ?? (development ? "santa-local-2026" : "");
  if (password.length < 12)
    throw Error("Ustaw ADMIN_PASSWORD (co najmniej 12 znaków).");
  const port = Number(env.PORT ?? (development ? "5173" : "3000"));
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("PORT musi być liczbą od 1 do 65535.");
  const address =
    env.PUBLIC_BASE_URL ?? (development ? `http://localhost:${port}` : "");
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    throw Error(
      "Ustaw PUBLIC_BASE_URL, np. http://localhost:3000 lub https://swieta.example.pl.",
    );
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw Error(
      "PUBLIC_BASE_URL musi być adresem http(s) bez ścieżki, parametrów i danych logowania.",
    );
  if (development && url.protocol !== "http:")
    throw Error(
      "Lokalny tryb dev obsługuje HTTP. Ustaw PUBLIC_BASE_URL=http://localhost:" +
        port +
        ". HTTPS wymaga reverse proxy w wersji produkcyjnej.",
    );
  return {
    password,
    port,
    baseUrl: url.origin,
    dataDir: env.DATA_DIR || (development ? "./data-dev" : "./data"),
    host: development ? env.DEV_HOST || "127.0.0.1" : "0.0.0.0",
    trustProxy: env.TRUST_PROXY,
    development,
  };
}
