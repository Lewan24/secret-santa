import type { IssuedCode } from "../../../../shared/types";
import type { Runner } from "./shared";

export function Codes({ codes, run }: { codes: IssuedCode[]; run: Runner }) {
  return (
    <section className="codes-section">
      <div className="section-heading">
        <div>
          <h2>Świąteczne przepustki</h2>
          <p>
            Zapisz je teraz. Po opuszczeniu strony trzeba będzie wydać nowe
            kody.
          </p>
        </div>
        <button className="secondary" onClick={() => window.print()}>
          Drukuj karteczki
        </button>
      </div>
      <div className="codes">
        {codes.map((c) => (
          <article className="code-card" key={c.participantId}>
            <h3>{c.name}</h3>
            <img
              width="220"
              height="220"
              src={c.qr}
              alt={`Prywatny kod QR — ${c.name}`}
            />
            <p>
              Zeskanuj, aby sprawdzić,
              <br />
              komu kupujesz prezent.
            </p>
            <small>Zachowaj ten kod dla siebie. Mikołaj patrzy!</small>
            <div className="actions no-print">
              <a
                className="button secondary"
                href={c.qr}
                download={`secret-santa-${c.name.replace(/[^\p{L}\p{N} _-]/gu, "")}.png`}
              >
                Pobierz PNG
              </a>
              <button
                className="secondary"
                onClick={() =>
                  run(async () => {
                    if (!navigator.clipboard)
                      throw Error(
                        "Kopiowanie wymaga HTTPS. Rozwiń „Pokaż prywatny link” i skopiuj go ręcznie.",
                      );
                    await navigator.clipboard.writeText(c.url);
                  })
                }
              >
                Kopiuj link
              </button>
            </div>
            <details className="no-print">
              <summary>Pokaż prywatny link</summary>
              <input
                aria-label={`Link dla ${c.name}`}
                readOnly
                value={c.url}
                onFocus={(e) => e.target.select()}
              />
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
