import { useMemo, type CSSProperties } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

const colors = ["#edcb87", "#b94250", "#f6edda", "#4e9a6b", "#d9774c"];

/** Jednorazowy deszcz konfetti przy odsłonięciu wyniku. Czysty CSS, bez bibliotek. */
export function Confetti({ quiet, pieces = 42 }: { quiet: boolean; pieces?: number }) {
  const reduced = useReducedMotion();
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 2.2 + Math.random() * 1.6,
        drift: Math.round(Math.random() * 120 - 60),
        spin: Math.round(360 + Math.random() * 540),
        color: colors[i % colors.length],
        round: i % 4 === 0,
      })),
    [pieces],
  );
  if (quiet || reduced) return null;
  return (
    <div className="confetti-burst" aria-hidden="true">
      {items.map((p, i) => (
        <i
          key={i}
          className={p.round ? "round" : ""}
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--drift": `${p.drift}px`,
              "--spin": `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
