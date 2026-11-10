"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

type Metadata = { fetchedAt?: string; modelId?: string } | undefined;
type ToolPart = {
  type: string;
  state?: string;
  output?: { image?: string; modelId?: string };
  errorText?: string;
};

const transport = new DefaultChatTransport({ api: "/api/agent", body: { mode: "chat" } });

function formatFetchedAt(fetchedAt: string | undefined) {
  if (!fetchedAt) return null;
  return new Date(fetchedAt).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { messages, sendMessage, status, error } = useChat({ transport });
  const isBusy = status === "submitted" || status === "streaming";

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFileError("");
    setFile(null);
    if (!selected) return;

    if (!ALLOWED_IMAGE_TYPES.includes(selected.type)) {
      setFileError("Dozwolone są tylko zdjęcia JPG, PNG lub WEBP.");
      event.target.value = "";
      return;
    }
    if (selected.size > MAX_IMAGE_SIZE) {
      setFileError("Zdjęcie jest za duże (maksymalnie 4 MB).");
      event.target.value = "";
      return;
    }
    setFile(selected);
  }

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if ((!text && !file) || isBusy) return;

    if (file && fileInputRef.current?.files) {
      sendMessage({ text: text || "Co widzisz na tym zdjęciu?", files: fileInputRef.current.files });
    } else {
      sendMessage({ text });
    }
    setInput("");
    clearFile();
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <main className="chat">
      <header className="chat-header">
        <h1>Mój chatbot</h1>
        <nav className="header-actions">
          <Link className="logout" href="/analiza">
            Analiza
          </Link>
          <button type="button" className="logout" onClick={handleLogout}>
            Wyjdź
          </button>
        </nav>
      </header>

      <section className="messages" aria-label="Rozmowa">
        {messages.map((message) => {
          const metadata = message.metadata as Metadata;
          const sources = message.parts.filter((part) => part.type === "source-url");
          const fetchedAt = formatFetchedAt(metadata?.fetchedAt);

          return (
            <div key={message.id} className={`message ${message.role}`}>
              {message.parts.map((part, index) => {
                if (part.type === "text") return <span key={index}>{part.text}</span>;
                if (part.type === "file" && part.mediaType.startsWith("image/")) {
                  return <img key={index} className="thumbnail" src={part.url} alt="Wysłane zdjęcie" />;
                }
                const toolPart = part as ToolPart;
                if (toolPart.type === "tool-generujObraz") {
                  if (toolPart.state === "output-available" && toolPart.output?.image) {
                    return (
                      <span key={index} className="generated">
                        <img src={toolPart.output.image} alt="Wygenerowany obraz" />
                        <small className="model">model: {toolPart.output.modelId}</small>
                      </span>
                    );
                  }
                  if (toolPart.state === "output-error") {
                    return (
                      <span key={index} className="error">
                        Nie udało się wygenerować obrazu. Model obrazów może być teraz niedostępny.
                      </span>
                    );
                  }
                  return (
                    <span key={index} className="status">
                      Generuję obraz…
                    </span>
                  );
                }
                return null;
              })}
              {sources.length > 0 && (
                <div className="sources">
                  <strong>Źródła:</strong>
                  <ul>
                    {sources.map((source) => (
                      <li key={source.sourceId}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.title || source.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                  {fetchedAt && <small>pobrano: {fetchedAt}</small>}
                </div>
              )}
              {message.role === "assistant" && metadata?.modelId && (
                <small className="model">model: {metadata.modelId}</small>
              )}
            </div>
          );
        })}
        {status === "submitted" && <p className="status">Czekam na odpowiedź…</p>}
        {error && <p className="error">{error.message}</p>}
      </section>

      {fileError && <p className="error">{fileError}</p>}
      {file && (
        <p className="status">
          Dołączone zdjęcie: {file.name}{" "}
          <button type="button" className="link-button" onClick={clearFile}>
            usuń
          </button>
        </p>
      )}

      <form className="composer" onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          hidden
        />
        <button type="button" className="secondary" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
          Dodaj zdjęcie
        </button>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Napisz wiadomość…"
          aria-label="Wiadomość"
        />
        <button type="submit" disabled={isBusy || (!input.trim() && !file)}>
          Wyślij
        </button>
      </form>
    </main>
  );
}
