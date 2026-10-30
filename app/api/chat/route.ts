import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { hasValidSession } from "@/lib/session";

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
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}