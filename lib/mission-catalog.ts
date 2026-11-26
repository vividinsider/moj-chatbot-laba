// Katalog misji: wszystko, co widać na stronie /misje, i instrukcje dla modelu.
// Nową misję dodajesz tutaj (nazwa, opis, kontrakt, pola formularza, instrukcja),
// a jej wykonanie w lib/missions.ts. Ten plik nie ma sekretów — korzysta z niego też przeglądarka.

export type MissionId = "raport" | "porownanie" | "notatka";

export type MissionField = {
  name: string;
  label: string;
  type: "text" | "textarea";
  placeholder: string;
  maxLength: number;
  required: boolean;
};

export type MissionDef = {
  id: MissionId;
  nazwa: string;
  opis: string;
  kontrakt: { cel: string; wejscie: string; narzedzia: string; wynik: string; kontrola: string };
  pola: MissionField[];
  instrukcja: string;
};

export const MISSIONS: MissionDef[] = [
  {
    id: "raport",
    nazwa: "Raport",
    opis: "Agent szuka w internecie i pisze krótki raport ze źródłami.",
    kontrakt: {
      cel: "Szybko zebrać rzetelne informacje na jeden temat.",
      wejscie: "Temat raportu (do 200 znaków).",
      narzedzia: "Wyszukiwanie w internecie.",
      wynik: "Podsumowanie, Fakty z numerami źródeł, Czego nie udało się ustalić, Wnioski, Źródła.",
      kontrola: "Klikam 2–3 źródła i sprawdzam, czy fakty się zgadzają.",
    },
    pola: [
      {
        name: "temat",
        label: "Temat raportu",
        type: "text",
        placeholder: "np. Jak małe firmy w Polsce używają agentów AI do obsługi klienta",
        maxLength: 200,
        required: true,
      },
    ],
    instrukcja: `Piszesz raport po polsku na podstawie notatek z wyszukiwania.
- Podsumowanie: dokładnie 3 zdania.
- Fakty: 4–6 punktów. Każdy fakt pochodzi z notatek i ma numer źródła z listy (np. [2]).
  Notatki mają przy faktach domenę strony w nawiasie — dopasuj ją do numeru z listy źródeł.
  Fakt, którego nie da się powiązać z żadnym źródłem, pomiń.
- Czego nie udało się ustalić: 1–3 punkty o lukach w informacjach (pusta lista, gdy brak luk).
- Wnioski: 2–3 punkty. Tylko Twoje interpretacje faktów, bez nowych liczb.
- Niczego nie zmyślasz. Nie podajesz adresów stron.`,
  },
  {
    id: "porownanie",
    nazwa: "Porównanie trzech firm",
    opis: "Agent porównuje trzy firmy lub produkty w tabeli i daje rekomendację z warunkiem.",
    kontrakt: {
      cel: "Wybrać najlepszą z trzech opcji na podstawie tych samych kryteriów.",
      wejscie: "Trzy nazwy, 2–5 kryteriów po przecinku i opcjonalnie: dla kogo wybieramy.",
      narzedzia: "Wyszukiwanie w internecie (osobno dla każdej firmy).",
      wynik: "Tabela: firmy w kolumnach, kryteria w wierszach; rekomendacja z warunkiem; źródła.",
      kontrola: "Sprawdzam w źródłach ceny i liczby, a puste miejsca zostawiam jako „brak danych”.",
    },
    pola: [
      { name: "firma1", label: "Firma 1", type: "text", placeholder: "np. Duolingo", maxLength: 80, required: true },
      { name: "firma2", label: "Firma 2", type: "text", placeholder: "np. Babbel", maxLength: 80, required: true },
      { name: "firma3", label: "Firma 3", type: "text", placeholder: "np. Busuu", maxLength: 80, required: true },
      {
        name: "kryteria",
        label: "Kryteria (po przecinku, 2–5)",
        type: "text",
        placeholder: "np. cena miesięczna w Polsce, liczba języków, czy jest wersja darmowa",
        maxLength: 300,
        required: true,
      },
      {
        name: "dlaKogo",
        label: "Dla kogo wybieramy (opcjonalnie)",
        type: "text",
        placeholder: "np. dla trzyosobowego biura z małym budżetem",
        maxLength: 200,
        required: false,
      },
    ],
    instrukcja: `Układasz tabelę porównawczą z notatek z wyszukiwania.
- Każda firma jest oceniana według tych samych kryteriów, w podanej kolejności.
- Wartość w komórce bierzesz tylko z notatek o tej firmie i podajesz numer źródła z listy.
  Notatki mają przy faktach domenę strony w nawiasie — dopasuj ją do numeru z listy źródeł.
- Gdy w notatkach nie ma informacji, wpisz dokładnie „brak danych” i pustą listę źródeł. Nie zgaduj, nie wpisuj zera.
- Wartości pisz krótko (do 12 słów).
- Rekomendacja wynika z tabeli. Warunek zaczyna się od „najlepszy wybór, jeśli zależy Ci na…”.
  Gdy podano „dla kogo”, uzasadnienie się na to powołuje.
- Gdy więcej niż połowa komórek to „brak danych”, firma w rekomendacji to null, a uzasadnienie mówi,
  że nie ma podstaw do rekomendacji.`,
  },
  {
    id: "notatka",
    nazwa: "Notatka ze spotkania",
    opis: "Zamienia luźne notatki ze spotkania w ustalenia, zadania z osobami i terminami oraz pytania otwarte.",
    kontrakt: {
      cel: "Zamienić luźne notatki ze spotkania w listę ustaleń i zadań.",
      wejscie: "Wklejone notatki, od kilku do kilkudziesięciu linii.",
      narzedzia: "Brak — agent pracuje tylko na wklejonym tekście.",
      wynik: "Trzy sekcje: Ustalenia, Zadania (kto, co, do kiedy), Pytania otwarte.",
      kontrola: "Sprawdzam, czy każde zadanie ma osobę i termin albo dopisek „brak terminu”.",
    },
    pola: [
      {
        name: "notatki",
        label: "Notatki ze spotkania",
        type: "textarea",
        placeholder: "spotkanie pon, byli: Kasia, Marek, Ola\n- strona www: …\n- zdjęcia ma zrobić Ola, do piątku",
        maxLength: 6000,
        required: true,
      },
    ],
    instrukcja: `Porządkujesz notatki ze spotkania. Pracujesz tylko na wklejonym tekście.
- Ustalenia: tylko to, co zostało naprawdę uzgodnione. Spór albo brak decyzji to NIE jest ustalenie.
- Zadania: każde ma osobę (kto), czynność (co) i termin (do kiedy).
  Gdy w notatkach nie ma osoby, wpisz „brak danych”. Gdy nie ma terminu, wpisz „brak terminu”.
  Termin przepisuj tak, jak jest w notatkach (np. „do piątku”, „od grudnia”) — nie wymyślaj dat.
- Pytania otwarte: sprawy nierozstrzygnięte, spory, rzeczy, o których „nikt nie wie”.
- Gdy tekst nie jest notatką ze spotkania albo jest za krótki, ustaw czyNotatka na false
  i w polu „brakuje” napisz po polsku, czego brakuje. Wtedy listy zostaw puste.
- Nie dopisujesz niczego, czego nie ma w notatkach.`,
  },
];

