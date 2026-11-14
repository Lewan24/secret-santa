import { useEffect, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { safeUrl } from "../lib/safeUrl";
interface Meme {
  src: string;
  poster?: string;
  type: "image" | "gif";
  alt: string;
  caption: string;
  icon?: string;
  credit?: string;
  sourceUrl?: string;
}
const fallback: Meme = {
  src: "/assets/jokes/cat.svg",
  type: "image",
  alt: "Kot i przewrócona choinka",
  caption: "Nie dotykałem choinki. Ona po prostu potrzebowała się położyć.",
  icon: "🐈",
  credit: "Pracownia elfów",
};
export function FestiveMeme({
  quiet,
  celebrate,
}: {
  quiet: boolean;
  celebrate: boolean;
}) {
  const [pool, setPool] = useState<Meme[]>([fallback]);
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/media-pool.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        const valid = data
          .filter(
            (m): m is Meme =>
              !!m &&
              safeUrl(m.src) &&
              ["image", "gif"].includes(m.type) &&
              typeof m.alt === "string" &&
              typeof m.caption === "string",
          )
          .slice(0, 50);
        if (valid.length) {
          setPool(valid);
          setIndex(Math.floor(Math.random() * valid.length));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, []);
  const meme = pool[index] ?? fallback;
  const stopped = quiet || reduced;
  const src = broken
    ? fallback.src
    : stopped && meme.type === "gif"
      ? safeUrl(meme.poster)
        ? meme.poster
        : fallback.src
      : meme.src;
  function another() {
    setBroken(false);
    setIndex((i) =>
      pool.length < 2
        ? 0
        : (i + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length,
    );
  }
  // Bez migania awaryjnym kotem, zanim wczyta się pula.
  if (!loaded) return null;
  return (
    <aside className="meme-card" aria-label="Świąteczny przerywnik">
      <div className="meme-heading">
        <span>
          <span aria-hidden="true">{meme.icon || "🎅"}</span>{" "}
          {celebrate
            ? "Misja: zostać najlepszym Mikołajem"
            : "Tymczasem na biegunie…"}
        </span>
        <span className="meme-stamp">Elf approved ✓</span>
      </div>
      <div className="meme-body">
        <div className="meme-visual">
          <img
            key={src}
            src={src}
            alt={broken ? fallback.alt : meme.alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
          />
          {meme.type === "gif" && (
            <span className="gif-tag">{stopped ? "Stop-klatka" : "GIF"}</span>
          )}
        </div>
        <div className="meme-copy">
          <p>{meme.caption}</p>
          <span aria-hidden="true" className="meme-reactions">
            🎄 🤭 🎁
          </span>
          {safeUrl(meme.sourceUrl) ? (
            <a href={meme.sourceUrl} target="_blank" rel="noopener noreferrer">
              {meme.credit || "Źródło grafiki"} ↗
            </a>
          ) : (
            <small>{meme.credit || "Pracownia elfów"}</small>
          )}
        </div>
      </div>
      <div className="meme-footer">
        <small>
          {stopped
            ? "Spokojny tryb: animowane GIF-y mają przerwę."
            : "Poziom świątecznego chaosu: kontrolowany. Chyba."}
        </small>
        <button
          className="text-button"
          onClick={another}
          disabled={pool.length < 2}
        >
          Inny żart <span aria-hidden="true">🎲</span>
        </button>
      </div>
    </aside>
  );
}
