"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState, type FormEvent } from "react";

type Mode = "login" | "signup";

function polishError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) return "Nieprawidłowy e-mail albo hasło.";
  if (text.includes("already registered") || text.includes("already exists")) {
    return "Konto z tym adresem już istnieje. Zaloguj się.";
  }
  if (text.includes("password") && text.includes("at least")) return "Hasło musi mieć co najmniej 8 znaków.";
  if (text.includes("email") && text.includes("invalid")) return "Nieprawidłowy adres e-mail.";
  if (text.includes("rate limit")) return "Za dużo prób. Spróbuj ponownie za chwilę.";
  return "Nie udało się. Spróbuj ponownie.";
}

export default function LoginForm({
  supabaseUrl,
  supabaseKey,
  next,
  initialError,
}: {
  supabaseUrl: string;
  supabaseKey: string;
  next: string;
  initialError: string;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [isBusy, setIsBusy] = useState(false);
  const supabase = createBrowserClient(supabaseUrl, supabaseKey);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    setError("");
    if (password.length < 8) return setError("Hasło musi mieć co najmniej 8 znaków.");

    setIsBusy(true);
    const { data, error: authError } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });

    if (authError) {
      setError(polishError(authError.message));
      setIsBusy(false);
      return;
    }
    if (mode === "signup" && !data.session) {
      setError("Konto założone, ale wymaga potwierdzenia e-mailem. Wyłącz „Confirm email” w Supabase.");
      setIsBusy(false);
      return;
    }
    // Pełne przeładowanie: serwer od razu widzi nową sesję.
    window.location.assign(next);
  }

  async function handleGoogle() {
    if (isBusy) return;
    setIsBusy(true);
    setError("");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (authError) {
      setError("Nie udało się rozpocząć logowania przez Google.");
      setIsBusy(false);
    }
  }

  return (
    <main className="login">
      <h1>Studio Nova</h1>

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={mode === "login" ? "tab active" : "tab"}
          onClick={() => setMode("login")}
        >
          Zaloguj się
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={mode === "signup" ? "tab active" : "tab"}
          onClick={() => setMode("signup")}
        >
          Załóż konto
        </button>
      </div>

      <form className="analyze-form" onSubmit={handleSubmit}>
        <input
          className="text-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="E-mail"
          aria-label="E-mail"
          autoComplete="email"
          required
        />
        <input
          className="text-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Hasło (min. 8 znaków)"
          aria-label="Hasło"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
        <button type="submit" disabled={isBusy}>
          {isBusy ? "Chwileczkę…" : mode === "login" ? "Zaloguj się" : "Załóż konto"}
        </button>
      </form>

      <button type="button" className="button-ghost google" onClick={handleGoogle} disabled={isBusy}>
        Zaloguj przez Google
      </button>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
