import type { SupabaseClient } from "@supabase/supabase-js";
import type { UIMessage } from "ai";
import { redirect } from "next/navigation";
import Chat from "./chat";
import { getCurrentUser, viewerFromUser } from "@/lib/auth";
import { conversationExists, getLatestConversationId, loadMessages } from "@/lib/memory";

type SearchParams = Promise<{ c?: string; nowa?: string }>;

async function initialConversation(db: SupabaseClient, params: Awaited<SearchParams>) {
  if (params.nowa) return { id: null, messages: [] as UIMessage[] };

  try {
    // RLS zwraca tylko rozmowy zalogowanej osoby: cudzy numer wygląda jak nieistniejący.
    const requested = Number(params.c);
    const id =
      Number.isInteger(requested) && requested > 0 && (await conversationExists(db, requested))
        ? requested
        : await getLatestConversationId(db);
    return { id, messages: id ? await loadMessages(db, id) : [] };
  } catch (error) {
    console.error("Nie udało się wczytać rozmowy:", error);
    return { id: null, messages: [] as UIMessage[] };
  }
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login");

  const conversation = await initialConversation(supabase, await searchParams);
  return (
    <Chat
      key={`${user.id}-${conversation.id ?? "nowa"}`}
      viewer={viewerFromUser(user)}
      initialConversationId={conversation.id}
      initialMessages={conversation.messages}
    />
  );
}
