"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

type Card = { ok: boolean; zrodlo: string; pobrano?: string; blad?: string } & Record<string, unknown>;

type DashboardData = {
  miejsce: { nazwa: string; kraj: string };
  karty: { pogoda: Card; waluty: Card; swieta: Card; wikipedia: Card; czas: Card };
  podsumowanie: string | null;
};

function inDays(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(date);
}

function formatTime(iso: string | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw" });
}

function SourceCard({ title, card, children }: { title: string; card: Card; children: ReactNode }) {
  return (
    <article className="card">
      <header>
        <h2>{title}</h2>
        <span className={`badge ${card.ok ? "badge-ok" : "badge-error"}`}>{card.ok ? "OK" : "Brak danych"}</span>
      </header>
      {card.ok ? children : <p className="error">{card.blad} Spróbuj odświeżyć.</p>}
      <footer>
        źródło: {card.zrodlo}
        {card.pobrano ? ` · pobrano: ${formatTime(card.pobrano)}` : ""}
      </footer>
    </article>
  );
}

export default function Dashboard() {
  const [city, setCity] = useState("");
  const [date, setDate] = useState(inDays(7));
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function load() {
    if (!city.trim() || isBusy) return;
    setIsBusy(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ miasto: city.trim(), data: date }),
      });
      const json = await response.json().catch(() => null);
      if (response.ok && json?.karty) {
        setData(json);
      } else {
        setData(null);
        setError(json?.error ?? "Nie udało się pobrać danych.");
      }
    } catch {
      setError("Brak połączenia z serwerem.");
    }

    setIsBusy(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    load();
  }

  const cards = data?.karty;

  return (
    <main className="chat dashboard">
      <header className="chat-header">
        <div className="brand">
          <h1>Asystent podróży</h1>
          <p>Pogoda, waluta, święta, Wikipedia i czas dla miejsca docelowego.</p>
        </div>
        <nav className="header-actions">
          <Link className="button-ghost" href="/">
            Czat
          </Link>
        </nav>
      </header>

      <form className="trip-form" onSubmit={handleSubmit}>
        <label>
          Dokąd jedziesz?
          <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="np. Lizbona" />
        </label>
        <label>
          Kiedy?
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <button type="submit" className="button-primary" disabled={isBusy || !city.trim()}>
          {isBusy ? "Ładuję…" : "Sprawdź"}
        </button>
        {data && (
          <button type="button" className="button-ghost" onClick={load} disabled={isBusy}>
            Odśwież
          </button>
        )}
      </form>

      {error && <p className="error">{error}</p>}

      {data && cards && (
        <>
          <h2 className="trip-title">
            {data.miejsce.nazwa}, {data.miejsce.kraj} · {date}
          </h2>
          <section className="cards">
            <SourceCard title="🌤️ Pogoda" card={cards.pogoda}>
              <p className="value">
                {String(cards.pogoda.temperaturaMinC)}–{String(cards.pogoda.temperaturaMaxC)} °C
              </p>
              <p>
                {String(cards.pogoda.pogoda)}, szansa opadów {String(cards.pogoda.szansaOpadowProcent)}%
              </p>
            </SourceCard>

            <SourceCard title="💶 Waluta" card={cards.waluty}>
              <p className="value">
                1 {String(cards.waluty.waluta)} = {String(cards.waluty.kursPLN)} zł
              </p>
              <p>kurs z dnia {String(cards.waluty.dataKursu)}</p>
            </SourceCard>

            <SourceCard title="📅 Święta" card={cards.swieta}>
              {Array.isArray(cards.swieta.swieta) && cards.swieta.swieta.length > 0 ? (
                <ul>
                  {(cards.swieta.swieta as { data: string; nazwa: string }[]).map((holiday) => (
                    <li key={holiday.data}>
                      {holiday.data}: {holiday.nazwa}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Brak świąt w najbliższym czasie.</p>
              )}
            </SourceCard>

            <SourceCard title="📚 Wikipedia" card={cards.wikipedia}>
              <p>{String(cards.wikipedia.streszczenie)}</p>
              {typeof cards.wikipedia.link === "string" && (
                <a href={cards.wikipedia.link} target="_blank" rel="noreferrer">
                  Czytaj w Wikipedii
                </a>
              )}
            </SourceCard>

            <SourceCard title="🕒 Czas" card={cards.czas}>
              <p className="value">{String(cards.czas.czasNaMiejscu)}</p>
              <p>
                różnica względem Polski: {Number(cards.czas.roznicaGodzinWzgledemPolski) > 0 ? "+" : ""}
                {String(cards.czas.roznicaGodzinWzgledemPolski)} h
              </p>
            </SourceCard>
          </section>

          <section className="summary">
            <h2>Podsumowanie agenta</h2>
            <p>{data.podsumowanie ?? "Nie udało się przygotować podsumowania."}</p>
          </section>
        </>
      )}
    </main>
  );
}
