import { tool } from "ai";
import { z } from "zod";

// Cena z informacji firmy Studio Nova.
export const CONSULTATION_PRICE_PLN = 150;

function round(value: number) {
  return Math.round(value * 100) / 100;
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
    "po aktualnym kursie średnim NBP. Użyj, gdy klient pyta o cenę w innej walucie niż złotówki.",
  inputSchema: z.object({
    waluta: z.enum(["EUR", "USD", "GBP", "CHF"]).describe("Kod waluty"),
    liczbaKonsultacji: z.number().int().min(1).max(50).default(1).describe("Liczba konsultacji"),
  }),
  execute: async ({ waluta, liczbaKonsultacji }) => {
    const url = `https://api.nbp.pl/api/exchangerates/rates/a/${waluta.toLowerCase()}/?format=json`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`NBP odpowiedział ${response.status}`);
      const data = await response.json();
      const rate = data.rates[0];
      const kwotaPLN = liczbaKonsultacji * CONSULTATION_PRICE_PLN;
      return {
        kwotaPLN,
        waluta,
        kwotaWWalucie: round(kwotaPLN / rate.mid),
        kursSredniNBP: rate.mid,
        dataKursu: rate.effectiveDate,
        pobrano: new Date().toISOString(),
        zrodlo: url,
      };
    } catch {
      return { blad: "Nie udało się pobrać kursu z NBP. Spróbuj ponownie za chwilę." };
    }
  },
});
