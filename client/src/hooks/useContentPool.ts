import { useEffect, useMemo, useState } from "react";
import { loadContentPool, type ContentPool } from "../content/pool";
import { pick } from "../lib/random";

/** Zwraca pulę treści albo undefined, dopóki się nie wczyta (zwykle kilka milisekund). */
export function useContentPool(): ContentPool | undefined {
  const [pool, setPool] = useState<ContentPool>();
  useEffect(() => {
    let alive = true;
    void loadContentPool().then((p) => {
      if (alive) setPool(p);
    });
    return () => {
      alive = false;
    };
  }, []);
  return pool;
}

/** Losuje jeden element przy wejściu na stronę i trzyma go stabilnie między renderami. */
export function usePick<T>(list: readonly T[] | undefined): T | undefined {
  return useMemo(() => (list && list.length ? pick(list) : undefined), [list]);
}
