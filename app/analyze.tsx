"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Analysis } from "@/lib/analysis";

export default function Analyze() {
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || isBusy) return;

    setIsBusy(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "analyze", message: text }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data?.analysis) {
        setAnalysis(data.analysis);
      } else {
        setError(data?.error ?? "Analiza się nie udała.");
      }
    } catch {
      setError("Brak połączenia z serwerem.");
    }

    setIsBusy(false);
  }

  return (
    <main className="chat">
      <header className="chat-header">
        <h1>Analiza wiadomości</h1>
        <Link className="logout" href="/">
          Czat
        </Link>
      </header>

      <form className="analyze-form" onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Wklej wiadomość klienta…"
          aria-label="Wiadomość klienta"
          rows={6}
        />
        <button type="submit" disabled={isBusy || !message.trim()}>
          {isBusy ? "Analizuję…" : "Analizuj"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {analysis && (
        <section className="analysis" aria-label="Wynik analizy">
          <dl>
            <dt>Kategoria</dt>
            <dd>{analysis.category}</dd>
            <dt>Priorytet</dt>
            <dd>{analysis.priority}</dd>
            <dt>Wymaga sprawdzenia</dt>
            <dd>{analysis.needs_review ? "tak" : "nie"}</dd>
            <dt>Szkic</dt>
            <dd className="draft">{analysis.draft}</dd>
          </dl>
          <p className="status">To tylko szkic. Aplikacja niczego nie wysyła.</p>
        </section>
      )}
    </main>
  );
}