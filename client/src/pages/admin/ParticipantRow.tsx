import { useState } from "react";
import { api } from "../../api/client";
import type { PublicEvent } from "../../../../shared/types";
import type { Runner } from "./shared";

export function ParticipantRow({
  p,
  event,
  run,
  refresh,
  issue,
  updateCode,
}: {
  p: PublicEvent["participants"][number];
  event: PublicEvent;
  run: Runner;
  refresh: () => Promise<void>;
  issue: (ids: string[]) => Promise<void>;
  updateCode: (id: string, name?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.name);
  const [photo, setPhoto] = useState(p.photo || "");
  const locked = event.status === "drawn";
  return (
    <li className="person-row">
      <div className="avatar" aria-hidden="true">
        {p.name.slice(0, 1)}
      </div>
      {editing ? (
        <form
          className="edit-person"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api(
                `/admin/events/${event.id}/participants/${p.id}`,
                "PATCH",
                { name, photo },
              );
              await refresh();
              updateCode(p.id, name);
              setEditing(false);
            });
          }}
        >
          <label>
            Imię
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Nazwa zdjęcia
            <input
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="np. anna.jpg"
            />
          </label>
          <button>Zapisz</button>
          <button
            type="button"
            className="secondary"
            onClick={() => setEditing(false)}
          >
            Anuluj
          </button>
        </form>
      ) : (
        <>
          <div className="person-name">
            <strong>{p.name}</strong>
            <small>
              {p.hasToken ? "Kod dostępu wydany" : "Czeka na swój kod"}
              {p.photo ? " · Zdjęcie przypisane" : ""}
            </small>
          </div>
          <div className="row-actions">
            <button
              className="text-button"
              onClick={() => {
                setName(p.name);
                setPhoto(p.photo || "");
                setEditing(true);
              }}
            >
              Edytuj / zdjęcie
            </button>
            <button
              className="secondary small"
              onClick={() => {
                if (
                  !p.hasToken ||
                  confirm(
                    `Nowy kod dla ${p.name} unieważni poprzedni kod i sesje. Kontynuować?`,
                  )
                )
                  void run(() => issue([p.id]));
              }}
            >
              {p.hasToken ? "Nowy QR" : "Wydaj QR"}
            </button>
            {p.hasToken && (
              <button
                className="text-button danger"
                onClick={() => {
                  if (confirm(`Unieważnić kod i sesje: ${p.name}?`))
                    void run(async () => {
                      await api(
                        `/admin/events/${event.id}/codes/${p.id}`,
                        "DELETE",
                      );
                      updateCode(p.id);
                      await refresh();
                    });
                }}
              >
                Unieważnij
              </button>
            )}
            {!locked && (
              <button
                className="text-button danger"
                onClick={() => {
                  if (confirm(`Usunąć uczestnika: ${p.name}?`))
                    void run(async () => {
                      await api(
                        `/admin/events/${event.id}/participants/${p.id}`,
                        "DELETE",
                      );
                      updateCode(p.id);
                      await refresh();
                    });
                }}
              >
                Usuń
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}
