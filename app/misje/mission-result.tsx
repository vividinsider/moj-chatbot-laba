import type { MissionResult, Source } from "@/lib/mission-catalog";

function SourceList({ zrodla }: { zrodla: Source[] }) {
  if (!zrodla.length) return <p className="muted">Wyszukiwanie nie zwróciło żadnych stron.</p>;
  return (
    <ol className="source-list">
      {zrodla.map((source) => (
        <li key={source.nr} value={source.nr}>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.tytul}
          </a>
        </li>
      ))}
    </ol>
  );
}

const refs = (numbers: number[]) => (numbers.length ? ` ${numbers.map((nr) => `[${nr}]`).join("")}` : "");

function Items({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="muted">{empty}</p>
  );
}

export default function MissionResultView({ wynik }: { wynik: MissionResult }) {
  if (wynik.typ === "raport") {
    return (
      <div className="report">
        <h2>Raport: {wynik.temat}</h2>
        <h3>Podsumowanie</h3>
        <p>{wynik.podsumowanie}</p>
        <h3>Fakty</h3>
        <ul>
          {wynik.fakty.map((fakt, index) => (
            <li key={index}>
              {fakt.tekst}
              <strong>{refs(fakt.zrodla)}</strong>
            </li>
          ))}
        </ul>
        {!wynik.fakty.length && <p className="muted">Brak faktów potwierdzonych źródłem.</p>}
        {wynik.pominieteFakty > 0 && (
          <p className="muted">Pominięto faktów bez źródła: {wynik.pominieteFakty}.</p>
        )}
        <h3>Czego nie udało się ustalić</h3>
        <Items items={wynik.czegoNieUstalono} empty="Agent nie zgłosił luk." />
        <h3>Wnioski</h3>
        <Items items={wynik.wnioski} empty="Brak wniosków." />
        <h3>Źródła</h3>
        <SourceList zrodla={wynik.zrodla} />
      </div>
    );
  }

  if (wynik.typ === "porownanie") {
    const rec = wynik.rekomendacja;
    return (
      <div className="report">
        <h2>Porównanie: {wynik.firmy.join(", ")}</h2>
        {wynik.dlaKogo && <p className="muted">Dla kogo: {wynik.dlaKogo}</p>}
        <div className="table-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th>Kryterium</th>
                {wynik.firmy.map((firma) => (
                  <th key={firma}>{firma}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wynik.wiersze.map((row) => (
                <tr key={row.kryterium}>
                  <th scope="row">{row.kryterium}</th>
                  {row.wartosci.map((cell, index) => (
                    <td key={index} className={cell.zrodla.length ? "" : "no-data"}>
                      {cell.wartosc}
                      <small>{refs(cell.zrodla)}</small>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Rekomendacja</h3>
        {rec.firma ? (
          <p>
            <strong>{rec.firma}</strong> — {rec.warunek} {rec.uzasadnienie}
          </p>
        ) : (
          <p>{rec.uzasadnienie}</p>
        )}
        <h3>Źródła</h3>
        <SourceList zrodla={wynik.zrodla} />
      </div>
    );
  }

  if (wynik.status === "brak_danych") {
    return (
      <div className="report">
        <h2>Potrzebuję więcej danych</h2>
        <p className="limit">{wynik.brakuje}</p>
      </div>
    );
  }

  return (
    <div className="report">
      <h2>Notatka ze spotkania</h2>
      <h3>Ustalenia</h3>
      <Items items={wynik.ustalenia} empty="Brak ustaleń." />
      <h3>Zadania</h3>
      {wynik.zadania.length ? (
        <div className="table-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th>Kto</th>
                <th>Co</th>
                <th>Do kiedy</th>
              </tr>
            </thead>
            <tbody>
              {wynik.zadania.map((task, index) => (
                <tr key={index}>
                  <td className={task.kto === "brak danych" ? "no-data" : ""}>{task.kto}</td>
                  <td>{task.co}</td>
                  <td className={task.termin === "brak terminu" ? "no-data" : ""}>{task.termin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Brak zadań.</p>
      )}
      <h3>Pytania otwarte</h3>
      <Items items={wynik.pytania} empty="Brak pytań otwartych." />
    </div>
  );
}
