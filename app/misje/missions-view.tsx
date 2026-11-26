"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MISSIONS, resultToText, type MissionId, type MissionResult } from "@/lib/mission-catalog";
import CopyButton from "../copy-button";
import MissionResultView from "./mission-result";

type Run = { id: number; createdAt: string; preview: string };
type Shown = { wynik: MissionResult; wykonano: string; zapisany: boolean; zapis?: string };

const formatDate = (iso: string) => new Date(iso).toLocaleString("pl-PL");

export default function MissionsView() {
  const [missionId, setMissionId] = useState<MissionId>(MISSIONS[0].id);
  const mission = MISSIONS.find((item) => item.id === missionId) ?? MISSIONS[0];
  const [values, setValues] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<Shown | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [runsError, setRunsError] = useState("");

  const loadRuns = useCallback(async (id: MissionId) => {
    try {
      const response = await fetch(`/api/missions/runs?mission=${id}`);
      const json = await response.json().catch(() => null);
      setRuns(json?.runs ?? []);
      setRunsError(json?.error ?? "");
    } catch {
      setRuns([]);
      setRunsError("Historia misji jest niedostępna.");
    }
  }, []);

  useEffect(() => {
    loadRuns(missionId);
  }, [missionId, loadRuns]);

  function choose(id: MissionId) {
    if (isBusy) return;
    setMissionId(id);
    setValues({});
    setShown(null);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    setIsBusy(true);
    setError("");
    setShown(null);
    try {
      const response = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mission: mission.id, input: values }),
      });
      const json = await response.json().catch(() => null);
      if (response.ok && json?.wynik) {
        setShown({ wynik: json.wynik, wykonano: json.wykonano, zapisany: false, zapis: json.zapis });
        loadRuns(mission.id);
      } else {
        setError(json?.error ?? "Misja się nie udała. Spróbuj ponownie.");
      }
    } catch {
      setError("Brak połączenia z serwerem.");
    }
    setIsBusy(false);
  }

  async function openRun(id: number) {
    setError("");
    try {
      const response = await fetch(`/api/missions/runs?id=${id}`);
      const json = await response.json().catch(() => null);
      if (response.ok && json?.run) {
        setValues(json.run.input ?? {});
        setShown({ wynik: json.run.wynik, wykonano: json.run.createdAt, zapisany: true });
      } else {
        setError(json?.error ?? "Nie udało się otworzyć zapisanego wyniku.");
      }
    } catch {
      setError("Brak połączenia z serwerem.");
    }
  }

  const requiredMissing = mission.pola.some((field) => field.required && !values[field.name]?.trim());

  return (
    <>
      <div className="mission-list" role="tablist" aria-label="Lista misji">
        {MISSIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === mission.id}
            className={`mission-tile${item.id === mission.id ? " active" : ""}`}
            onClick={() => choose(item.id)}
          >
            <strong>{item.nazwa}</strong>
            <span>{item.opis}</span>
          </button>
        ))}
      </div>

      <section className="analysis mission-panel">
        <h2>{mission.nazwa}</h2>
        <p className="muted">{mission.opis}</p>
        <details className="contract">
          <summary>Kontrakt misji</summary>
          <dl>
            <dt>Cel</dt>
            <dd>{mission.kontrakt.cel}</dd>
            <dt>Wejście</dt>
            <dd>{mission.kontrakt.wejscie}</dd>
            <dt>Narzędzia</dt>
            <dd>{mission.kontrakt.narzedzia}</dd>
            <dt>Wynik</dt>
            <dd>{mission.kontrakt.wynik}</dd>
            <dt>Kontrola</dt>
            <dd>{mission.kontrakt.kontrola}</dd>
          </dl>
        </details>

        <form className="analyze-form" onSubmit={handleSubmit}>
          {mission.pola.map((field) => (
            <label key={field.name} className="field">
              {field.label}
              {field.type === "textarea" ? (
                <textarea
                  rows={10}
                  value={values[field.name] ?? ""}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                />
              ) : (
                <input
                  className="text-input"
                  value={values[field.name] ?? ""}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                />
              )}
            </label>
          ))}
          <button type="submit" disabled={isBusy || requiredMissing}>
            {isBusy ? "Agent pracuje…" : "Uruchom misję"}
          </button>
        </form>

        {isBusy && <p className="status typing">Agent pracuje… to może potrwać do minuty.</p>}
        {error && <p className="error">{error}</p>}

        <div className="runs">
          <h3>Ostatnie wykonania</h3>
          {runsError && <p className="muted">{runsError}</p>}
          {!runsError && !runs.length && <p className="muted">Jeszcze nic nie zapisano.</p>}
          <ul>
            {runs.map((run) => (
              <li key={run.id}>
                <button type="button" className="link-button" onClick={() => openRun(run.id)}>
                  {formatDate(run.createdAt)}
                </button>{" "}
                <small>{run.preview}</small>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {shown && (
        <section className="analysis mission-result" aria-label="Wynik misji">
          <MissionResultView wynik={shown.wynik} />
          <footer className="result-footer">
            <small>
              {shown.zapisany ? "Zapisany wynik z" : "Wykonano"}: {formatDate(shown.wykonano)}
              {shown.zapis ? ` · ${shown.zapis}` : ""}
            </small>
            <CopyButton text={resultToText(shown.wynik)} label="Kopiuj jako tekst" />
          </footer>
          <p className="status">To wynik do sprawdzenia przez człowieka. Aplikacja niczego nie wysyła.</p>
        </section>
      )}
    </>
  );
}
