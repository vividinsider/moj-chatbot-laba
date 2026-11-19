// Baza wiedzy (RAG): dokumenty dzielone na fragmenty z embeddingami w Supabase pgvector.
import { embed, embedMany } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getSupabase } from "@/lib/supabase";

// Model openai/text-embedding-3-small zwraca 1536 liczb, tyle samo co kolumna chunks.embedding.
const MAX_CHUNK_LENGTH = 800;
export const MAX_DOCUMENT_LENGTH = 20_000;
// Fragmenty mniej podobne do pytania nie liczą się jako źródło.
export const MIN_SIMILARITY = 0.3;

export type KnowledgeDocument = {
  id: number;
  title: string;
  createdAt: string;
  chunkCount: number;
};

export type KnowledgeMatch = {
  title: string;
  content: string;
  similarity: number;
};

function embeddingModel() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_EMBEDDING_MODEL;
  if (!apiKey || !model) {
    throw new Error("Brak konfiguracji: uzupełnij OPENROUTER_API_KEY i OPENROUTER_EMBEDDING_MODEL.");
  }
  return createOpenRouter({ apiKey }).textEmbeddingModel(model);
}

// Jeden akapit (tekst oddzielony pustą linią) to jeden fragment.
// Akapit dłuższy niż 800 znaków dzielimy na granicy zdania.
export function splitIntoChunks(text: string) {
  const chunks: string[] = [];
  for (const paragraph of text.split(/\r?\n\s*\r?\n/).map((part) => part.trim()).filter(Boolean)) {
    if (paragraph.length <= MAX_CHUNK_LENGTH) {
      chunks.push(paragraph);
      continue;
    }
    let current = "";
    for (const sentence of paragraph.match(/[^.!?]+[.!?]+["”)]*\s*|[^.!?]+$/g) ?? [paragraph]) {
      if (current && (current + sentence).length > MAX_CHUNK_LENGTH) {
        chunks.push(current.trim());
        current = "";
      }
      current += sentence;
    }
    if (current.trim()) chunks.push(current.trim());
  }
  return chunks;
}

// Uzupełnia embeddingi fragmentów, które mają pustą kolumnę embedding.
async function fillMissingEmbeddings() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("chunks").select("id, content").is("embedding", null).limit(200);
  if (error) throw new Error(`Błąd bazy: ${error.message}`);
  if (!data?.length) return 0;

  const { embeddings } = await embedMany({ model: embeddingModel(), values: data.map((row) => row.content) });
  for (const [index, row] of data.entries()) {
    const update = await supabase.from("chunks").update({ embedding: embeddings[index] }).eq("id", row.id);
    if (update.error) throw new Error(`Błąd zapisu embeddingu: ${update.error.message}`);
  }
  return data.length;
}

export async function importDocument(title: string, content: string) {
  const supabase = getSupabase();
  const parts = splitIntoChunks(content);
  if (!parts.length) throw new Error("Treść nie zawiera żadnego akapitu.");

  // Najpierw embeddingi: jeśli się nie udadzą, niczego nie zapisujemy.
  let embeddings: number[][];
  try {
    ({ embeddings } = await embedMany({ model: embeddingModel(), values: parts }));
  } catch (error) {
    console.error("Błąd tworzenia embeddingów:", error);
    throw new Error("Nie udało się utworzyć embeddingów. Sprawdź model OPENROUTER_EMBEDDING_MODEL i spróbuj ponownie.");
  }

  const document = await supabase.from("documents").insert({ title }).select("id").single();
  if (document.error || !document.data) {
    throw new Error(`Nie udało się zapisać dokumentu: ${document.error?.message ?? "brak danych"}`);
  }
  const documentId = document.data.id as number;

  const rows = parts.map((part, index) => ({
    document_id: documentId,
    chunk_index: index,
    content: part,
    embedding: embeddings[index],
  }));
  const inserted = await supabase.from("chunks").insert(rows);
  if (inserted.error) {
    // Nie zostawiamy niedokończonego dokumentu.
    await supabase.from("documents").delete().eq("id", documentId);
    throw new Error(`Nie udało się zapisać fragmentów: ${inserted.error.message}`);
  }

  const filled = await fillMissingEmbeddings().catch((error) => {
    console.error("Nie udało się uzupełnić starych embeddingów:", error);
    return 0;
  });
  return { documentId, chunkCount: parts.length, filled };
}

export async function findDocumentByTitle(title: string) {
  const { data, error } = await getSupabase().from("documents").select("id").eq("title", title).limit(1);
  if (error) throw new Error(`Błąd bazy: ${error.message}`);
  return data?.[0] ? (data[0].id as number) : null;
}

export async function deleteDocument(id: number) {
  const { error } = await getSupabase().from("documents").delete().eq("id", id);
  if (error) throw new Error(`Nie udało się usunąć dokumentu: ${error.message}`);
}

export async function listDocuments(): Promise<KnowledgeDocument[]> {
  const { data, error } = await getSupabase()
    .from("documents")
    .select("id, title, created_at, chunks(count)")
    .order("id", { ascending: false });
  if (error) throw new Error(`Błąd bazy: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as number,
    title: row.title as string,
    createdAt: row.created_at as string,
    chunkCount: (row.chunks as { count: number }[])[0]?.count ?? 0,
  }));
}

export async function searchKnowledgeBase(question: string, count = 3) {
  const { embedding } = await embed({ model: embeddingModel(), value: question });
  const { data, error } = await getSupabase().rpc("match_chunks", {
    query_embedding: embedding,
    match_count: count,
  });
  if (error) throw new Error(`Błąd wyszukiwania: ${error.message}`);
  return ((data ?? []) as { title: string; content: string; similarity: number }[])
    .filter((row) => row.similarity >= MIN_SIMILARITY)
    .map((row): KnowledgeMatch => ({
      title: row.title,
      content: row.content,
      similarity: Math.round(row.similarity * 100) / 100,
    }));
}
