import type { UIMessage } from "ai";
import Chat from "./chat";
import LoginForm from "./login-form";
import { hasValidSession } from "@/lib/session";
import { conversationExists, getLatestConversationId, loadMessages } from "@/lib/memory";

type SearchParams = Promise<{ c?: string; nowa?: string }>;

async function initialConversation(params: Awaited<SearchParams>) {
  if (params.nowa) return { id: null, messages: [] as UIMessage[] };

  try {
    const requested = Number(params.c);
    const id =
      Number.isInteger(requested) && requested > 0 && (await conversationExists(requested))
        ? requested
        : await getLatestConversationId();
    return { id, messages: id ? await loadMessages(id) : [] };
  } catch (error) {
    // Bez bazy czat nadal działa, tylko nie wczyta historii.
    console.error("Nie udało się wczytać rozmowy:", error);
    return { id: null, messages: [] as UIMessage[] };
  }
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  if (!(await hasValidSession())) return <LoginForm />;

  const conversation = await initialConversation(await searchParams);
  return (
    <Chat
      key={conversation.id ?? "nowa"}
      initialConversationId={conversation.id}
      initialMessages={conversation.messages}
    />
  );
}
