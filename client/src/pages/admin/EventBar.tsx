import { useState } from "react";
import { api } from "../../api/client";
import type { PublicEvent } from "../../../../shared/types";
import { submitWith, type Runner } from "./shared";

export function EventBar({
  events,
  current,
  run,
  refresh,
  onSelect,
  onCreated,
  onDeleted,
}: {
  events: PublicEvent[];
  current: PublicEvent | undefined;
  run: Runner;
  refresh: () => Promise<void>;
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
  onDeleted: () => void;
}) {
  const [eventName, setEventName] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const submit = submitWith(run);
  return (
    <section className="event-bar">
      <label>
        Twoje wydarzenie
        <select
          value={current?.id || ""}
          onChange={(e) => onSelect(e.target.value)}
        >
          {!events.length && (
            <option value="">Jeszcze nic tu nie ma</option>
          )}
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} {e.status === "drawn" ? "✓" : ""}
            </option>
          ))}
        </select>
      </label>
      <details className="new-event">
        <summary className="button secondary">+ Nowe wydarzenie</summary>
        <form
          onSubmit={(e) =>
            submit(e, async () => {
              const created = await api<{ id: string }>(
                "/admin/events",
                "POST",
                { name: eventName, ...(copyFrom ? { copyFrom } : {}) },
              );
              await refresh();
              onCreated(created.id);
              setEventName("");
              setCopyFrom("");
            })
          }
        >
          <label>
            Nazwa wydarzenia
            <input
              required
              maxLength={100}
              placeholder="Wigilia u Kowalskich 2026"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </label>
          <label>
            Lista uczestników
            <select
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value)}
            >
              <option value="">Zacznij od pustej listy</option>
              {events
                .filter((e) => e.status === "drawn")
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    Kopiuj: {e.name}
                  </option>
                ))}
            </select>
          </label>
          {copyFrom && (
            <p className="hint">
              Zachowamy osoby i wykluczenia oraz wykluczymy przydziały z tej
              edycji. Kody trzeba wydać ponownie.
            </p>
          )}
          <button>Utwórz wydarzenie</button>
        </form>
      </details>
      {current && (
        <button
          className="secondary danger"
          onClick={() => {
            if (
              !confirm(
                `Trwale usunąć wydarzenie „${current.name}”? Znikną uczestnicy, wyniki, historia, kody i sesje tego wydarzenia. Tej operacji nie można cofnąć.`,
              )
            )
              return;
            void run(async () => {
              await api(`/admin/events/${current.id}`, "DELETE", {
                confirmDelete: true,
              });
              onDeleted();
              setCopyFrom("");
              await refresh();
            });
          }}
        >
          🗑 Usuń wydarzenie
        </button>
      )}
    </section>
  );
}
