import { useMemo, useState } from "react";
import { useContentPool, usePick } from "../hooks/useContentPool";
import { another, fill, usable } from "../lib/random";

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
export function JokeCard({
  kind = "jokes",
  name,
}: {
  kind?: "jokes" | "tips";
  name?: string;
}) {
  const pool = useContentPool();
  const list = useMemo(
    () => pool && usable(pool[kind], name === undefined ? {} : { name }),
    [pool, kind, name],
  );
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
          {text ? fill(text, name === undefined ? {} : { name }) : "\u00a0"}
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
