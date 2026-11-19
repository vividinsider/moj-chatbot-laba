"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type KnowledgeDocument = { id: number; title: string; createdAt: string; chunkCount: number };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "medium", timeStyle: "short" });
}

export default function KnowledgeUpload() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);

  const loadDocuments = useCallback(async () => {
    const response = await fetch("/api/knowledge");
    const data = await response.json().catch(() => null);
    if (response.ok && data?.documents) setDocuments(data.documents);
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function send(replace: boolean): Promise<void> {
    setStatus(replace ? "Zastępuję dokument: dzielę tekst i tworzę embeddingi…" : "Dzielę tekst i tworzę embeddingi…");
    const response = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content, replace }),
    });
    const data = await response.json().catch(() => null);

    if (response.status === 409 && data?.needsConfirmation) {
      setStatus("");
      if (window.confirm(`${data.error} Zastąpić poprzednią wersję?`)) return send(true);
      return;
    }
    if (!response.ok) {
      setStatus("");
      setError(data?.error ?? "Nie udało się dodać dokumentu.");
      return;
    }

    setStatus(
      `${data.replaced ? "Zastąpiono" : "Zapisano"} dokument „${data.title}”: ${data.chunkCount} fragmentów.`,
    );
    setTitle("");
    setContent("");
    await loadDocuments();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    setError("");
    if (!title.trim()) return setError("Wpisz tytuł dokumentu.");
    if (!content.trim()) return setError("Wklej treść dokumentu.");

    setIsBusy(true);
    try {
      await send(false);
    } catch {
      setStatus("");
      setError("Brak połączenia z serwerem.");
    }
    setIsBusy(false);
  }

  async function handleDelete(document: KnowledgeDocument) {
    if (!window.confirm(`Usunąć dokument „${document.title}” z bazy wiedzy?`)) return;
    const response = await fetch(`/api/knowledge?id=${document.id}`, { method: "DELETE" });
    if (!response.ok) setError("Nie udało się usunąć dokumentu.");
    await loadDocuments();
  }

  return (
    <main className="chat dashboard">
      <header className="chat-header">
        <div className="brand">
          <h1>Baza wiedzy</h1>
          <p>Wklej dokument (np. cennik, FAQ, regulamin). Agent będzie na nim opierał odpowiedzi.</p>
        </div>
        <nav className="header-actions">
          <Link className="button-ghost" href="/">
            Czat
          </Link>
        </nav>
      </header>

      <form className="analyze-form" onSubmit={handleSubmit}>
        <input
          className="text-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Tytuł, np. Cennik 2026"
          aria-label="Tytuł"
        />
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Treść dokumentu. Akapity oddziel pustą linią."
          aria-label="Treść"
          rows={12}
          maxLength={20000}
        />
        <button type="submit" disabled={isBusy}>
          {isBusy ? "Dodaję…" : "Dodaj do bazy wiedzy"}
        </button>
      </form>

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}

      <section className="summary">
        <h2>Dokumenty w bazie</h2>
        {documents.length === 0 ? (
          <p className="status">Baza wiedzy jest pusta.</p>
        ) : (
          <ul className="history">
            {documents.map((document) => (
              <li key={document.id} className="document-row">
                <span>
                  <strong>{document.title}</strong>
                  <small>
                    dodano: {formatDate(document.createdAt)} · fragmentów: {document.chunkCount}
                  </small>
                </span>
                <button type="button" className="button-ghost" onClick={() => handleDelete(document)}>
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
