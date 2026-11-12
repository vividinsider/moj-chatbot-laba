import { tool } from "ai";
import { z } from "zod";
import {
  getExchangeRate,
  getHolidays,
  getTime,
  getWeather,
  getWikipediaSummary,
} from "@/lib/data-sources";

// Cena z informacji firmy Studio Nova.
export const CONSULTATION_PRICE_PLN = 150;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function dateInDays(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(date);
}

export const wycenaKonsultacji = tool({
  description:
    "Liczy koszt konsultacji Studio Nova w złotych: łączną cenę za podaną liczbę konsultacji " +
    "i kwotę do zapłaty po odjęciu wpłaconej zaliczki. Użyj, gdy klient pyta, ile zapłaci za kilka konsultacji.",
  inputSchema: z.object({
    liczbaKonsultacji: z.number().int().min(1).max(50).describe("Liczba konsultacji"),
    zaliczka: z.number().min(0).default(0).describe("Wpłacona zaliczka w złotych, 0 gdy brak"),
  }),
  execute: async ({ liczbaKonsultacji, zaliczka }) => {
    const razem = liczbaKonsultacji * CONSULTATION_PRICE_PLN;
    return {
      cenaZaKonsultacjePLN: CONSULTATION_PRICE_PLN,
      liczbaKonsultacji,
      razemPLN: razem,
      zaliczkaPLN: zaliczka,
      doZaplatyPLN: Math.max(razem - zaliczka, 0),
    };
  },
});

export const cenaWWalucie = tool({
  description:
    "Przelicza cenę konsultacji Studio Nova na walutę obcą (EUR, USD, GBP, CHF) " +
    "po aktualnym kursie średnim NBP. Użyj, gdy klient pyta o cenę konsultacji w innej walucie niż złotówki.",
  inputSchema: z.object({
    waluta: z.enum(["EUR", "USD", "GBP", "CHF"]).describe("Kod waluty"),
    liczbaKonsultacji: z.number().int().min(1).max(50).default(1).describe("Liczba konsultacji"),
  }),
  execute: async ({ waluta, liczbaKonsultacji }) => {
    const rate = await getExchangeRate(waluta);
    if (!rate.ok) return { blad: rate.blad };
    const kwotaPLN = liczbaKonsultacji * CONSULTATION_PRICE_PLN;
    return {
      kwotaPLN,
      waluta,
      kwotaWWalucie: round(kwotaPLN / rate.kursPLN),
      kursSredniNBP: rate.kursPLN,
      dataKursu: rate.dataKursu,
      pobrano: rate.pobrano,
    };
  },
});

export const pogoda = tool({
  description:
    "Prognoza pogody dla miasta na wybrany dzień (do 16 dni naprzód): opis, temperatura min/max, szansa opadów. " +
    "Użyj przy pytaniach o pogodę. Gdy miasto nie istnieje, zwraca błąd: wtedy nie wymyślaj prognozy.",
  inputSchema: z.object({
    miasto: z.string().min(1).max(100).describe("Nazwa miasta, np. Lizbona"),
    dniOdDzisiaj: z.number().int().min(0).max(15).default(0).describe("0 = dziś, 1 = jutro, itd."),
  }),
  execute: async ({ miasto, dniOdDzisiaj }) => getWeather(miasto, dateInDays(dniOdDzisiaj)),
});

export const waluty = tool({
  description:
    "Aktualny kurs średni NBP waluty wobec złotego i opcjonalne przeliczenie kwoty na złote. " +
    "Użyj przy pytaniach o kursy walut i przeliczanie kwot (nie dotyczy cen konsultacji Studio Nova).",
  inputSchema: z.object({
    waluta: z.string().length(3).describe("Kod waluty ISO, np. EUR, USD, GBP"),
    kwota: z.number().positive().optional().describe("Kwota w tej walucie do przeliczenia na złote"),
  }),
  execute: async ({ waluta, kwota }) => getExchangeRate(waluta, kwota),
});

