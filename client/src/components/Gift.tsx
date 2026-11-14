export function Gift({
  opening = false,
  poked = false,
}: {
  opening?: boolean;
  poked?: boolean;
}) {
  const state = opening ? "opening" : poked ? "poked" : "";
  return (
    <div className={`gift ${state}`} aria-hidden="true">
      <div className="gift-halo" />
      <span className="spark s1">✧</span>
      <span className="spark s2">✦</span>
      <span className="spark s3">✧</span>
      <div className="gift-lid">
        <div className="bow left" />
        <div className="bow right" />
      </div>
      <div className="gift-box">
        <div className="gift-ribbon" />
        <span>★</span>
      </div>
      <div className="gift-shadow" />
    </div>
  );
}
