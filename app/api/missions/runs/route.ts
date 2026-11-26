import { getCurrentUser } from "@/lib/auth";
import { getMission } from "@/lib/mission-catalog";
import { getMissionRun, listMissionRuns } from "@/lib/mission-runs";

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

// GET ?mission=notatka → pięć ostatnich wykonań; GET ?id=12 → jeden zapisany wynik.
// RLS w bazie zwraca wyłącznie wiersze zalogowanej osoby.
export async function GET(req: Request) {
  const { supabase, user } = await getCurrentUser();
  if (!user) return fail("Sesja wygasła. Zaloguj się ponownie.", 401);

  const params = new URL(req.url).searchParams;
  try {
    const id = Number(params.get("id"));
    if (params.has("id")) {
      if (!Number.isInteger(id) || id <= 0) return fail("Nieprawidłowy numer wyniku.", 400);
      const run = await getMissionRun(supabase, id);
      return run ? Response.json({ run }) : fail("Nie znaleziono takiego wyniku.", 404);
    }
    const mission = getMission(params.get("mission"));
    if (!mission) return fail("Nie ma takiej misji.", 400);
    return Response.json({ runs: await listMissionRuns(supabase, mission.id) });
  } catch (error) {
    console.error(error);
    return Response.json({ runs: [], error: "Historia misji jest niedostępna." }, { status: 200 });
  }
}
