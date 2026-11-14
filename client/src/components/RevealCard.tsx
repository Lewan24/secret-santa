import { forwardRef, useState } from "react";
import type { DrawResult } from "../types";
import { Confetti } from "./Confetti";

/** Karta z wynikiem: zdjęcie (lub Mikołaj), ogromne imię i zabawny dopisek. */
export const RevealCard = forwardRef<
  HTMLHeadingElement,
  { result: DrawResult; quip: string; quiet: boolean }
>(function RevealCard({ result, quip, quiet }, headingRef) {
  const [photoError, setPhotoError] = useState(false);
  return (
    <div className="result-card">
      <div className="result-portrait">
        {result.hasPhoto && !photoError ? (
          <img
            className="recipient-photo"
            src={`/api/me/photo?revision=${result.drawRevision}`}
            alt={`Zdjęcie osoby, której kupujesz prezent: ${result.name}`}
            onError={() => setPhotoError(true)}
          />
        ) : (
          <img
            className="recipient-illustration"
            src="/assets/jokes/santa.svg"
            alt="Mikołaj pilnujący tajemnicy"
          />
        )}
      </div>
      <div className="result-content">
        <p>Twoim świątecznym wybrańcem jest…</p>
        <h1 ref={headingRef} tabIndex={-1}>
          {result.name}
        </h1>
        <span>{quip}</span>
      </div>
      <Confetti quiet={quiet} />
    </div>
  );
});