export const swieta = tool({
  description:
    "Dni wolne od pracy (święta państwowe) w podanym kraju i roku, opcjonalnie tylko w jednym miesiącu.",
  inputSchema: z.object({
    kodKraju: z.string().length(2).describe("Dwuliterowy kod kraju ISO, np. PT, PL, DE"),
    rok: z.number().int().min(2000).max(2100).describe("Rok"),
    miesiac: z.number().int().min(1).max(12).optional().describe("Numer miesiąca, np. 12 dla grudnia"),
  }),
  execute: async ({ kodKraju, rok, miesiac }) => getHolidays(kodKraju, rok, miesiac),
});

export const wikipedia = tool({
  description:
    "Krótkie streszczenie hasła z polskiej Wikipedii wraz z linkiem do artykułu. " +
    "Użyj, gdy użytkownik prosi o informacje encyklopedyczne o mieście, osobie, miejscu lub pojęciu.",
  inputSchema: z.object({
    haslo: z.string().min(1).max(100).describe("Tytuł hasła, np. Lizbona"),
  }),
  execute: async ({ haslo }) => getWikipediaSummary(haslo),
});

export const kalkulator = tool({
  description:
    "Wykonuje działanie na liczbach podanych jako osobne argumenty: dodawanie, odejmowanie, " +
    "mnożenie lub dzielenie. Użyj do każdych obliczeń, zamiast liczyć samodzielnie.",
  inputSchema: z.object({
    dzialanie: z.enum(["dodaj", "odejmij", "pomnoz", "podziel"]).describe("Rodzaj działania"),
    liczby: z.array(z.number()).min(2).max(20).describe("Liczby, w kolejności działania"),
  }),
  execute: async ({ dzialanie, liczby }) => {
    const [first, ...rest] = liczby;
    if (dzialanie === "podziel" && rest.some((value) => value === 0)) {
      return { blad: "Nie można dzielić przez zero." };
    }
    const wynik = rest.reduce((acc, value) => {
      if (dzialanie === "dodaj") return acc + value;
      if (dzialanie === "odejmij") return acc - value;
      if (dzialanie === "pomnoz") return acc * value;
      return acc / value;
    }, first);
    return { dzialanie, liczby, wynik: round(wynik) };
  },
});

export const czas = tool({
  description:
    "Aktualna data i godzina w podanej strefie czasowej oraz różnica godzin względem Polski. " +
    "Użyj przy pytaniach o dzisiejszą datę, dzień tygodnia lub godzinę w innym mieście.",
  inputSchema: z.object({
    strefa: z.string().min(1).max(60).default("Europe/Warsaw").describe("Strefa IANA, np. Europe/Lisbon"),
  }),
  execute: async ({ strefa }) => getTime(strefa),
});

// Notatki w pamięci serwera: znikną po restarcie (bazę danych dodamy w lekcji 5).
const notes: { tekst: string; zapisano: string }[] = [];

export const notatki = tool({
  description:
    "Zapisuje notatkę albo pokazuje wszystkie zapisane notatki. " +
    "Użyj, gdy użytkownik prosi o zapamiętanie czegoś lub o pokazanie notatek.",
  inputSchema: z.object({
    akcja: z.enum(["zapisz", "pokaz"]).describe("zapisz = dodaj notatkę, pokaz = pokaż wszystkie"),
    tekst: z.string().min(1).max(500).optional().describe("Treść notatki (tylko przy akcji zapisz)"),
  }),
  execute: async ({ akcja, tekst }) => {
    if (akcja === "zapisz") {
      if (!tekst) return { blad: "Brak treści notatki." };
      notes.push({ tekst, zapisano: new Date().toISOString() });
      return { zapisano: tekst, liczbaNotatek: notes.length };
    }
    return { notatki: notes, liczbaNotatek: notes.length };
  },
});
