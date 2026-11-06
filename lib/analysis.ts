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