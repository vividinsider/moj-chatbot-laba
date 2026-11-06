"use client";

import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();
  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
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
        {messages.map((message) => (
          <p key={message.id} className={`message ${message.role}`}>
            {message.parts.map((part, index) =>
              part.type === "text" ? <span key={index}>{part.text}</span> : null,
            )}
          </p>
        ))}
        {status === "submitted" && <p className="status">Czekam na odpowiedź…</p>}
        {error && <p className="error">{error.message}</p>}
      </section>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Napisz wiadomość…"
          aria-label="Wiadomość"
        />
        <button type="submit" disabled={isBusy || !input.trim()}>
          Wyślij
        </button>
      </form>
    </main>
  );
}