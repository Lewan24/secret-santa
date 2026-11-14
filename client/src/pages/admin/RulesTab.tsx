import { useState } from "react";
import { api } from "../../api/client";
import type { PublicEvent } from "../../../../shared/types";
import { submitWith, type Runner } from "./shared";

export function RulesTab({
  current,
  locked,
  run,
  refresh,
}: {
  current: PublicEvent;
  locked: boolean;
  run: Runner;
  refresh: () => Promise<void>;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const submit = submitWith(run);
  return (
    <section className="panel">
      <h2>Trochę zasad, dużo niespodzianki</h2>
      <p>
        Nikt nie losuje siebie. Każdy daje i dostaje dokładnie jeden
        prezent.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={current.noMutual}
          disabled={locked}
          onChange={(e) =>
            void run(async () => {
              await api(`/admin/events/${current.id}/rules`, "PUT", {
                exclusions: current.exclusions,
                noMutual: e.target.checked,
              });
              await refresh();
            })
          }
        />{" "}
        Bez wzajemnych par (A → B oraz B → A)
      </label>
      {current.hasPreviousDraw && (
        <p className="notice">
          Przydziały z poprzedniej edycji są automatycznie wykluczone.
        </p>
      )}
      <h3>Kto nie powinien kogo wylosować?</h3>
      <p className="hint">
        Wykluczenia są kierunkowe. Dla partnerów dodaj oba kierunki.
      </p>
      {!locked && (
        <form
          className="exclusion-form"
          onSubmit={(e) =>
            submit(e, async () => {
              if (!from || !to || from === to)
                throw Error("Wybierz dwie różne osoby.");
              if (
                current.exclusions.some(
                  (p) => p[0] === from && p[1] === to,
                )
              )
                throw Error("To wykluczenie już istnieje.");
              await api(`/admin/events/${current.id}/rules`, "PUT", {
                exclusions: [...current.exclusions, [from, to]],
                noMutual: current.noMutual,
              });
              await refresh();
            })
          }
        >
          <label>
            Osoba dająca
            <select
              required
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            >
              <option value="">Wybierz osobę</option>
              {current.participants.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <span aria-hidden="true">↛</span>
          <label>
            Nie może wylosować
            <select
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
            >
              <option value="">Wybierz osobę</option>
              {current.participants
                .filter((p) => p.id !== from)
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <button>Dodaj wykluczenie</button>
        </form>
      )}
      <ul className="exclusions">
        {current.exclusions.map(([a, b], i) => (
          <li key={`${a}:${b}`}>
            <span>
              {current.participants.find((p) => p.id === a)?.name}{" "}
              <span aria-hidden="true">↛</span>
              <span className="sr-only">nie może wylosować</span>{" "}
              {current.participants.find((p) => p.id === b)?.name}
            </span>
            {!locked && (
              <button
                className="text-button danger"
                onClick={() =>
                  void run(async () => {
                    await api(
                      `/admin/events/${current.id}/rules`,
                      "PUT",
                      {
                        exclusions: current.exclusions.filter(
                          (_, j) => i !== j,
                        ),
                        noMutual: current.noMutual,
                      },
                    );
                    await refresh();
                  })
                }
              >
                Usuń
              </button>
            )}
          </li>
        ))}
      </ul>
      {!current.exclusions.length && (
        <p className="empty">
          Bez dodatkowych wykluczeń. Niech los robi swoje!
        </p>
      )}
    </section>
  );
}
