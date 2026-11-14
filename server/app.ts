import express, {
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import {
  randomBytes,
  randomUUID,
  createHash,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import path from "node:path";
import { realpath } from "node:fs/promises";
import QRCode from "qrcode";
import { JsonStore } from "./storage/database.js";
import { draw, DrawError } from "./services/draw.js";
import type { Session, SantaEvent, Database } from "../shared/types.js";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
// Znacznik wersji hasła zapisywany w sesjach admina. Powolny, solony skrót zamiast
// zwykłego SHA-256, żeby z kopii bazy nie dało się szybko odgadnąć hasła.
const passwordVersion = (password: string) =>
  scryptSync(password, "secret-santa/admin-session/v1", 32).toString("hex");
const token = () => randomBytes(32).toString("base64url");
class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface Config {
  password: string;
  baseUrl: string;
  trustProxy?: string;
  development?: boolean;
}
export function createApp(
  store: JsonStore,
  config: Config,
  frontend?: RequestHandler,
) {
  const app = express();
  const base = new URL(config.baseUrl);
  const secure = base.protocol === "https:";
  const adminVersion = passwordVersion(config.password);
  if (config.trustProxy)
    app.set(
      "trust proxy",
      config.trustProxy.split(",").map((s) => s.trim()),
    );
  app.disable("x-powered-by");
  app.use(
    helmet({
      referrerPolicy: { policy: "no-referrer" },
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:", "https:"],
          "upgrade-insecure-requests": secure ? [] : null,
          ...(config.development
            ? {
                "script-src": ["'self'", "'unsafe-inline'"],
                "connect-src": ["'self'", "ws:", "wss:"],
              }
            : {}),
        },
      },
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.use("/api", (req, _res, next) => {
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      if (req.body === undefined) req.body = {};
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
        return next(
          new HttpError(400, "Treść żądania musi być obiektem JSON."),
        );
    }
    next();
  });
  app.use(["/api", "/invite"], (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Elfy potrzebują chwili. Spróbuj za minutę." },
    }),
  );
  const loginLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 12,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Zbyt wiele prób logowania. Spróbuj za 15 minut." },
  });
  const inviteLimit = rateLimit({
    windowMs: 60000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: "Zbyt wiele prób. Spróbuj za minutę.",
  });
  function session(req: Request): Session | undefined {
    const raw = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("santa_session="))
      ?.slice(14);
    if (!raw) return;
    return store
      .snapshot()
      .sessions.find(
        (s) =>
          s.hash === hash(raw) &&
          s.expires > Date.now() &&
          (s.role !== "admin" || s.adminVersion === adminVersion),
      );
  }
  function auth(req: Request, role?: Session["role"]) {
    const s = session(req);
    if (!s || (role && s.role !== role))
      throw new HttpError(401, "Zaloguj się, aby kontynuować.");
    return s;
  }
  app.use("/api", (req, _res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("origin") !== base.origin)
        return next(new HttpError(403, "Nieprawidłowe źródło żądania."));
      if (req.path !== "/admin/login") {
        const s = session(req);
        if (!s || req.get("x-csrf-token") !== s.csrf)
          return next(
            new HttpError(
              403,
              "Sesja wygasła. Odśwież stronę i zaloguj się ponownie.",
            ),
          );
      }
    }
    next();
  });
  async function createSession(
    res: Response,
    details: Partial<Session> & { role: Session["role"] },
  ) {
    const raw = token();
    const s: Session = {
      ...details,
      hash: hash(raw),
      csrf: token(),
      expires:
        Date.now() + (details.role === "admin" ? 12 * 3600000 : 30 * 86400000),
    };
    await store.update((db) => {
      db.sessions = db.sessions.filter((x) => x.expires > Date.now());
      db.sessions.push(s);
    });
    res.cookie("santa_session", raw, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: s.expires - Date.now(),
    });
    return s;
  }
  const event = (db: Database, id: string) => {
    const e = db.events.find((e) => e.id === id);
    if (!e) throw new HttpError(404, "Nie znaleziono wydarzenia.");
    return e;
  };
  const editable = (e: SantaEvent) => {
    if (e.status !== "draft")
      throw new HttpError(
        409,
        "Losowanie już się odbyło. Lista i wykluczenia są zablokowane.",
      );
  };
  const name = (value: unknown) => {
    if (typeof value !== "string" || !value.trim() || value.trim().length > 100)
      throw new HttpError(400, "Podaj nazwę o długości od 1 do 100 znaków.");
    return value.trim();
  };
  function photo(value: unknown) {
    if (!value) return undefined;
    if (
      typeof value !== "string" ||
      !/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(jpg|jpeg|png|webp)$/i.test(value) ||
      value.length > 150 ||
      value.includes("..")
    )
      throw new HttpError(
        400,
        "Podaj samą nazwę pliku JPG, PNG lub WebP (bez ścieżki).",
      );
    return value;
  }
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.post("/api/admin/login", loginLimit, async (req, res) => {
    if (
      typeof req.body.password !== "string" ||
      !timingSafeEqual(
        Buffer.from(passwordVersion(req.body.password)),
        Buffer.from(adminVersion),
      )
    )
      throw new HttpError(401, "Nieprawidłowe hasło. Mikołaj patrzy!");
    const s = await createSession(res, { role: "admin", adminVersion });
    res.json({ csrf: s.csrf });
  });
  app.get("/api/session", (req, res) => {
    const s = session(req);
    res.json(s ? { role: s.role, csrf: s.csrf } : { role: null });
  });
  app.post("/api/logout", async (req, res) => {
    const s = auth(req);
    await store.update((db) => {
      db.sessions = db.sessions.filter((x) => x.hash !== s.hash);
    });
    res.clearCookie("santa_session", {
      path: "/",
      secure,
      httpOnly: true,
      sameSite: "lax",
    });
    res.json({ ok: true });
  });
  app.get("/invite/:token", inviteLimit, async (req, res) => {
    const digest = hash(String(req.params.token));
    const db = store.snapshot();
    const e = db.events.find((e) =>
      e.participants.some((p) => p.tokenHash === digest),
    );
    const p = e?.participants.find((p) => p.tokenHash === digest);
    if (!e || !p) return res.redirect("/?invite=invalid");
    // Verify and create the session in the same queue as revocation.
    const raw = token();
    const s: Session = {
      hash: hash(raw),
      role: "participant",
      eventId: e.id,
      participantId: p.id,
      csrf: token(),
      expires: Date.now() + 30 * 86400000,
    };
    try {
      await store.update((db) => {
        if (
          !event(db, e.id).participants.some((p) => p.tokenHash === digest)
        )
          throw new HttpError(401, "Ten kod został unieważniony.");
        db.sessions = db.sessions.filter((x) => x.expires > Date.now());
        db.sessions.push(s);
      });
    } catch (error) {
      if (error instanceof HttpError && error.status === 401)
        return res.redirect("/?invite=invalid");
      throw error;
    }
    res.cookie("santa_session", raw, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 86400000,
    });
    res.redirect("/");
  });
  app.get("/api/admin/events", (req, res) => {
    auth(req, "admin");
    res.json(
      store
        .snapshot()
        .events.map(({ assignments, previousAssignments, ...e }) => ({
          ...e,
          hasPreviousDraw: !!previousAssignments || !!e.previousEventId,
          participants: e.participants.map(({ tokenHash, ...p }) => ({
            ...p,
            hasToken: !!tokenHash,
          })),
        })),
    );
  });
  app.post("/api/admin/events", async (req, res) => {
    auth(req, "admin");
    const e: SantaEvent = {
      id: randomUUID(),
      name: name(req.body.name),
      createdAt: new Date().toISOString(),
      status: "draft",
      participants: [],
      exclusions: [],
      noMutual: true,
      assignments: {},
    };
    await store.update((db) => {
      if (req.body.copyFrom) {
        const old = event(db, name(req.body.copyFrom));
        if (old.status !== "drawn")
          throw new HttpError(400, "Kopiuj zakończone wydarzenie.");
        e.participants = old.participants.map(({ id, name, photo }) => ({
          id,
          name,
          photo,
        }));
        e.exclusions = structuredClone(old.exclusions);
        e.previousEventId = old.id;
        e.previousAssignments = structuredClone(old.assignments);
      }
      db.events.push(e);
    });
    res.status(201).json({ id: e.id });
  });
  app.delete("/api/admin/events/:id", async (req, res) => {
    auth(req, "admin");
    if (req.body?.confirmDelete !== true)
      throw new HttpError(400, "Potwierdź trwałe usunięcie wydarzenia.");
    await store.update((db) => {
      const removed = event(db, String(req.params.id));
      // Keep the rule snapshots of later editions, without retaining a dangling event ID.
      for (const next of db.events)
        if (next.previousEventId === removed.id) {
          next.previousAssignments ??= structuredClone(removed.assignments);
          delete next.previousEventId;
        }
      db.events = db.events.filter((e) => e.id !== removed.id);
      db.sessions = db.sessions.filter((s) => s.eventId !== removed.id);
      db.history = db.history.filter((h) => h.eventId !== removed.id);
    });
    res.json({ ok: true });
  });
  app.post("/api/admin/events/:id/participants", async (req, res) => {
    auth(req, "admin");
    await store.update((db) => {
      const e = event(db, String(req.params.id));
      editable(e);
      if (e.participants.length >= 60)
        throw new HttpError(400, "Maksymalnie 60 uczestników.");
      e.participants.push({
        id: randomUUID(),
        name: name(req.body.name),
        photo: photo(req.body.photo),
      });
    });
    res.json({ ok: true });
  });
  app.patch("/api/admin/events/:id/participants/:pid", async (req, res) => {
    auth(req, "admin");
    await store.update((db) => {
      const e = event(db, String(req.params.id));
      const p = e.participants.find((p) => p.id === req.params.pid);
      if (!p) throw new HttpError(404, "Nie znaleziono uczestnika.");
      p.name = name(req.body.name);
      p.photo = photo(req.body.photo);
    });
    res.json({ ok: true });
  });
  app.delete("/api/admin/events/:id/participants/:pid", async (req, res) => {
    auth(req, "admin");
    await store.update((db) => {
      const e = event(db, String(req.params.id));
      editable(e);
      e.participants = e.participants.filter((p) => p.id !== req.params.pid);
      e.exclusions = e.exclusions.filter(
        (pair) => !pair.includes(String(req.params.pid)),
      );
      db.sessions = db.sessions.filter(
        (s) => s.eventId !== e.id || s.participantId !== req.params.pid,
      );
    });
    res.json({ ok: true });
  });
  app.put("/api/admin/events/:id/rules", async (req, res) => {
    auth(req, "admin");
    await store.update((db) => {
      const e = event(db, String(req.params.id));
      editable(e);
      const pairs = req.body.exclusions;
      if (
        !Array.isArray(pairs) ||
        pairs.length > 3600 ||
        pairs.some(
          (p) =>
            !Array.isArray(p) ||
            p.length !== 2 ||
            p[0] === p[1] ||
            p.some((id: unknown) => !e.participants.some((x) => x.id === id)),
        )
      )
        throw new HttpError(400, "Nieprawidłowe wykluczenia.");
      if (typeof req.body.noMutual !== "boolean")
        throw new HttpError(400, "Nieprawidłowa reguła par.");
      e.exclusions = pairs;
      e.noMutual = req.body.noMutual;
    });
    res.json({ ok: true });
  });
  app.post("/api/admin/events/:id/draw", async (req, res) => {
    auth(req, "admin");
    await store.update((db) => {
      const e = event(db, String(req.params.id));
      editable(e);
      const previous = e.previousEventId
        ? event(db, e.previousEventId)
        : undefined;
      const blocked: [string, string][] = [
        ...e.exclusions,
        ...Object.entries(e.previousAssignments ?? previous?.assignments ?? {}),
      ];
      const assignments = draw(
        e.participants.map((p) => p.id),
        blocked,
        e.noMutual,
      );
      e.assignments = assignments;
      e.status = "drawn";
      e.drawnAt = new Date().toISOString();
      e.drawRevision = 1;
      db.history.push({
        eventId: e.id,
        drawnAt: e.drawnAt,
        assignments: structuredClone(assignments),
      });
    });
    res.json({ ok: true });
  });
  app.post("/api/admin/events/:id/redraw", async (req, res) => {
    auth(req, "admin");
    await store.update((db) => {
      const e = event(db, String(req.params.id));
      if (e.status !== "drawn")
        throw new HttpError(409, "Najpierw wykonaj pierwsze losowanie.");
      const revision = e.drawRevision ?? 1;
      if (
        req.body.confirmRedraw !== true ||
        req.body.expectedRevision !== revision
      )
        throw new HttpError(
          409,
          "Wyniki zmieniły się lub brakuje potwierdzenia. Odśwież wydarzenie przed ponownym losowaniem.",
        );
      const previous =
        e.previousAssignments ??
        (e.previousEventId ? event(db, e.previousEventId).assignments : {});
      const assignments = draw(
        e.participants.map((p) => p.id),
        [...e.exclusions, ...Object.entries(previous)],
        e.noMutual,
        e.assignments,
      );
      e.assignments = assignments;
      e.drawRevision = revision + 1;
      e.drawnAt = new Date().toISOString();
      db.history.push({
        eventId: e.id,
        drawnAt: e.drawnAt,
        assignments: structuredClone(assignments),
      });
    });
    res.json({ ok: true });
  });
  app.post("/api/admin/events/:id/codes", async (req, res) => {
    auth(req, "admin");
    const codes = await store.update(async (db) => {
      const e = event(db, String(req.params.id));
      const ids = req.body.ids;
      if (
        !Array.isArray(ids) ||
        !ids.length ||
        new Set(ids).size !== ids.length ||
        ids.some((id) => !e.participants.some((p) => p.id === id))
      )
        throw new HttpError(400, "Wybierz uczestników.");
      const codes = [];
      for (const id of ids) {
        const p = e.participants.find((p) => p.id === id)!;
        const raw = token();
        const url = `${base.origin}/invite/${raw}`;
        const qr = await QRCode.toDataURL(url, {
          width: 480,
          margin: 3,
          errorCorrectionLevel: "M",
        });
        p.tokenHash = hash(raw);
        db.sessions = db.sessions.filter(
          (s) => s.eventId !== e.id || s.participantId !== id,
        );
        codes.push({ participantId: id, name: p.name, url, qr });
      }
      return codes;
    });
    res.json(codes);
  });
  app.delete("/api/admin/events/:id/codes/:pid", async (req, res) => {
    auth(req, "admin");
    await store.update((db) => {
      const e = event(db, String(req.params.id));
      const p = e.participants.find((p) => p.id === req.params.pid);
      if (!p) throw new HttpError(404, "Nie znaleziono uczestnika.");
      delete p.tokenHash;
      db.sessions = db.sessions.filter(
        (s) => s.eventId !== e.id || s.participantId !== p.id,
      );
    });
    res.json({ ok: true });
  });
  function own(req: Request) {
    const s = auth(req, "participant");
    const e = event(store.snapshot(), s.eventId!);
    const p = e.participants.find((p) => p.id === s.participantId);
    if (!p) throw new HttpError(401, "Uczestnik nie jest już dostępny.");
    return { s, e, p };
  }
  app.get("/api/me", (req, res) => {
    const { e, p } = own(req);
    res.json({
      name: p.name,
      eventName: e.name,
      ready: e.status === "drawn",
      drawRevision: e.status === "drawn" ? (e.drawRevision ?? 1) : 0,
    });
  });
  app.get("/api/me/result", (req, res) => {
    const { e, p } = own(req);
    if (e.status !== "drawn")
      throw new HttpError(409, "Elfy jeszcze nie losowały. Wróć za chwilę!");
    const recipient = e.participants.find((x) => x.id === e.assignments[p.id])!;
    res.json({
      name: recipient.name,
      hasPhoto: !!recipient.photo,
      drawRevision: e.drawRevision ?? 1,
    });
  });
  app.get("/api/me/photo", async (req, res) => {
    const { e, p } = own(req);
    if (e.status !== "drawn") throw new HttpError(404, "Zdjęcie niedostępne.");
    if (
      req.query.revision !== undefined &&
      String(req.query.revision) !== String(e.drawRevision ?? 1)
    )
      throw new HttpError(
        409,
        "Wynik został ponownie wylosowany. Odkryj nowy prezent.",
      );
    const recipient = e.participants.find((x) => x.id === e.assignments[p.id]);
    if (!recipient?.photo) throw new HttpError(404, "Zdjęcie niedostępne.");
    const filename = photo(recipient.photo)!;
    const root = await realpath(path.join(store.directory, "photos"));
    const target = await realpath(path.join(root, filename)).catch(() => {
      throw new HttpError(404, "Zdjęcie niedostępne.");
    });
    if (path.dirname(target) !== root)
      throw new HttpError(403, "Zdjęcie niedostępne.");
    res.sendFile(target);
  });
  app.use("/api", () => {
    throw new HttpError(404, "Nie znaleziono endpointu.");
  });
  if (frontend) app.use(frontend);
  else {
    app.use(
      express.static(path.resolve("dist/client"), {
        index: false,
        dotfiles: "deny",
      }),
    );
    app.get(["/", "/admin"], (_req, res) =>
      res.sendFile(path.resolve("dist/client/index.html")),
    );
  }
  app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    const status =
      error instanceof HttpError
        ? error.status
        : error instanceof DrawError
          ? 422
          : (error as { status?: number }).status === 400
            ? 400
            : 500;
    if (status === 500)
      console.error(
        "Operacja nie powiodła się:",
        (error as NodeJS.ErrnoException).code ?? error.name,
      );
    res.status(status).json({
      error:
        status === 500
          ? "Nie udało się zapisać lub odczytać danych. Spróbuj ponownie; operacja nie została potwierdzona."
          : error.message,
    });
  });
  return app;
}
