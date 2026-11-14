import { useReducedMotion } from "../hooks/useReducedMotion";
import { FlyingSanta } from "./FlyingSanta";
import { FloatingDecor } from "./FloatingDecor";

/** Stała (nieprzewijana) warstwa tła: śmieszne obrazki i latający Mikołaj. */
export function Backdrop({
  quiet,
  santa = true,
}: {
  quiet: boolean;
  santa?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="backdrop" aria-hidden="true">
      <FloatingDecor />
      {santa && !quiet && !reduced && <FlyingSanta />}
    </div>
  );
}
