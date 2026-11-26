"use client";

import { useState, type FormEvent } from "react";
import type { TriageCard } from "@/lib/triage";
import CopyButton from "../copy-button";

type Response = {
  cards: TriageCard[];
  summary: { wysoki: number; średni: number; niski: number };
  wykonano: string;
};

const PRIORITY_CLASS = { wysoki: "badge-error", średni: "badge-warn", niski: "badge-ok" } as const;

export default function TriageForm() {
  const [text, setText] = useState("");
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || isBusy) return;
    setIsBusy(true);
    setError("");
    setData(null);
    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await response.json().catch(() => null);
      if (response.ok && json?.cards) setData(json);
      else setError(json?.error ?? "Triage się nie udał. Spróbuj ponownie.");
    } catch {
      setError("Brak połączenia z serwerem.");
    }
    setIsBusy(false);
  }

  return (
    <>
      <form className="analyze-form" onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={"Wklej maile. Oddziel je linią z samymi trzema myślnikami:\n---"}
          aria-label="Maile do posortowania"
          rows={12}
        />
        <button type="submit" disabled={isBusy || !text.trim()}>
          {isBusy ? "Agent sortuje…" : "Posortuj"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {data && (
        <section className="mission-result" aria-label="Wynik triage">
          <p className="summary-line">
            Priorytet wysoki: <strong>{data.summary.wysoki}</strong> · średni:{" "}
            <strong>{data.summary.średni}</strong> · niski: <strong>{data.summary.niski}</strong>
          </p>
          <div className="triage-cards">
            {data.cards.map((card) =>
              card.ok ? (
                <article key={card.index} className="card">
                  <header>
                    <h2>
                      {card.index + 1}. {card.wynik.nadawca}
                    </h2>
                    <span className={`badge ${PRIORITY_CLASS[card.wynik.priorytet]}`}>{card.wynik.priorytet}</span>
                  </header>
                  <p>
                    <strong>Temat:</strong> {card.wynik.temat || "(bez tematu)"}
                  </p>
                  <p>
                    <strong>Kategoria:</strong> {card.wynik.kategoria}
                  </p>
                  <p className="muted">{card.wynik.uzasadnienie}</p>
                  <blockquote className="draft">{card.wynik.szkic}</blockquote>
                  {card.wynik.zrodlo && <p className="muted">📎 Źródło: {card.wynik.zrodlo}</p>}
                  <footer>
                    <CopyButton text={card.wynik.szkic} label="Kopiuj szkic" />
                  </footer>
                </article>
              ) : (
                <article key={card.index} className="card">
                  <header>
                    <h2>{card.index + 1}. Mail nieprzetworzony</h2>
                    <span className="badge badge-error">błąd</span>
                  </header>
                  <p className="muted">{card.podglad}</p>
                  <p className="error">{card.blad}</p>
                </article>
              ),
            )}
          </div>
          <p className="status">
            Wykonano: {new Date(data.wykonano).toLocaleString("pl-PL")}. To tylko szkice — aplikacja niczego nie
            wysyła.
          </p>
        </section>
      )}
    </>
  );
}
