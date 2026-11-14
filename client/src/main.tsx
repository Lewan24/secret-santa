import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, setCsrf } from "./api/client";
import { Backdrop } from "./components/Backdrop";
import { Scene } from "./components/Scene";
import { Welcome } from "./pages/Welcome";
import { Participant } from "./pages/Participant";
import { Admin } from "./pages/Admin";
import "./styles/app.css";
import "./styles/festive.css";
function App() {
  const [role, setRole] = useState<string | null>();
  const [quiet, setQuiet] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    try {
      const s = await api<{ role: string | null; csrf?: string }>("/session");
      setCsrf(s.csrf || "");
      setRole(s.role);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const admin = location.pathname === "/admin";
  async function logout() {
    try {
      await api("/logout", "POST");
      setCsrf("");
      setRole(null);
      location.assign("/");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className={quiet ? "app quiet" : "app"}>
      <Scene quiet={quiet} />
      <Backdrop quiet={quiet} santa={!admin && role !== "participant"} />
      <header>
        <a className="brand" href="/" aria-label="Secret Santa — strona główna">
          <img src="/assets/gift.svg" width="35" height="35" alt="" />
          <span>
            Secret Santa<small>od serca, w sekrecie</small>
          </span>
        </a>
        <div className="header-actions">
          <button
            className="motion-toggle"
            aria-pressed={quiet}
            onClick={() => setQuiet((q) => !q)}
          >
            {quiet ? "✧ Włącz animacje" : "❄ Spokojny tryb"}
          </button>
          {role && (
            <button className="text-button" onClick={logout}>
              Wyloguj
            </button>
          )}
          {role === "admin" && !admin && <a href="/admin">Pracownia elfów</a>}
        </div>
      </header>
      {error ? (
        <main className="center">
          <p className="error" role="alert">
            {error}
          </p>
          <button onClick={load}>Spróbuj ponownie</button>
        </main>
      ) : role === undefined ? (
        <main className="center">
          <p role="status">Elfy zapalają lampki…</p>
        </main>
      ) : admin ? (
        <Admin logged={role === "admin"} onLogin={load} />
      ) : role === "participant" ? (
        <Participant quiet={quiet} />
      ) : (
        <Welcome />
      )}
      <footer>
        <span>Stworzone z odrobiną magii i dużą ilością pierników.</span>
        <span aria-hidden="true">✦</span>
        <span>Nie zdradzaj. Zaskakuj.</span>
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
