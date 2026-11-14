import { test } from "node:test";
import assert from "node:assert/strict";
import { draw, DrawError } from "../server/services/draw.js";
test("ponowne losowanie wymaga innego wyniku i zgłasza brak alternatywy", () => {
  const ids = ["a", "b", "c"];
  const first = draw(ids, []);
  const second = draw(ids, [], true, first);
  assert.notDeepEqual(first, second);
  assert.throws(
    () => draw(["a", "b"], [], false, { a: "b", b: "a" }),
    /nie istnieje inny wynik/,
  );
});
test("losowanie: kompletne, bez duplikatów, siebie, wzajemnych par i wykluczeń", () => {
  const ids = ["a", "b", "c", "d", "e", "f"];
  for (let i = 0; i < 150; i++) {
    const result = draw(ids, [
      ["a", "b"],
      ["b", "a"],
      ["c", "d"],
    ]);
    assert.equal(Object.keys(result).length, ids.length);
    assert.equal(new Set(Object.values(result)).size, ids.length);
    for (const id of ids) {
      assert.notEqual(result[id], id);
      assert.notEqual(result[result[id]], id);
    }
    assert.notEqual(result.a, "b");
    assert.notEqual(result.b, "a");
    assert.notEqual(result.c, "d");
  }
});
test("niemożliwe ograniczenia kończą się czytelnym błędem", () => {
  assert.throws(() => draw(["a", "b"], []), DrawError);
  assert.throws(
    () =>
      draw(
        ["a", "b", "c"],
        [
          ["a", "b"],
          ["a", "c"],
        ],
      ),
    /niemożliwe/,
  );
  assert.throws(() => draw([], [], false), /co najmniej/);
});
test("administrator może dopuścić wzajemne pary", () => {
  assert.deepEqual(draw(["a", "b"], [], false), { a: "b", b: "a" });
});
