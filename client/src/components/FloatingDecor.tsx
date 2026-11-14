import { useMemo, type CSSProperties } from "react";
import { useContentPool } from "../hooks/useContentPool";
import { sample } from "../lib/random";

interface Slot {
  side: "left" | "right";
  edge: number; // % odstępu od krawędzi
  top: number; // % wysokości okna
  size: number; // px
  rot: number; // stopnie
}

// Miejsca przy krawędziach okna: środek zostaje wolny dla treści.
const slots: Slot[] = [
  { side: "left", edge: 1, top: 15, size: 150, rot: -8 },
  { side: "right", edge: 2, top: 20, size: 140, rot: 9 },
  { side: "right", edge: 1, top: 58, size: 165, rot: -6 },
  { side: "left", edge: 3, top: 54, size: 135, rot: 7 },
  { side: "left", edge: 0, top: 80, size: 145, rot: -10 },
  { side: "right", edge: 4, top: 82, size: 125, rot: 8 },
];

/** Śmieszne obrazki delikatnie bujające się w tle. Losowane z `decor` w content-pool.json. */
export function FloatingDecor() {
  const pool = useContentPool();
  const items = useMemo(
    () =>
      pool
        ? sample(pool.decor, slots.length).map((src, i) => ({
            src,
            slot: slots[i],
            jitter: Math.round(Math.random() * 6 - 3),
          }))
        : [],
    [pool],
  );
  return (
    <div className="decor" aria-hidden="true">
      {items.map(({ src, slot, jitter }, i) => (
        <img
          key={`${src}:${i}`}
          src={src}
          alt=""
          className="decor-item"
          draggable={false}
          style={
            {
              [slot.side]: `${slot.edge}%`,
              top: `${slot.top + jitter}%`,
              width: slot.size,
              "--rot": `${slot.rot}deg`,
              animationDelay: `-${i * 1.9}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
