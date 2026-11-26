import { getCurrentUser } from "@/lib/auth";
import {
  countPriorities,
  MAX_EMAIL_LENGTH,
  MAX_EMAILS,
  sortCards,
  splitEmails,
  triageEmails,
} from "@/lib/triage";

// Pięć maili przetwarzanych równolegle mieści się w minucie.
export const maxDuration = 60;

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(req: Request) {
  // Najpierw zalogowana osoba, dopiero potem model.
  const { user } = await getCurrentUser();
  if (!user) return fail("Sesja wygasła. Zaloguj się ponownie.", 401);

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";
  const emails = splitEmails(text);

  if (!emails.length) return fail("Wklej co najmniej jeden mail.", 400);
  if (emails.length > MAX_EMAILS) {
    return fail(`Za dużo maili: ${emails.length}. Naraz można posortować najwyżej ${MAX_EMAILS}.`, 400);
  }
  const tooLong = emails.findIndex((email) => email.length > MAX_EMAIL_LENGTH);
  if (tooLong >= 0) {
    return fail(`Mail nr ${tooLong + 1} jest za długi (najwyżej ${MAX_EMAIL_LENGTH} znaków).`, 400);
  }

  const cards = await triageEmails(emails);
  return Response.json({
    cards: sortCards(cards),
    summary: countPriorities(cards),
    wykonano: new Date().toISOString(),
  });
}
