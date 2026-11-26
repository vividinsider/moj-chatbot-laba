// Zapisane wykonania misji (tabela mission_runs z RLS „tylko własne wyniki misji”).
// Klient Supabase to zawsze klient zalogowanej osoby — nie klucz secret.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MissionId, MissionResult } from "@/lib/mission-catalog";

export type MissionRunSummary = { id: number; createdAt: string; preview: string };

export async function saveMissionRun(
  db: SupabaseClient,
  mission: MissionId,
  input: Record<string, unknown>,
  result: MissionResult,
) {
  const { data, error } = await db
    .from("mission_runs")
    .insert({ mission, input: JSON.stringify(input), result: JSON.stringify(result) })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Błąd zapisu wyniku misji: ${error?.message ?? "brak danych"}`);
  return data.id as number;
}

function preview(input: string | null) {
  try {
    const values = Object.values(JSON.parse(input ?? "{}") as Record<string, unknown>)
      .filter((value): value is string => typeof value === "string" && value.trim() !== "")
      .join(" · ");
    return values.replace(/\s+/g, " ").slice(0, 90) || "(bez danych)";
  } catch {
    return "(bez danych)";
  }
}

export async function listMissionRuns(db: SupabaseClient, mission: MissionId): Promise<MissionRunSummary[]> {
  const { data, error } = await db
    .from("mission_runs")
    .select("id, created_at, input")
    .eq("mission", mission)
    .order("id", { ascending: false })
    .limit(5);
  if (error) throw new Error(`Błąd odczytu wyników misji: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as number,
    createdAt: row.created_at as string,
    preview: preview(row.input as string | null),
  }));
}

export async function getMissionRun(db: SupabaseClient, id: number) {
  const { data, error } = await db
    .from("mission_runs")
    .select("id, created_at, mission, input, result")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Błąd odczytu wyniku misji: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id as number,
    createdAt: data.created_at as string,
    mission: data.mission as MissionId,
    input: JSON.parse((data.input as string) ?? "{}") as Record<string, string>,
    wynik: JSON.parse(data.result as string) as MissionResult,
  };
}
