import { randomInt } from "node:crypto";
export class DrawError extends Error {}
export function draw(
  ids: string[],
  exclusions: [string, string][],
  noMutual = true,
  differentFrom?: Record<string, string>,
): Record<string, string> {
  if (ids.length < 3 && noMutual)
    throw new DrawError(
      "Potrzebne są co najmniej 3 osoby, gdy wzajemne pary są wykluczone.",
    );
  if (ids.length < 2) throw new DrawError("Dodaj co najmniej 2 uczestników.");
  const blocked = new Set(exclusions.map(([a, b]) => `${a}:${b}`));
  const choices = new Map(
    ids.map((id) => [
      id,
      ids.filter((to) => to !== id && !blocked.has(`${id}:${to}`)),
    ]),
  );
  const result: Record<string, string> = {};
  const used = new Set<string>();
  let steps = 0;
  const deadline = Date.now() + 2000;
  function search(): boolean {
    if (++steps > 500000 || (steps % 64 === 0 && Date.now() > deadline))
      throw new DrawError(
        "Osiągnięto limit wyszukiwania. Zmniejsz liczbę wykluczeń i spróbuj ponownie.",
      );
    if (used.size === ids.length)
      return (
        !differentFrom || ids.some((id) => result[id] !== differentFrom[id])
      );
    const remaining = ids
      .filter((id) => !result[id])
      .map((id) => ({
        id,
        options: choices
          .get(id)!
          .filter((to) => !used.has(to) && (!noMutual || result[to] !== id)),
      }))
      .sort((a, b) => a.options.length - b.options.length);
    const { id, options } = remaining[0];
    for (let i = options.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [options[i], options[j]] = [options[j], options[i]];
    }
    for (const to of options) {
      result[id] = to;
      used.add(to);
      if (search()) return true;
      delete result[id];
      used.delete(to);
    }
    return false;
  }
  if (!search())
    throw new DrawError(
      differentFrom
        ? "Przy tych ograniczeniach nie istnieje inny wynik losowania. Dotychczasowe przydziały pozostają bez zmian."
        : "Przy tych wykluczeniach losowanie jest niemożliwe. Usuń część wykluczeń lub dodaj uczestników.",
    );
  return result;
}
