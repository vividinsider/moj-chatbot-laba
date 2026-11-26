// Wspólne elementy misji i triage: model, wyszukiwanie w internecie, źródła i błędy.
import { generateText, isStepCount, NoObjectGeneratedError } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export type OpenRouter = ReturnType<typeof createOpenRouter>;

export type WebSource = { nr: number; url: string; tytul: string };

export function getLlm() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) {
    throw new Error("Brak konfiguracji: uzupełnij OPENROUTER_API_KEY i OPENROUTER_MODEL.");
  }
  return { openrouter: createOpenRouter({ apiKey }), model };
}

// Agent w misjach ma mniej kroków niż w czacie: misja ma skończyć się w minutę.
export const MISSION_MAX_STEPS = 4;
// Pojedyncze wywołanie modelu nie może trwać dłużej niż 40 sekund.
export const MISSION_TIMEOUT_MS = 40_000;

// Zbieranie informacji z internetu. Model dopisuje przy każdym fakcie domenę strony,
// a adresy stron bierzemy wyłącznie z wyników wyszukiwania (result.sources), nigdy z tekstu modelu.
const RESEARCH_RULES =
  "Jesteś researcherem. Piszesz po polsku same fakty z wyników wyszukiwania, każdy w osobnej linii. " +
  "Na końcu każdej linii podajesz w nawiasie kwadratowym domenę strony, z której pochodzi fakt, np. [example.com]. " +
  "Gdy czegoś nie znalazłeś, piszesz wprost: „nie znaleziono: …”. Niczego nie zgadujesz i nie dopisujesz z pamięci.";

export async function researchWeb(prompt: string) {
  // Wtyczka web (exa) wyszukuje zawsze, zanim model zacznie pisać.
  // Wbudowane wyszukiwanie modelu bywa pomijane, więc jest tylko zapasem.
  const first = await researchWithPlugin(prompt).catch((error) => {
    console.error("Wyszukiwanie (wtyczka web) nie powiodło się:", error);
    return { notes: "", sources: [] as Awaited<ReturnType<typeof researchWithTool>>["sources"] };
  });
  if (first.sources.length) return first;
  return researchWithTool(prompt);
}

async function researchWithPlugin(prompt: string) {
  const { openrouter, model } = getLlm();
  const result = await generateText({
    model: openrouter.chat(model, { plugins: [{ id: "web", engine: "exa", max_results: 6 }] }),
    instructions: RESEARCH_RULES,
    prompt,
    maxOutputTokens: 6000,
    abortSignal: AbortSignal.timeout(MISSION_TIMEOUT_MS),
  });
  return { notes: result.text.trim(), sources: result.sources };
}

async function researchWithTool(prompt: string) {
  const { openrouter, model } = getLlm();
  const result = await generateText({
    model: openrouter.chat(model),
    instructions: `${RESEARCH_RULES} Zawsze najpierw użyj wyszukiwania w internecie.`,
    prompt,
    tools: { wyszukiwanie: openrouter.tools.webSearch({ maxResults: 5, engine: "native" }) },
    stopWhen: isStepCount(MISSION_MAX_STEPS),
    maxOutputTokens: 6000,
    abortSignal: AbortSignal.timeout(MISSION_TIMEOUT_MS),
  });
  return { notes: result.text.trim(), sources: result.sources };
}

// Łączy źródła z kilku wyszukiwań, usuwa powtórki i numeruje od 1.
export function numberSources(lists: { sourceType: string; url?: string; title?: string }[][]): WebSource[] {
  const seen = new Set<string>();
  const out: WebSource[] = [];
  for (const list of lists) {
    for (const source of list) {
      if (source.sourceType !== "url" || !source.url || seen.has(source.url)) continue;
      if (!/^https?:\/\//i.test(source.url)) continue;
      seen.add(source.url);
      out.push({ nr: out.length + 1, url: source.url, tytul: source.title?.trim() || hostOf(source.url) });
    }
  }
  return out;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function sourcesForPrompt(sources: WebSource[]) {
  return sources.length
    ? sources.map((source) => `[${source.nr}] ${hostOf(source.url)} — ${source.tytul}`).join("\n")
    : "(wyszukiwanie nie zwróciło żadnych stron)";
}

// Numery źródeł podane przez model zostawiamy tylko wtedy, gdy takie źródło naprawdę istnieje.
export function keepRealSourceNumbers(numbers: number[], sources: WebSource[]) {
  return [...new Set(numbers)].filter((nr) => sources.some((source) => source.nr === nr)).sort((a, b) => a - b);
}

export function describeModelError(error: unknown) {
  if (NoObjectGeneratedError.isInstance(error)) {
    if (error.finishReason === "length") return "Odpowiedź modelu została ucięta. Spróbuj ponownie.";
    if (error.finishReason === "content-filter") return "Model odmówił wykonania tego zadania.";
    return "Model zwrócił wynik w złym formacie. Spróbuj ponownie.";
  }
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return "Agent pracował zbyt długo i został zatrzymany. Spróbuj ponownie.";
  }
  if (error instanceof Error && error.message.startsWith("Brak konfiguracji")) return error.message;
  return "Błąd dostawcy modelu. Spróbuj ponownie za chwilę.";
}
