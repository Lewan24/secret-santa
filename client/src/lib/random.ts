/** Małe pomocnicze funkcje losowania treści (żarty, teksty, obrazki). Nie służą do losowania prezentów. */

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function shuffle<T>(list: readonly T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sample<T>(list: readonly T[], count: number): T[] {
  return shuffle(list).slice(0, count);
}

/** Losuje element inny niż bieżący (o ile lista ma więcej niż jeden element). */
export function another<T>(list: readonly T[], current: T | undefined): T {
  if (list.length < 2) return list[0];
  let next = pick(list);
  while (next === current) next = pick(list);
  return next;
}

/** Podstawia {znaczniki}; nieznane znaczniki zostają bez zmian. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

/** Zostawia tylko teksty, w których wszystkie {znaczniki} mają wartość. */
export function usable(list: readonly string[], vars: Record<string, string>): string[] {
  const ok = list.filter((text) =>
    [...text.matchAll(/\{(\w+)\}/g)].every((m) => m[1] in vars),
  );
  return ok.length ? ok : [...list];
}
