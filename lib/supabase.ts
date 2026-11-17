// Połączenie z bazą Supabase. Używa klucza secret, więc wolno go
// importować wyłącznie w kodzie serwera (route.ts, strony serwerowe).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error("lib/supabase.ts działa tylko na serwerze.");
}

let client: SupabaseClient | null = null;

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Brak konfiguracji: uzupełnij SUPABASE_URL i SUPABASE_SECRET_KEY.");
  }
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}
