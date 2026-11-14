import { test } from "node:test";
import assert from "node:assert/strict";
import { readConfig } from "../server/config.js";
test("dev działa bez konfiguracji i ma osobne dane oraz port", () => {
  const config = readConfig({}, true);
  assert.equal(config.port, 5173);
  assert.equal(config.baseUrl, "http://localhost:5173");
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.dataDir, "./data-dev");
  assert.ok(config.password.length >= 12);
});
test("produkcja nie korzysta z lokalnego hasła i wymaga własnej konfiguracji", () => {
  assert.throws(() => readConfig({}), /ADMIN_PASSWORD/);
  assert.throws(
    () => readConfig({ ADMIN_PASSWORD: "poprawne-haslo-123" }),
    /PUBLIC_BASE_URL/,
  );
  const c = readConfig({
    ADMIN_PASSWORD: "poprawne-haslo-123",
    PUBLIC_BASE_URL: "http://localhost:3000/",
  });
  assert.equal(c.baseUrl, "http://localhost:3000");
  assert.equal(c.port, 3000);
  assert.equal(c.dataDir, "./data");
  assert.equal(c.development, false);
});
test("walidacja portu, adresu i HTTP w trybie dev", () => {
  const env = {
    ADMIN_PASSWORD: "poprawne-haslo-123",
    PUBLIC_BASE_URL: "http://localhost:3000",
  };
  for (const port of ["0", "65536", "abc", "3.5", ""])
    assert.throws(() => readConfig({ ...env, PORT: port }), /PORT/);
  for (const url of [
    "invalid",
    "ftp://localhost",
    "http://localhost/admin",
    "http://user:password@localhost",
    "http://localhost/?x=1",
    "http://localhost/#x",
  ])
    assert.throws(
      () => readConfig({ ...env, PUBLIC_BASE_URL: url }),
      /PUBLIC_BASE_URL/,
    );
  assert.throws(
    () => readConfig({ ...env, PUBLIC_BASE_URL: "https://localhost" }, true),
    /HTTP/,
  );
});
