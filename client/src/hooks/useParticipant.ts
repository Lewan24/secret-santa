import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { DrawResult, Me, RevealPhase } from "../types";
import { useReducedMotion } from "./useReducedMotion";

const POLL_MS = 30_000;
const OPENING_MS = 1_900;

/**
 * Stan ekranu uczestnika: dane osoby, odkrywanie wyniku i wykrywanie ponownego losowania
 * (sprawdzanie wersji co 30 s oraz po powrocie do okna).
 */
export function useParticipant(quiet: boolean) {
  const [me, setMe] = useState<Me>();
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<RevealPhase>("closed");
  const [result, setResult] = useState<DrawResult>();
  const [changed, setChanged] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const revision = useRef<number | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reduced = useReducedMotion();

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await api<Me>("/me");
      if (
        revision.current !== undefined &&
        revision.current !== next.drawRevision
      ) {
        clearTimeout(timer.current);
        setPhase("closed");
        setResult(undefined);
        setChanged(true);
      }
      revision.current = next.drawRevision;
      setMe(next);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      clearTimeout(timer.current);
      clearInterval(poll);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);

  const reveal = useCallback(async () => {
    setError("");
    setPhase("opening");
    try {
      const data = await api<DrawResult>("/me/result");
      setChanged(false);
      revision.current = data.drawRevision;
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => {
          setResult(data);
          setPhase("revealed");
        },
        quiet || reduced ? 0 : OPENING_MS,
      );
    } catch (e) {
      setError((e as Error).message);
      setPhase("closed");
    }
  }, [quiet, reduced]);

  return { me, error, phase, result, changed, refreshing, refresh, reveal };
}
