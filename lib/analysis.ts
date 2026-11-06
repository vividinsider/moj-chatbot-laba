import { NoObjectGeneratedError } from "ai";
import { z } from "zod";

export const analysisSchema = z.strictObject({
  category: z.enum(["sales", "support", "billing", "unknown"]),
  priority: z.enum(["normal", "high"]),
  draft: z.string().min(1),
  needs_review: z.boolean(),
});

export type Analysis = z.infer<typeof analysisSchema>;

export function validateAnalysis(data: unknown) {
  const result = analysisSchema.safeParse(data);
  if (result.success) return { ok: true as const, analysis: result.data };

  const error = result.error.issues
    .map((issue) => `${issue.path.join(".") || "wynik"}: ${issue.message}`)
    .join("; ");
  return { ok: false as const, error };
}

export function describeAnalysisError(error: unknown) {
  if (NoObjectGeneratedError.isInstance(error)) {
    if (error.finishReason === "length") {
      return "Odpowiedź modelu została ucięta, zanim wynik był kompletny. Spróbuj ponownie.";
    }
    if (error.finishReason === "content-filter") {
      return "Model odmówił analizy tej wiadomości. Sprawdź ją ręcznie.";
    }
    return "Model zwrócił wynik w złym formacie albo odmówił odpowiedzi. Sprawdź wiadomość ręcznie.";
  }
  return "Błąd dostawcy modelu. Spróbuj ponownie za chwilę.";
}

export const MAX_MESSAGE_LENGTH = 2000;

const analysisRequestSchema = z.strictObject(
  {
    message: z
      .string({ error: "Wpisz wiadomość klienta do analizy." })
      .trim()
      .min(1, "Wpisz wiadomość klienta do analizy.")
      .max(MAX_MESSAGE_LENGTH, `Wiadomość jest za długa (maksymalnie ${MAX_MESSAGE_LENGTH} znaków).`),
  },
  {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Niedozwolone pole w żądaniu: ${issue.keys.join(", ")}.`
        : "Nieprawidłowe żądanie.",
  },
);

export function parseAnalysisRequest(body: unknown) {
  const result = analysisRequestSchema.safeParse(body);
  if (result.success) return { ok: true as const, message: result.data.message };
  return { ok: false as const, error: result.error.issues[0].message };
}

// Prosta kontrola serwera: nie wykrywa każdego ataku, ale może tylko
// podnieść needs_review do true, nigdy go nie obniża.
const INJECTION_PATTERNS = [
  /ignoruj/i,
  /od teraz/i,
  /needs_review/i,
  /instrukcj/i,
  /asystent/i,
  /prompt/i,
  /system/i,
];

export function looksLikeInjection(message: string) {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(message));
}

export function enforceReview(analysis: Analysis, message: string): Analysis {
  return looksLikeInjection(message) ? { ...analysis, needs_review: true } : analysis;
}