import Link from "next/link";

// Nagłówek podstron z misjami: tytuł i szybkie przejścia.
export default function PageNav({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="chat-header">
      <div className="brand">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <nav className="header-actions">
        <Link className="button-ghost" href="/">
          Czat
        </Link>
        <Link className="button-ghost" href="/email-triage">
          Triage
        </Link>
        <Link className="button-ghost" href="/misje">
          Misje
        </Link>
      </nav>
    </header>
  );
}
