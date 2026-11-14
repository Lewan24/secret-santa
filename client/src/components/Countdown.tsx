import { useMemo } from "react";
import { useContentPool, usePick } from "../hooks/useContentPool";
import type { CountdownKind } from "../content/pool";

const DAY = 86_400_000;

/** Liczba dni do najbliższej Wigilii (0 = dziś). Liczone na datach kalendarzowych, bez wpływu zmiany czasu. */
export function daysToChristmasEve(now = new Date()): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let eve = Date.UTC(now.getFullYear(), 11, 24);
  if (today > eve) eve = Date.UTC(now.getFullYear() + 1, 11, 24);
  return Math.round((eve - today) / DAY);
}

export function countdownKind(days: number): CountdownKind {
  if (days > 300) return "after";
  if (days === 0) return "eve";
  if (days <= 7) return "week";
  if (days <= 31) return "month";
  return "far";
}

export function Countdown() {
  const pool = useContentPool();
  const days = useMemo(() => daysToChristmasEve(), []);
  const kind = countdownKind(days);
  const quip = usePick(pool?.countdown[kind]);
  return (
    <section className="countdown" aria-label="Odliczanie do Wigilii">
      <div className="countdown-number">
        {days === 0 ? (
          <strong>Dziś!</strong>
        ) : (
          <>
            <strong>{days}</strong>
            <span>{days === 1 ? "dzień" : "dni"}</span>
          </>
        )}
      </div>
      <div className="countdown-copy">
        <b>{days === 0 ? "Wigilia jest dzisiaj" : "do Wigilii"}</b>
        <p className={quip ? "" : "pending"}>{quip ?? "\u00a0"}</p>
      </div>
    </section>
  );
}
