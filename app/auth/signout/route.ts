import { createUserClient } from "@/lib/auth";

// Wylogowanie: kończy sesję w Supabase i usuwa ciasteczka.
export async function POST() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  return Response.json({ ok: true });
}
