"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

type Metadata =
  | { fetchedAt?: string; modelId?: string; steps?: number; stoppedAtLimit?: boolean; maxSteps?: number }
  | undefined;

type ToolPart = {
  type: string;
  toolName?: string;
  state?: string;
  output?: { image?: string; modelId?: string };
  errorText?: string;
};

const TOOL_LABELS: Record<string, string> = {
  wyszukiwanie: "🔎 wyszukiwanie",
  generujObraz: "🎨 obraz",
  wycenaKonsultacji: "🧮 wycena",
  cenaWWalucie: "💱 cena w walucie",
  pogoda: "🌤️ pogoda",
  waluty: "💶 waluty",
  swieta: "📅 święta",
  wikipedia: "📚 wikipedia",
  kalkulator: "➗ kalkulator",
  czas: "🕒 czas",
  notatki: "📝 notatki",
  diagnostyka: "🩺 diagnostyka",
};

const transport = new DefaultChatTransport({ api: "/api/agent", body: { mode: "chat" } });

function formatFetchedAt(fetchedAt: string | undefined) {
  if (!fetchedAt) return null;
  return new Date(fetchedAt).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
}

function toolName(part: ToolPart) {
  if (part.type === "dynamic-tool") return part.toolName ?? null;
  return part.type.startsWith("tool-") ? part.type.slice(5) : null;
}

// Kolejne kroki agenta z nazwami użytych narzędzi, np. [["pogoda"], ["kalkulator"]].
function toolSteps(message: UIMessage) {
  const steps: string[][] = [];
  let current: string[] | null = null;

  for (const part of message.parts as ToolPart[]) {
    if (part.type === "step-start") {
      current = [];
      steps.push(current);
      continue;
    }
    const name = toolName(part);
    if (!name) continue;
    if (!current) {
      current = [];
      steps.push(current);
    }
    current.push(name);
  }

  const withTools = steps.filter((step) => step.length > 0);
  const usedSearch = withTools.some((step) => step.includes("wyszukiwanie"));
  if (!usedSearch && message.parts.some((part) => part.type === "source-url")) {
    withTools.unshift(["wyszukiwanie"]);
  }
  return withTools;
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
        <div className="brand">
          <h1>Studio Nova</h1>
          <p>Asystent konsultacji: szkice odpowiedzi, wyceny, pogoda, kursy walut i obrazy.</p>
        </div>
        <nav className="header-actions">
          <Link className="button-ghost" href="/dashboard">
            Podróże
          </Link>
          <Link className="button-ghost" href="/analiza">
            Analiza
          </Link>
          <button type="button" className="button-ghost" onClick={handleLogout}>
            Wyjdź
          </button>
        </nav>
      </header>

      <section className="messages" aria-label="Rozmowa">
        {messages.length === 0 && (
          <p className="empty">Napisz pierwszą wiadomość, np. „Jaka będzie jutro pogoda w Lizbonie?”.</p>
        )}
        {messages.map((message) => {
          const metadata = message.metadata as Metadata;
          const sources = message.parts.filter((part) => part.type === "source-url");
          const fetchedAt = formatFetchedAt(metadata?.fetchedAt);
          const steps = message.role === "assistant" ? toolSteps(message) : [];

          return (
            <div key={message.id} className={`message ${message.role}`}>
              {steps.length > 0 && (
                <ol className="steps" aria-label="Kroki agenta">
                  {steps.map((step, index) => (
                    <li key={index} className="tool-label">
                      {index + 1}. {step.map((name) => TOOL_LABELS[name] ?? name).join(" + ")}
                    </li>
                  ))}
                </ol>
              )}
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
              {metadata?.stoppedAtLimit && (
                <p className="limit">
                  Zatrzymałem się po {metadata.maxSteps} krokach. Powyżej jest to, co udało się ustalić.
                </p>
              )}
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
                <small className="model">
                  model: {metadata.modelId}
                  {metadata.steps ? ` · kroki: ${metadata.steps}` : ""}
                </small>
              )}
            </div>
          );
        })}
        {isBusy && <p className="status typing">Agent pisze…</p>}
        {error && <p className="error">{error.message}</p>}
      </section>

      <div className="composer-area">
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
          <button
            type="button"
            className="button-ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            Dodaj zdjęcie
          </button>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Napisz wiadomość…"
            aria-label="Wiadomość"
          />
          <button type="submit" className="button-primary" disabled={isBusy || (!input.trim() && !file)}>
            Wyślij
          </button>
        </form>
      </div>
    </main>
  );
}
