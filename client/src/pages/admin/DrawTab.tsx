import { useState } from "react";
import { api } from "../../api/client";
import type { PublicEvent } from "../../../../shared/types";
import { GiftMini } from "./GiftMini";
import type { Runner } from "./shared";

export function DrawTab({
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
  const [confirmDraw, setConfirmDraw] = useState(false);
  return (
    <section className="panel draw-panel">
      <GiftMini />
      <h2>
        {locked
          ? "Świąteczne przeznaczenie ustalone!"
          : "Wszystkie elfy na stanowiskach?"}
      </h2>
      <p>
        {locked
          ? "Wyniki zapisane. Każda osoba zobaczy wyłącznie swój wynik po zeskanowaniu kodu."
          : "Losowanie zamknie listę uczestników i wykluczenia. Wynik jest zapisywany raz i pozostaje tajemnicą."}
      </p>
      {locked ? (
        <>
          <p className="success">
            Losowanie nr {current.drawRevision ?? 1}:{" "}
            {new Date(current.drawnAt!).toLocaleString("pl-PL")}
          </p>
          <div className="redraw-box">
            <h3>🎲 Elfy mieszają karteczki jeszcze raz?</h3>
            <p>
              Nowe losowanie zastąpi obecne wyniki. Uprzedź
              uczestników, którzy już odkryli swój prezent. Kody QR i
              zdjęcia pozostaną ważne.
            </p>
            <button
              className="secondary"
              onClick={() => {
                if (
                  !confirm(
                    "Przelosować całe wydarzenie? Poprzednie wyniki zostaną zastąpione. Uczestnicy muszą ponownie sprawdzić, komu kupują prezent.",
                  )
                )
                  return;
                void run(async () => {
                  await api(
                    `/admin/events/${current.id}/redraw`,
                    "POST",
                    {
                      confirmRedraw: true,
                      expectedRevision: current.drawRevision ?? 1,
                    },
                  );
                  await refresh();
                });
              }}
            >
              🎲 Przelosuj wszystko
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="check">
            <input
              type="checkbox"
              checked={confirmDraw}
              onChange={(e) => setConfirmDraw(e.target.checked)}
            />{" "}
            Lista i wykluczenia są gotowe. Zaczynamy!
          </label>
          <button
            disabled={!confirmDraw || current.participants.length < 2}
            onClick={() =>
              void run(async () => {
                await api(`/admin/events/${current.id}/draw`, "POST");
                await refresh();
              })
            }
          >
            Rozpocznij świąteczne losowanie ✧
          </button>
        </>
      )}
    </section>
  );
}
