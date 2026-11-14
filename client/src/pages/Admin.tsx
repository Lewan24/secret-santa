import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { IssuedCode, PublicEvent } from "../../../shared/types";
import { AdminLogin } from "./admin/AdminLogin";
import { Codes } from "./admin/Codes";
import { DrawTab } from "./admin/DrawTab";
import { EventBar } from "./admin/EventBar";
import { GiftMini } from "./admin/GiftMini";
import { PeopleTab } from "./admin/PeopleTab";
import { RulesTab } from "./admin/RulesTab";

export function Admin({
  logged,
  onLogin,
}: {
  logged: boolean;
  onLogin: () => Promise<void>;
}) {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<IssuedCode[]>([]);
  const [tab, setTab] = useState("people");
  const current =
    events.find((e) => e.id === selected) || events[events.length - 1];
  const locked = current?.status === "drawn";

  async function refresh() {
    setEvents(await api("/admin/events"));
  }
  useEffect(() => {
    if (logged) void refresh().catch((e) => setError(e.message));
  }, [logged]);
  // Wydane kody istnieją tylko w pamięci strony: ostrzeż przed jej zamknięciem.
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    if (codes.length) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [codes.length]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage("Gotowe. Elfy meldują wykonanie zadania.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function issue(ids: string[]) {
    const issued = await api<IssuedCode[]>(
      `/admin/events/${current!.id}/codes`,
      "POST",
      { ids },
    );
    setCodes((old) => [
      ...old.filter((c) => !ids.includes(c.participantId)),
      ...issued,
    ]);
    await refresh();
  }
  /** Synchronizuje listę wydanych kodów po edycji (nowe imię) lub usunięciu osoby/kodu. */
  function updateCode(id: string, name?: string) {
    setCodes((old) =>
      name === undefined
        ? old.filter((c) => c.participantId !== id)
        : old.map((c) => (c.participantId === id ? { ...c, name } : c)),
    );
  }
  function selectEvent(id: string) {
    if (
      codes.length &&
      !confirm(
        "Zapisz wydane kody przed zmianą wydarzenia. Zmiana zamknie ich jednorazowy eksport. Kontynuować?",
      )
    )
      return;
    setCodes([]);
    setSelected(id);
  }

  if (!logged)
    return (
      <AdminLogin run={run} busy={busy} error={error} onLogin={onLogin} />
    );
  return (
    <main className="admin">
      <div className="admin-title">
        <div>
          <p className="greeting">Za kulisami świątecznej magii</p>
          <h1>Pracownia elfów</h1>
          <p>Zbierz bliskich. Rozdaj tajemnice. Zrób komuś święta.</p>
        </div>
        <img src="/assets/jokes/reindeer.svg" alt="Renifer gotowy na przerwę" />
      </div>
      <div className="feedback" aria-live="polite">
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : message ? (
          <p className="success">{message}</p>
        ) : null}
      </div>
      <fieldset disabled={busy} className="admin-fieldset">
        <EventBar
          events={events}
          current={current}
          run={run}
          refresh={refresh}
          onSelect={selectEvent}
          onCreated={(id) => {
            setCodes([]);
            setSelected(id);
          }}
          onDeleted={() => {
            setCodes([]);
            setSelected("");
          }}
        />
        {!current ? (
          <section className="empty-state">
            <GiftMini />
            <h2>Pierwszy krok do wielkiej niespodzianki</h2>
            <p>
              Otwórz „Nowe wydarzenie”, nadaj mu nazwę i zaproś rodzinę do
              zabawy.
            </p>
          </section>
        ) : (
          <>
            <section className="event-overview">
              <div>
                <span className={`status ${locked ? "done" : ""}`}>
                  <i />
                  {locked ? "Losowanie gotowe" : "Przygotowania trwają"}
                </span>
                <h2>{current.name}</h2>
                <p>
                  {locked
                    ? "Tajemnice są bezpieczne. Teraz czas rozdać kody QR."
                    : "Dodaj bliskich i ustal zasady. Resztą zajmie się świąteczny los."}
                </p>
              </div>
              <div className="event-count">
                <strong>{current.participants.length}</strong>
                <span>osób przy stole</span>
              </div>
            </section>
            <nav className="tabs" aria-label="Ustawienia wydarzenia">
              {[
                ["people", "Uczestnicy"],
                ["rules", "Zasady losowania"],
                ["draw", "Losowanie"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-current={tab === id ? "page" : undefined}
                  className={tab === id ? "active" : ""}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab === "people" && (
              <PeopleTab
                key={current.id}
                current={current}
                locked={locked}
                run={run}
                refresh={refresh}
                issue={issue}
                updateCode={updateCode}
              />
            )}
            {tab === "rules" && (
              <RulesTab
                key={current.id}
                current={current}
                locked={locked}
                run={run}
                refresh={refresh}
              />
            )}
            {tab === "draw" && (
              <DrawTab
                key={current.id}
                current={current}
                locked={locked}
                run={run}
                refresh={refresh}
              />
            )}
          </>
        )}
      </fieldset>
      {codes.length > 0 && <Codes codes={codes} run={run} />}
    </main>
  );
}
