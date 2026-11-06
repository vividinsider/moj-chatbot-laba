import { generateText, Output } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { hasValidSession } from "@/lib/session";
import { ANALYSIS_RULES, STUDIO_NOVA_INSTRUCTIONS } from "@/lib/studio-nova";
import { analysisSchema, describeAnalysisError, validateAnalysis } from "@/lib/analysis";

const MAX_MESSAGE_LENGTH = 2000;

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(req: Request) {
  if (!(await hasValidSession())) {
    return fail("Sesja wygasła. Zaloguj się ponownie.", 401);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;

  if (!apiKey || !model) {
    return fail("Brak konfiguracji: uzupełnij OPENROUTER_API_KEY i OPENROUTER_MODEL.", 500);
  }

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    return fail("Wpisz wiadomość klienta do analizy.", 400);
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return fail(`Wiadomość jest za długa (maksymalnie ${MAX_MESSAGE_LENGTH} znaków).`, 400);
  }

  const openrouter = createOpenRouter({ apiKey });

  try {
    const result = await generateText({
      model: openrouter.chat(model),
      instructions: `${STUDIO_NOVA_INSTRUCTIONS}\n\n${ANALYSIS_RULES}`,
      prompt: message,
      output: Output.object({ schema: analysisSchema }),
      maxOutputTokens: 1000,
    });

    const checked = validateAnalysis(result.output);
    if (!checked.ok) {
      return fail(`Wynik modelu jest niezgodny ze schematem: ${checked.error}`, 502);
    }

    return Response.json({ analysis: checked.analysis });
  } catch (error) {
    console.error("Błąd analizy:", error);
    return fail(describeAnalysisError(error), 502);
  }
}