export function getMission(id: unknown) {
  return MISSIONS.find((mission) => mission.id === id) ?? null;
}

// Wyniki misji — ten sam kształt na serwerze i w przeglądarce.

export type Source = { nr: number; url: string; tytul: string };

export type RaportResult = {
  typ: "raport";
  temat: string;
  podsumowanie: string;
  fakty: { tekst: string; zrodla: number[] }[];
  czegoNieUstalono: string[];
  wnioski: string[];
  zrodla: Source[];
  pominieteFakty: number;
};

export type PorownanieResult = {
  typ: "porownanie";
  firmy: string[];
  dlaKogo: string;
  wiersze: { kryterium: string; wartosci: { wartosc: string; zrodla: number[] }[] }[];
  rekomendacja: { firma: string | null; warunek: string; uzasadnienie: string };
  brakDanych: number;
  zrodla: Source[];
};

export type NotatkaResult =
  | { typ: "notatka"; status: "ok"; ustalenia: string[]; zadania: { kto: string; co: string; termin: string }[]; pytania: string[] }
  | { typ: "notatka"; status: "brak_danych"; brakuje: string };

export type MissionResult = RaportResult | PorownanieResult | NotatkaResult;

// Wynik jako zwykły tekst — do przycisku „Kopiuj jako tekst”.
export function resultToText(result: MissionResult) {
  const list = (items: string[]) => (items.length ? items.map((item) => `- ${item}`).join("\n") : "- (brak)");
  const sources = (items: Source[]) =>
    items.length ? items.map((source) => `[${source.nr}] ${source.tytul}: ${source.url}`).join("\n") : "(brak)";

  if (result.typ === "raport") {
    return [
      `RAPORT: ${result.temat}`,
      `Podsumowanie\n${result.podsumowanie}`,
      `Fakty\n${list(result.fakty.map((fakt) => `${fakt.tekst} ${fakt.zrodla.map((nr) => `[${nr}]`).join("")}`))}`,
      `Czego nie udało się ustalić\n${list(result.czegoNieUstalono)}`,
      `Wnioski\n${list(result.wnioski)}`,
      `Źródła\n${sources(result.zrodla)}`,
    ].join("\n\n");
  }
  if (result.typ === "porownanie") {
    const header = `Kryterium | ${result.firmy.join(" | ")}`;
    const rows = result.wiersze.map(
      (row) => `${row.kryterium} | ${row.wartosci.map((cell) => cell.wartosc).join(" | ")}`,
    );
    const rec = result.rekomendacja;
    return [
      `PORÓWNANIE: ${result.firmy.join(", ")}`,
      result.dlaKogo ? `Dla kogo: ${result.dlaKogo}` : "",
      [header, ...rows].join("\n"),
      `Rekomendacja: ${rec.firma ?? "brak podstaw do rekomendacji"}. ${rec.warunek} ${rec.uzasadnienie}`.trim(),
      `Źródła\n${sources(result.zrodla)}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  if (result.status === "brak_danych") return `Brakuje danych: ${result.brakuje}`;
  return [
    `Ustalenia\n${list(result.ustalenia)}`,
    `Zadania\n${list(result.zadania.map((task) => `${task.kto} — ${task.co} — ${task.termin}`))}`,
    `Pytania otwarte\n${list(result.pytania)}`,
  ].join("\n\n");
}
