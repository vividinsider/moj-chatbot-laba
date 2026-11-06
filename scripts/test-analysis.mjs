import assert from "node:assert/strict";
import { NoObjectGeneratedError } from "ai";
import { describeAnalysisError, validateAnalysis } from "../lib/analysis.ts";

const good = {
  category: "sales",
  priority: "normal",
  draft: "Konsultacja online trwa 45 minut i kosztuje 150 zł brutto.",
  needs_review: false,
};
const { draft, ...withoutDraft } = good;

const cases = [
  ["poprawny wynik", good, true],
  ["brak pola draft", withoutDraft, false],
  ['needs_review jako tekst "false"', { ...good, needs_review: "false" }, false],
  ["kategoria marketing", { ...good, category: "marketing" }, false],
  ["dodatkowe pole send_now", { ...good, send_now: true }, false],
];

for (const [name, data, expected] of cases) {
  const result = validateAnalysis(data);
  assert.equal(result.ok, expected, name);
  console.log(`OK  ${name} -> ${result.ok ? "przyjęty" : `odrzucony (${result.error})`}`);
}

function fakeError(finishReason) {
  return new NoObjectGeneratedError({
    message: "test",
    response: { id: "test", timestamp: new Date(), modelId: "test" },
    usage: {},
    finishReason,
  });
}

const errors = [
  ["ucięta odpowiedź", fakeError("length")],
  ["odmowa modelu", fakeError("content-filter")],
  ["zły format", fakeError("stop")],
  ["błąd dostawcy", new Error("timeout")],
];

for (const [name, error] of errors) {
  console.log(`OK  ${name} -> ${describeAnalysisError(error)}`);
}

console.log("\nWszystkie testy walidacji przeszły.");