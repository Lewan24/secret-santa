import { useEffect, useMemo, useRef } from "react";
import { Gift } from "../components/Gift";
import { FestiveMeme } from "../components/FestiveMeme";
import { JokeCard } from "../components/JokeCard";
import { RevealCard } from "../components/RevealCard";
import { FlyingSanta } from "../components/FlyingSanta";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useContentPool, usePick } from "../hooks/useContentPool";
import { useParticipant } from "../hooks/useParticipant";
import { fill, pick } from "../lib/random";

export function Participant({ quiet }: { quiet: boolean }) {
  const { me, error, phase, result, changed, refreshing, refresh, reveal } =
    useParticipant(quiet);
  const pool = useContentPool();
  const reduced = useReducedMotion();
  const resultRef = useRef<HTMLHeadingElement>(null);

  const greeting = usePick(pool?.greetings);
  const waiting = usePick(pool?.waitingMessages);
  const ready = usePick(pool?.readyMessages);
  const footerImage = usePick(pool?.decor) ?? "/assets/jokes/santa.svg";
  const tip = usePick(pool?.tips);
  // Nowe odkrycie (także „Pokaż jeszcze raz”) losuje nowy tekst.
  const quip = useMemo(
    () =>
      pool && result && me
        ? fill(pick(pool.revealQuips), {
            name: me.name,
            recipient: result.name,
          })
        : "",
    [pool, result, me?.name],
  );
  const opening = useMemo(
    () => (pool && phase === "opening" ? pick(pool.openingMessages) : ""),
    [pool, phase],
  );

  useEffect(() => {
    if (phase === "revealed") resultRef.current?.focus();
  }, [phase]);

  if (!me)
    return (
      <main className="center">
        <h1>Sprawdzamy listę Mikołaja…</h1>
        {error && <p role="alert">{error}</p>}
        <button className="secondary" onClick={refresh} disabled={refreshing}>
          Spróbuj ponownie
        </button>
      </main>
    );

  const status =
    phase === "opening"
      ? fill(opening, { name: me.name })
      : !me.ready
        ? waiting && fill(waiting, { name: me.name })
        : ready && fill(ready, { name: me.name });

  return (
    <main className="participant">
      {!quiet && !reduced && (
        <div className="backdrop" aria-hidden="true">
          <FlyingSanta name={me.name} />
        </div>
      )}
      <div className="event-tag">
        <span /> {me.eventName}
      </div>
      <p className={greeting ? "greeting" : "greeting pending"}>
        {greeting ? fill(greeting, { name: me.name }) : "\u00a0"}
      </p>
      <div className="holiday-reactions" aria-hidden="true">
        <span>🧑‍🎄</span>
        <span>🦌</span>
        <span>🍪</span>
        <span>🧦</span>
        <span>☃️</span>
      </div>
      {changed && (
        <p className="notice" role="status">
          🎲 Organizator ponownie wylosował prezenty. Odkryj swój nowy wynik!
        </p>
      )}
      {phase === "revealed" && result ? (
        <>
          <RevealCard
            ref={resultRef}
            result={result}
            quip={quip}
            quiet={quiet}
          />
          <p className="secret-note">
            🤫 Ta tajemnica zostaje między Tobą a Mikołajem.
          </p>
          <button onClick={reveal}>
            Pokaż jeszcze raz <span aria-hidden="true">↻</span>
          </button>
        </>
      ) : (
        <>
          <h1>
            Ktoś czeka na
            <br />
            Twoją świąteczną magię.
          </h1>
          <p className="intro">Mikołaj już wie, komu kupujesz prezent. A Ty?</p>
          <Gift opening={phase === "opening"} />
          <div className="reveal-status" role="status">
            {status}
          </div>
          {me.ready ? (
            <button
              className="reveal-button"
              disabled={phase === "opening"}
              onClick={reveal}
            >
              {phase === "opening"
                ? "Świąteczne przeznaczenie nadchodzi…"
                : "Sprawdź, komu kupujesz prezent"}{" "}
              <span aria-hidden="true">✧</span>
            </button>
          ) : (
            <button onClick={refresh} disabled={refreshing}>
              {refreshing ? "Sprawdzamy…" : "Sprawdź, czy już gotowe"}
            </button>
          )}
        </>
      )}
      <JokeCard kind="jokes" name={me.name} />
      <FestiveMeme quiet={quiet} celebrate={phase === "revealed"} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="elf-note">
        <img src={footerImage} alt="" />
        <p>
          {tip ? fill(tip, { name: me.name }) : "\u00a0"}
          <small>Wiadomość z bieguna północnego</small>
        </p>
      </div>
    </main>
  );
}
