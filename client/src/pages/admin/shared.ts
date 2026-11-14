import type { FormEvent } from "react";

/** Uruchamia akcję administratora z blokadą wielokrotnych kliknięć i komunikatem o wyniku. */
export type Runner = (action: () => Promise<void>) => Promise<void>;

/** Obsługa formularza: blokuje przeładowanie strony i uruchamia akcję przez Runner. */
export const submitWith =
  (run: Runner) => (e: FormEvent, action: () => Promise<void>) => {
    e.preventDefault();
    void run(action);
  };
