import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fill, usable } from "../client/src/lib/random";
import { parsePool } from "../client/src/content/pool";

test("podstawia wszystkie imiona bez interpretowania znaków specjalnych", () => {
  assert.equal(
    fill("{name}, prezent dla {recipient}. Powodzenia, {name}!", {
      name: "Anna $&",
      recipient: "Łukasz",
    }),
    "Anna $&, prezent dla Łukasz. Powodzenia, Anna $&!",
  );
});

test("bez zalogowanego uczestnika pomija teksty wymagające imienia", () => {
  assert.deepEqual(usable(["Hej!", "Hej, {name}!"], {}), ["Hej!"]);
  assert.deepEqual(usable(["Hej, {name}!"], {}), []);
  assert.deepEqual(usable(["Hej, {name}!"], { name: "Anna" }), [
    "Hej, {name}!",
  ]);
});

test("aktualne teksty uczestnika i Mikołaja nie zostawiają znaczników", async () => {
  const pool = parsePool(
    JSON.parse(await readFile("client/public/content-pool.json", "utf8")),
  );
  const lists = [
    pool.greetings,
    pool.waitingMessages,
    pool.readyMessages,
    pool.openingMessages,
    pool.tips,
    pool.jokes,
    pool.santaQuips,
  ];
  for (const list of lists) {
    for (const text of list) {
      assert.doesNotMatch(fill(text, { name: "Anna" }), /\{\w+\}/);
    }
  }
  for (const text of pool.revealQuips) {
    assert.doesNotMatch(
      fill(text, { name: "Anna", recipient: "Łukasz" }),
      /\{\w+\}/,
    );
  }
});
