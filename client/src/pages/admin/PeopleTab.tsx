import { useState } from "react";
import { api } from "../../api/client";
import type { PublicEvent } from "../../../../shared/types";
import { ParticipantRow } from "./ParticipantRow";
import { submitWith, type Runner } from "./shared";

export function PeopleTab({
  current,
  locked,
  run,
  refresh,
  issue,
  updateCode,
}: {
  current: PublicEvent;
  locked: boolean;
  run: Runner;
  refresh: () => Promise<void>;
  issue: (ids: string[]) => Promise<void>;
  updateCode: (id: string, name?: string) => void;
}) {
  const [personName, setPersonName] = useState("");
  const [personPhoto, setPersonPhoto] = useState("");
  const submit = submitWith(run);
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Przy świątecznym stole</h2>
          <p>
            {locked
              ? "Imiona i zdjęcia możesz edytować zawsze. Przydziały pozostaną bez zmian."
              : "Każda osoba to jeden prezent i jedna tajemnica."}
          </p>
        </div>
        {current.participants.length > 0 && (
          <button
            className="secondary"
            onClick={() => {
              if (
                confirm(
                  "Wydać nowe kody wszystkim? Poprzednie kody i sesje zostaną unieważnione. Zapisz nowe kody przed zamknięciem strony.",
                )
              )
                void run(() =>
                  issue(current.participants.map((p) => p.id)),
                );
            }}
          >
            Wydaj QR wszystkim
          </button>
        )}
      </div>
      {!locked && (
        <form
          className="add-person"
          onSubmit={(e) =>
            submit(e, async () => {
              await api(
                `/admin/events/${current.id}/participants`,
                "POST",
                { name: personName, photo: personPhoto },
              );
              setPersonName("");
              setPersonPhoto("");
              await refresh();
            })
          }
        >
          <label>
            Imię uczestnika
            <input
              required
              maxLength={100}
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Kto dołącza do zabawy?"
            />
          </label>
          <label>
            Zdjęcie <span className="optional">(opcjonalnie)</span>
            <input
              value={personPhoto}
              onChange={(e) => setPersonPhoto(e.target.value)}
              placeholder="np. anna.jpg"
            />
          </label>
          <button>+ Dodaj osobę</button>
        </form>
      )}
      <p className="hint">
        📸 Zdjęcia JPG, PNG i WebP umieść w data-dev/photos (dev) lub
        /app/data/photos (Docker). W edycji osoby podaj samą nazwę
        pliku, np. anna.jpg — również po losowaniu.
      </p>
      <ul className="people">
        {current.participants.map((p) => (
          <ParticipantRow
            key={`${current.id}:${p.id}`}
            p={p}
            event={current}
            run={run}
            refresh={refresh}
            issue={issue}
            updateCode={updateCode}
          />
        ))}
      </ul>
      {!current.participants.length && (
        <p className="empty">
          Krzesła jeszcze puste. Dodaj pierwszą osobę powyżej.
        </p>
      )}
    </section>
  );
}
