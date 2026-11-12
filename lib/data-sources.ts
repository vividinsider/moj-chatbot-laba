// Funkcje pobierające dane z darmowych źródeł (bez kluczy API).
// Korzystają z nich narzędzia agenta i dashboard podróży.

const TIMEOUT_MS = 10_000;

async function getJson(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function now() {
  return new Date().toISOString();
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.name === "TimeoutError"
    ? "Źródło nie odpowiada."
    : "Nie udało się pobrać danych ze źródła.";
}

export type Place = {
  nazwa: string;
  kraj: string;
  kodKraju: string;
  strefaCzasowa: string;
  szerokosc: number;
  dlugosc: number;
};

export async function findPlace(city: string) {
  const zrodlo = "Open-Meteo Geocoding";
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pl&format=json`;
    const data = await getJson(url);
    const place = data.results?.[0];
    if (!place) return { ok: false as const, zrodlo, blad: `Nie znalazłem miasta „${city}”.` };
    const miejsce: Place = {
      nazwa: place.name,
      kraj: place.country,
      kodKraju: place.country_code,
      strefaCzasowa: place.timezone,
      szerokosc: place.latitude,
      dlugosc: place.longitude,
    };
    return { ok: true as const, zrodlo, pobrano: now(), miejsce };
  } catch (error) {
    return { ok: false as const, zrodlo, blad: errorMessage(error) };
  }
}

const WEATHER_CODES: Record<number, string> = {
  0: "bezchmurnie",
  1: "przeważnie słonecznie",
  2: "częściowe zachmurzenie",
  3: "pochmurno",
  45: "mgła",
  48: "mgła szronowa",
  51: "lekka mżawka",
  53: "mżawka",
  55: "gęsta mżawka",
  61: "lekki deszcz",
  63: "deszcz",
  65: "ulewny deszcz",
  71: "lekki śnieg",
  73: "śnieg",
  75: "intensywny śnieg",
  80: "przelotne opady deszczu",
  81: "przelotne opady",
  82: "gwałtowne ulewy",
  95: "burza",
  96: "burza z gradem",
  99: "silna burza z gradem",
};

export async function getWeather(city: string, date: string) {
  const zrodlo = "Open-Meteo";
  const place = await findPlace(city);
  if (!place.ok) return place;
  try {
    const { szerokosc, dlugosc, strefaCzasowa } = place.miejsce;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${szerokosc}&longitude=${dlugosc}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=${encodeURIComponent(strefaCzasowa)}&start_date=${date}&end_date=${date}`;
    const data = await getJson(url);
    const daily = data.daily;
    if (!daily?.time?.length) {
      return { ok: false as const, zrodlo, blad: "Brak prognozy na ten dzień (zwykle do 16 dni naprzód)." };
    }
    return {
      ok: true as const,
      zrodlo,
      pobrano: now(),
      miasto: `${place.miejsce.nazwa}, ${place.miejsce.kraj}`,
      data: daily.time[0] as string,
      pogoda: WEATHER_CODES[daily.weather_code[0]] ?? "brak opisu",
      temperaturaMaxC: daily.temperature_2m_max[0] as number,
      temperaturaMinC: daily.temperature_2m_min[0] as number,
      szansaOpadowProcent: daily.precipitation_probability_max[0] as number,
    };
  } catch (error) {
    return {
      ok: false as const,
      zrodlo,
      blad:
        error instanceof Error && error.message === "HTTP 400"
          ? "Brak prognozy na ten dzień (zwykle do 16 dni naprzód)."
          : errorMessage(error),
    };
  }
}

export async function getExchangeRate(currency: string, amount?: number) {
  const zrodlo = "NBP (kurs średni)";
  const code = currency.trim().toUpperCase();
  if (code === "PLN") {
    return { ok: true as const, zrodlo, pobrano: now(), waluta: "PLN", kursPLN: 1, dataKursu: "-", kwota: amount, kwotaPLN: amount };
  }
  try {
    const data = await getJson(`https://api.nbp.pl/api/exchangerates/rates/a/${code.toLowerCase()}/?format=json`);
    const rate = data.rates[0];
    return {
      ok: true as const,
      zrodlo,
      pobrano: now(),
      waluta: code,
      kursPLN: rate.mid as number,
      dataKursu: rate.effectiveDate as string,
      kwota: amount,
      kwotaPLN: amount === undefined ? undefined : Math.round(amount * rate.mid * 100) / 100,
    };
  } catch (error) {
    return {
      ok: false as const,
      zrodlo,
      blad:
        error instanceof Error && error.message === "HTTP 404"
          ? `NBP nie podaje kursu waluty ${code}.`
          : errorMessage(error),
    };
  }
}

