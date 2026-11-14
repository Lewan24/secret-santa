import { useState } from "react";
import { api, setCsrf } from "../../api/client";
import { submitWith, type Runner } from "./shared";

export function AdminLogin({
  run,
  busy,
  error,
  onLogin,
}: {
  run: Runner;
  busy: boolean;
  error: string;
  onLogin: () => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const submit = submitWith(run);
  return (
  <main className="login">
    <img
      className="login-santa"
      src="/assets/jokes/santa.svg"
      alt="Mikołaj pilnujący pracowni"
    />
    <p className="greeting">Tylko dla wtajemniczonych</p>
    <h1>Pracownia elfów</h1>
    <p>Ty ogarniasz rodzinę. My ogarniemy losowanie.</p>
    <form
      onSubmit={(e) =>
        submit(e, async () => {
          const data = await api<{ csrf: string }>("/admin/login", "POST", {
            password,
          });
          setCsrf(data.csrf);
          setPassword("");
          await onLogin();
        })
      }
    >
      <label>
        Hasło organizatora
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button disabled={busy}>
        {busy ? "Sprawdzamy listę…" : "Otwórz pracownię"}{" "}
        <span aria-hidden="true">✧</span>
      </button>
    </form>
    {error && (
      <p className="error" role="alert">
        {error}
      </p>
    )}
    <a className="organizer-link" href="/">
      Wróć do świątecznej niespodzianki
    </a>
  </main>
  );
}
