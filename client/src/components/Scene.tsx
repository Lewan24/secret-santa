export function Scene({ quiet }: { quiet: boolean }) {
  return (
    <div className={`scene ${quiet ? "quiet" : ""}`} aria-hidden="true">
      <div className="lights">
        {Array.from({ length: 15 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="snow">
        {Array.from({ length: 24 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              animationDelay: `-${i * 0.8}s`,
              animationDuration: `${11 + (i % 7)}s`,
              fontSize: `${8 + (i % 4) * 3}px`,
            }}
          >
            ✦
          </span>
        ))}
      </div>
      <div className="pine pine-left">
        ✧<br />▲<br />
        ▲▲
        <br />
        ▲▲▲
      </div>
      <div className="pine pine-right">
        ✧<br />▲<br />
        ▲▲
        <br />
        ▲▲▲
      </div>
      <div className="orb orb-one" />
      <div className="orb orb-two" />
    </div>
  );
}
