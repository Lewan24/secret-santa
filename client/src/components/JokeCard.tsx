import { useState } from "react";
import { useContentPool, usePick } from "../hooks/useContentPool";
import { another } from "../lib/random";

const copy = {
  jokes: {
    title: "Mikołajowy raport humorystyczny",
    button: "Kolejny żart",
    source: "Prosto z bieguna północnego",
    image: "/assets/jokes/santa.svg",
  },
  tips: {
    title: "Rada elfów od prezentów",
    button: "Inna rada",
    source: "Elfy sprawdziły, nie zawsze działa",
    image: "/assets/decor/elf.svg",
  },
} as const;

/** Karta z losowym żartem lub radą. Przycisk losuje kolejny (innego niż bieżący). */
export function JokeCard({ kind = "jokes" }: { kind?: "jokes" | "tips" }) {
  const pool = useContentPool();
  const list = pool?.[kind];
  const initial = usePick(list);
  const [chosen, setChosen] = useState<string>();
  const text = chosen ?? initial;
  const labels = copy[kind];
  return (
    <aside className="joke-card" aria-label={labels.title}>
      <img src={labels.image} alt="" width="64" height="64" />
      <div>
        <h2>{labels.title}</h2>
        <p key={text} className={text ? "joke-text" : "joke-text pending"}>
          {text ?? "\u00a0"}
        </p>
        <div className="joke-foot">
          <small>{labels.source}</small>
          <button
            className="text-button"
            disabled={!list || list.length < 2}
            onClick={() => list && setChosen(another(list, text))}
          >
            {labels.button} <span aria-hidden="true">🎲</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
