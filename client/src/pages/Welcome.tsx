import { useEffect, useRef, useState } from "react";
import { Countdown } from "../components/Countdown";
import { Gift } from "../components/Gift";
import { JokeCard } from "../components/JokeCard";
import { useContentPool, usePick } from "../hooks/useContentPool";
import { another } from "../lib/random";

export function Welcome() {
  const pool = useContentPool();
  const kicker = usePick(pool?.kickers);
  const invalid =
    new URLSearchParams(location.search).get("invite") === "invalid";
  const [giftQuip, setGiftQuip] = useState("");
  const [poked, setPoked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Mały easter egg: prezent można szturchnąć, a Mikołaj komentuje.
  function poke() {
    if (!pool) return;
    setGiftQuip((previous) => another(pool.giftClicks, previous));
    setPoked(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPoked(false), 700);
  }

  return (
    <main className="welcome">
      <div className="event-tag">
        <span /> <i className={kicker ? "" : "pending"}>{kicker ?? "\u00a0"}</i>
      </div>
      <h1>
        Mała tajemnica.
        <br />
        Wielka radość.
      </h1>
      <p className="intro">
        W tym roku każdy zostaje czyimś Mikołajem.
        <br />A najpiękniejsze niespodzianki zaczynają się tutaj.
      </p>
      <button
        type="button"
        className="gift-button"
        onClick={poke}
        aria-label="Potrząśnij prezentem"
      >
        <Gift poked={poked} />
      </button>
      <p className="gift-quip" role="status" aria-live="polite">
        {giftQuip}
      </p>
      {invalid ? (
        <div className="notice error" role="alert">
          <strong>Ten kod stracił świąteczną moc.</strong>
          <p>Poproś organizatora o nowy link lub kod QR.</p>
        </div>
      ) : (
        <div className="scan-note">
          <span aria-hidden="true">▦</span>
          <div>
            <strong>Masz swoją świąteczną kopertę?</strong>
            <p>
              Zeskanuj kod QR aparatem telefonu lub otwórz prywatny link od
              organizatora.
            </p>
          </div>
        </div>
      )}
      <Countdown />
      <JokeCard kind="jokes" />
      <p className="secret-note">
        Jedna osoba. Jeden prezent. Całe mnóstwo uśmiechu.
      </p>
      <a className="organizer-link" href="/admin">
        Organizujesz święta? Wejdź do pracowni elfów{" "}
        <span aria-hidden="true">↗</span>
      </a>
      <div className="elf-note">
        <img src="/assets/jokes/santa.svg" alt="Podejrzliwy Mikołaj" />
        <p>
          Nie próbuj podglądać.
          <br />
          Mikołaj ma tu monitoring.<small>Ho, ho, ochrona danych!</small>
        </p>
      </div>
    </main>
  );
}
