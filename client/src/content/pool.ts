import { safeUrl } from "../lib/safeUrl";

export type CountdownKind = "far" | "month" | "week" | "eve" | "after";

export interface ContentPool {
  kickers: string[];
  greetings: string[];
  jokes: string[];
  tips: string[];
  revealQuips: string[];
  openingMessages: string[];
  waitingMessages: string[];
  readyMessages: string[];
  giftClicks: string[];
  santaQuips: string[];
  countdown: Record<CountdownKind, string[]>;
  decor: string[];
}

/** Wersja awaryjna, gdy content-pool.json jest niedostępny lub uszkodzony. */
const defaults: ContentPool = {
  kickers: ["Rodzinne losowanie prezentów"],
  greetings: ["Ho, ho, ho, {name}!"],
  jokes: ["Mikołaj już wie, komu kupujesz prezent. A Ty?"],
  tips: ["Dobrze zapakowany prezent jest o 30% lepszy. Elfy to zbadały."],
  revealQuips: ["Powodzenia, Mikołaju. Liczymy na Twoją kreatywność!"],
  openingMessages: ["Elfy otwierają kopertę… trzymaj kciuki!"],
  waitingMessages: [
    "Twoja niespodzianka jeszcze dojrzewa. Organizator da znać, gdy losowanie będzie gotowe.",
  ],
  readyMessages: ["Jedno kliknięcie. Jedna osoba. Wielka tajemnica."],
  giftClicks: ["Mikołaj patrzy. Zabierz łapki od cudzego prezentu."],
  santaQuips: ["Ho, ho, ho!"],
  countdown: {
    far: ["Jest jeszcze mnóstwo czasu."],
    month: ["Czas na plan."],
    week: ["To już prawie!"],
    eve: ["To już dziś!"],
    after: ["Święta za nami."],
  },
  decor: ["/assets/jokes/cat.svg", "/assets/jokes/reindeer.svg"],
};

const MAX_TEXT = 400;
const MAX_ITEMS = 500;

function strings(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const list = value
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0 && x.length <= MAX_TEXT)
    .slice(0, MAX_ITEMS);
  return list.length ? list : fallback;
}

function images(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const list = value.filter(safeUrl).slice(0, MAX_ITEMS);
  return list.length ? list : fallback;
}

/** Każda lista jest walidowana osobno: błąd w jednej nie psuje pozostałych. */
export function parsePool(data: unknown): ContentPool {
  if (!data || typeof data !== "object") return defaults;
  const raw = data as Record<string, unknown>;
  const countdown = (raw.countdown ?? {}) as Record<string, unknown>;
  return {
    kickers: strings(raw.kickers, defaults.kickers),
    greetings: strings(raw.greetings, defaults.greetings),
    jokes: strings(raw.jokes, defaults.jokes),
    tips: strings(raw.tips, defaults.tips),
    revealQuips: strings(raw.revealQuips, defaults.revealQuips),
    openingMessages: strings(raw.openingMessages, defaults.openingMessages),
    waitingMessages: strings(raw.waitingMessages, defaults.waitingMessages),
    readyMessages: strings(raw.readyMessages, defaults.readyMessages),
    giftClicks: strings(raw.giftClicks, defaults.giftClicks),
    santaQuips: strings(raw.santaQuips, defaults.santaQuips),
    countdown: {
      far: strings(countdown.far, defaults.countdown.far),
      month: strings(countdown.month, defaults.countdown.month),
      week: strings(countdown.week, defaults.countdown.week),
      eve: strings(countdown.eve, defaults.countdown.eve),
      after: strings(countdown.after, defaults.countdown.after),
    },
    decor: images(raw.decor, defaults.decor),
  };
}

let cached: Promise<ContentPool> | undefined;

/** Pula jest pobierana raz na załadowanie strony i współdzielona przez wszystkie komponenty. */
export function loadContentPool(): Promise<ContentPool> {
  cached ??= fetch("/content-pool.json")
    .then((r) => {
      if (!r.ok) throw Error();
      return r.json();
    })
    .then(parsePool)
    .catch(() => defaults);
  return cached;
}