const EURO_COUNTRIES = [
  "AT", "BE", "BG", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT",
  "LT", "LU", "LV", "ME", "MT", "NL", "PT", "SI", "SK",
];

const COUNTRY_CURRENCIES: Record<string, string> = {
  AU: "AUD", BR: "BRL", CA: "CAD", CH: "CHF", CN: "CNY", CZ: "CZK", DK: "DKK", GB: "GBP",
  HK: "HKD", HU: "HUF", IL: "ILS", IN: "INR", IS: "ISK", JP: "JPY", KR: "KRW", MX: "MXN",
  NO: "NOK", NZ: "NZD", PL: "PLN", RO: "RON", SE: "SEK", SG: "SGD", TH: "THB", TR: "TRY",
  UA: "UAH", US: "USD", ZA: "ZAR",
};

// Waluta kraju z krótkiej listy (kraje, dla których NBP publikuje kurs).
export function getCountryCurrency(countryCode: string) {
  const code = countryCode.toUpperCase();
  return EURO_COUNTRIES.includes(code) ? "EUR" : (COUNTRY_CURRENCIES[code] ?? null);
}

export async function getHolidays(countryCode: string, year: number, month?: number) {
  const zrodlo = "Nager.Date";
  try {
    const data = await getJson(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode.toUpperCase()}`);
    const swieta = (data as { date: string; localName: string; name: string }[])
      .filter((holiday) => !month || Number(holiday.date.slice(5, 7)) === month)
      .map((holiday) => ({ data: holiday.date, nazwa: holiday.localName, nazwaAngielska: holiday.name }));
    return { ok: true as const, zrodlo, pobrano: now(), kraj: countryCode.toUpperCase(), rok: year, swieta };
  } catch (error) {
    return { ok: false as const, zrodlo, blad: errorMessage(error) };
  }
}

export async function getWikipediaSummary(title: string) {
  const zrodlo = "Wikipedia (pl)";
  try {
    const data = await getJson(
      `https://pl.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.trim().replace(/ /g, "_"))}`,
    );
    if (data.type === "disambiguation") {
      return { ok: false as const, zrodlo, blad: `Hasło „${title}” ma wiele znaczeń. Podaj dokładniejszą nazwę.` };
    }
    return {
      ok: true as const,
      zrodlo,
      pobrano: now(),
      tytul: data.title as string,
      streszczenie: data.extract as string,
      link: data.content_urls?.desktop?.page as string | undefined,
    };
  } catch (error) {
    return {
      ok: false as const,
      zrodlo,
      blad:
        error instanceof Error && error.message === "HTTP 404"
          ? `Nie ma hasła „${title}” w polskiej Wikipedii.`
          : errorMessage(error),
    };
  }
}

function offsetMinutes(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(date);
  const value = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = value.match(/GMT([+-])(\d{2}):(\d{2})/);
  return match ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
}

export function getTime(timeZone: string) {
  const zrodlo = "zegar serwera";
  try {
    const date = new Date();
    const format = (zone: string) =>
      new Intl.DateTimeFormat("pl-PL", { timeZone: zone, dateStyle: "full", timeStyle: "short" }).format(date);
    return {
      ok: true as const,
      zrodlo,
      pobrano: date.toISOString(),
      strefa: timeZone,
      czasNaMiejscu: format(timeZone),
      czasWPolsce: format("Europe/Warsaw"),
      roznicaGodzinWzgledemPolski: (offsetMinutes(timeZone, date) - offsetMinutes("Europe/Warsaw", date)) / 60,
    };
  } catch {
    return { ok: false as const, zrodlo, blad: `Nieznana strefa czasowa „${timeZone}”.` };
  }
}
