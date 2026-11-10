import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { hasValidSession } from "@/lib/session";
import { SEARCH_RULES, STUDIO_NOVA_INSTRUCTIONS } from "@/lib/studio-nova";

export async function POST(req: Request) {
  if (!(await hasValidSession())) {
    return new Response("Sesja wygasła. Zaloguj się ponownie.", { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;

  if (!apiKey || !model) {
    return new Response(
      "Brak konfiguracji: uzupełnij OPENROUTER_API_KEY i OPENROUTER_MODEL w pliku .env.local.",
      { status: 500 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const openrouter = createOpenRouter({ apiKey });

  const result = streamText({
    model: openrouter.chat(model),
    instructions: `${STUDIO_NOVA_INSTRUCTIONS}\n\n${SEARCH_RULES}`,
    messages: await convertToModelMessages(messages),
    tools: {
      wyszukiwanie: openrouter.tools.webSearch({ maxResults: 3, engine: "native" }),
    },
    stopWhen: isStepCount(5),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      sendSources: true,
      messageMetadata: ({ part }) =>
        part.type === "start" ? { fetchedAt: new Date().toISOString() } : undefined,
    }),
  });
}