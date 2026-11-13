import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { hasValidSession } from "@/lib/session";
import {
  findPlace,
  getCountryCurrency,
  getExchangeRate,
  getHolidays,
  getTime,
  getWeather,
  getWikipediaSummary,
} from "@/lib/data-sources";

const requestSchema = z.strictObject({
  miasto: z.string().trim().min(1).max(100),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

function firstSentences(text: string, count: number) {
  return (text.match(/[^.!?]+[.!?]+/g) ?? [text]).slice(0, count).join(" ").trim();
}

async function upcomingHolidays(countryCode: string, date: string) {
  const year = Number(date.slice(0, 4));
  const [thisYear, nextYear] = await Promise.all([
    getHolidays(countryCode, year),
    getHolidays(countryCode, year + 1),
  ]);
  if (!thisYear.ok) return thisYear;
  const all = [...thisYear.swieta, ...(nextYear.ok ? nextYear.swieta : [])];
  return { ...thisYear, swieta: all.filter((holiday) => holiday.data >= date).slice(0, 3) };
}

async function currencyCard(countryCode: string) {
  const currency = getCountryCurrency(countryCode);
  if (!currency) {
    return { ok: false as const, zrodlo: "NBP (kurs średni)", blad: "Nie znam waluty tego kraju." };
  }
  return getExchangeRate(currency);
}

async function summarize(cards: Record<string, unknown>) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) return null;

  try {
    const result = await generateText({
      model: createOpenRouter({ apiKey }).chat(model),
      instructions:
        "Jesteś asystentem podróży. Na podstawie danych z kart napisz po polsku 2–3 zdania: " +
        "co spakować i na co uważać. Korzystaj tylko z podanych danych. Jeśli któraś karta " +
        "ma błąd, powiedz wprost, którego źródła zabrakło.",
      prompt: JSON.stringify(cards),
      // Model może zużyć część limitu na rozumowanie, więc zostawiamy zapas.
      maxOutputTokens: 2000,
    });
    return result.text;
  } catch (error) {
    console.error("Błąd podsumowania dashboardu:", error);
    return null;
  }
}

export async function POST(req: Request) {
  if (!(await hasValidSession())) {
    return fail("Sesja wygasła. Zaloguj się ponownie.", 401);
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("Podaj miasto i datę.", 400);
  }
  const { miasto, data } = parsed.data;

  const place = await findPlace(miasto);
  if (!place.ok) {
    return fail(place.blad, 404);
  }
  const { nazwa, kodKraju, strefaCzasowa } = place.miejsce;

  const [pogoda, waluty, swieta, wikipedia] = await Promise.all([
    getWeather(nazwa, data),
    currencyCard(kodKraju),
    upcomingHolidays(kodKraju, data),
    getWikipediaSummary(nazwa),
  ]);
  const czas = getTime(strefaCzasowa);

  const cards = {
    pogoda,
    waluty,
    swieta,
    wikipedia: wikipedia.ok ? { ...wikipedia, streszczenie: firstSentences(wikipedia.streszczenie, 2) } : wikipedia,
    czas,
  };

  return Response.json({
    miejsce: place.miejsce,
    karty: cards,
    podsumowanie: await summarize({ miasto: `${nazwa}, ${place.miejsce.kraj}`, data, ...cards }),
  });
}
