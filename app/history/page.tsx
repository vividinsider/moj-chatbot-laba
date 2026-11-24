import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listConversations, type ConversationSummary } from "@/lib/memory";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "medium", timeStyle: "short" });
}

export default async function HistoryPage() {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login?next=/history");

  let conversations: ConversationSummary[] = [];
  let error = "";
  try {
    conversations = await listConversations(supabase);
  } catch (cause) {
    console.error("Nie udało się wczytać historii:", cause);
    error = "Nie udało się wczytać historii rozmów. Sprawdź połączenie z bazą.";
  }

  return (
    <main className="chat dashboard">
      <header className="chat-header">
        <div className="brand">
          <h1>Historia rozmów</h1>
          <p>Zapisane rozmowy z agentem Studio Nova, najnowsze na górze.</p>
        </div>
        <nav className="header-actions">
          <Link className="button-primary" href="/?nowa=1">
            Nowa rozmowa
          </Link>
          <Link className="button-ghost" href="/">
            Czat
          </Link>
        </nav>
      </header>

      {error && <p className="error">{error}</p>}
      {!error && conversations.length === 0 && (
        <p className="empty">Nie ma jeszcze zapisanych rozmów. Zacznij pierwszą!</p>
      )}

      <ul className="history">
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <Link href={`/?c=${conversation.id}`}>
              <strong>{conversation.title}</strong>
              <small>
                {formatDate(conversation.createdAt)} · wiadomości: {conversation.messageCount}
              </small>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
