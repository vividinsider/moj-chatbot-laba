import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteDocument,
  findDocumentByTitle,
  importDocument,
  listDocuments,
  MAX_DOCUMENT_LENGTH,
} from "@/lib/knowledge";

const importSchema = z.strictObject({
  title: z.string().trim().min(1, "Wpisz tytuł dokumentu.").max(120, "Tytuł jest za długi."),
  content: z
    .string()
    .trim()
    .min(1, "Wklej treść dokumentu.")
    .max(MAX_DOCUMENT_LENGTH, `Treść jest za długa (maksymalnie ${MAX_DOCUMENT_LENGTH} znaków).`),
  replace: z.boolean().default(false),
});

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function GET() {
  if (!(await getCurrentUser()).user) return fail("Sesja wygasła. Zaloguj się ponownie.", 401);
  try {
    return Response.json({ documents: await listDocuments() });
  } catch (error) {
    console.error(error);
    return fail("Nie udało się wczytać listy dokumentów.", 500);
  }
}

export async function POST(req: Request) {
  if (!(await getCurrentUser()).user) return fail("Sesja wygasła. Zaloguj się ponownie.", 401);

  const parsed = importSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane.", 400);
  const { title, content, replace } = parsed.data;

  try {
    const existing = await findDocumentByTitle(title);
    if (existing !== null && !replace) {
      return Response.json(
        { error: `Dokument „${title}” już jest w bazie.`, needsConfirmation: true },
        { status: 409 },
      );
    }

    const result = await importDocument(title, content);
    // Nowa wersja jest zapisana, więc dopiero teraz usuwamy poprzednią.
    if (existing !== null) await deleteDocument(existing);

    return Response.json({ title, chunkCount: result.chunkCount, replaced: existing !== null });
  } catch (error) {
    console.error("Błąd importu dokumentu:", error);
    return fail(error instanceof Error ? error.message : "Nie udało się dodać dokumentu.", 500);
  }
}

export async function DELETE(req: Request) {
  if (!(await getCurrentUser()).user) return fail("Sesja wygasła. Zaloguj się ponownie.", 401);
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return fail("Nieprawidłowy dokument.", 400);
  try {
    await deleteDocument(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return fail("Nie udało się usunąć dokumentu.", 500);
  }
}
