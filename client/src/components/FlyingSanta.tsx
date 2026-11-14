import { useCallback, useEffect, useRef, useState, type AnimationEvent } from "react";
import { useContentPool } from "../hooks/useContentPool";
import { pick } from "../lib/random";

type Direction = "ltr" | "rtl";
interface Flight {
  id: number;
  dir: Direction;
  top: number;
  quip: string;
}

const FIRST_DELAY = [2500, 3000] as const; // ms: minimum, rozrzut
const BREAK = [5000, 9000] as const;

const wait = ([min, spread]: readonly [number, number]) =>
  min + Math.random() * spread;

/**
 * Mikołaj na saniach przelatuje przez ekran raz w jedną, raz w drugą stronę,
 * za każdym razem na innej wysokości i z innym tekstem z puli `santaQuips`.
 */
export function FlyingSanta() {
  const pool = useContentPool();
  const quips = pool?.santaQuips;
  const [flight, setFlight] = useState<Flight | null>(null);
  const direction = useRef<Direction>(Math.random() < 0.5 ? "ltr" : "rtl");
  const counter = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const launch = useCallback(() => {
    const dir = direction.current;
    direction.current = dir === "ltr" ? "rtl" : "ltr";
    setFlight({
      id: ++counter.current,
      dir,
      top: 9 + Math.random() * 28,
      quip: quips?.length ? pick(quips) : "",
    });
  }, [quips]);

  useEffect(() => {
    if (!quips) return;
    timer.current = setTimeout(launch, wait(FIRST_DELAY));
    return () => clearTimeout(timer.current);
  }, [quips, launch]);

  function landed(event: AnimationEvent<HTMLDivElement>) {
    // Zdarzenia animacji dzieci (dymek, bujanie) nie kończą lotu.
    if (event.target !== event.currentTarget) return;
    setFlight(null);
    timer.current = setTimeout(launch, wait(BREAK));
  }

  if (!flight) return null;
  return (
    <div
      key={flight.id}
      className={`santa-flyer ${flight.dir}`}
      style={{ top: `${flight.top}%` }}
      onAnimationEnd={landed}
    >
      <div className="santa-bob">
        {flight.quip && <p className="santa-bubble">{flight.quip}</p>}
        <img src="/assets/decor/sleigh.svg" alt="" width="280" height="113" />
      </div>
    </div>
  );
}
