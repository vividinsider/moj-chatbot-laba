"use client";

import { useState, type FormEvent } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        window.location.reload();
        return;
      }

      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Nie udało się zalogować.");
    } catch {
      setError("Brak połączenia z serwerem.");
    }

    setIsBusy(false);
  }

  return (
    <main className="login">
      <h1>Wpisz hasło</h1>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-label="Hasło"
          autoFocus
        />
        <button type="submit" disabled={isBusy || !password}>
          Wejdź
        </button>
      </form>

      {error && <p className="error">{error}</p>}
    </main>
  );
}