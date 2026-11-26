import { getCurrentUser } from "@/lib/auth";
import { describeModelError } from "@/lib/llm";
import { MissionInputError, runMission } from "@/lib/missions";
import { saveMissionRun } from "@/lib/mission-runs";

// Porównanie to trzy wyszukiwania i jedno wywołanie modelu — do minuty.
export const maxDuration = 60;

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(req: Request) {
  // Najpierw zalogowana osoba, dopiero potem model.
  const { supabase, user } = await getCurrentUser();
  if (!user) return fail("Sesja wygasła. Zaloguj się ponownie.", 401);

  const body = await req.json().catch(() => null);

  let outcome;
  try {
    outcome = await runMission(body?.mission, body?.input);
  } catch (error) {
    if (error instanceof MissionInputError) return fail(error.message, 400);
    console.error("Błąd misji:", error);
    return fail(describeModelError(error), 502);
  }

  const { mission, values, wynik } = outcome;
  // Zapis w historii nie może zepsuć wyniku: gdy tabeli brak, wynik i tak wraca.
  let runId: number | null = null;
  let zapis = "";
  try {
    runId = await saveMissionRun(supabase, mission.id, values, wynik);
  } catch (error) {
    console.error(error);
    zapis = "Wynik nie został zapisany w historii.";
  }

  return Response.json({ wynik, runId, zapis, wykonano: new Date().toISOString() });
}
