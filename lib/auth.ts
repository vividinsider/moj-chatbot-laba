// Logowanie przez Supabase Auth. Tożsamość ustala wyłącznie serwer
// na podstawie zweryfikowanej sesji (auth.getUser pyta serwer Supabase).
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Brak konfiguracji: uzupełnij NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return { url, key };
}

// Klient Supabase działający „jako zalogowana osoba”: bazy pilnuje RLS.
export async function createUserClient() {
  // Najpierw ciasteczka: dzięki temu strony z logowaniem są zawsze dynamiczne.
  const cookieStore = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Strony serwerowe nie mogą zapisywać ciasteczek; sesję odświeża proxy.ts.
        }
      },
    },
  });
}

export async function getCurrentUser() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export type Viewer = { email: string; name: string; avatarUrl: string | null };

// Imię i avatar: z konta Google (full_name / name, avatar_url / picture) albo z e-maila.
export function viewerFromUser(user: User): Viewer {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
  const email = user.email ?? "";
  return {
    email,
    name: text(meta.full_name) ?? text(meta.name) ?? email.split("@")[0] ?? "Użytkownik",
    avatarUrl: text(meta.avatar_url) ?? text(meta.picture),
  };
}

export function unauthorized() {
  return Response.json({ error: "Nie jesteś zalogowany. Zaloguj się ponownie." }, { status: 401 });
}

// Adres powrotu po logowaniu: tylko ścieżki wewnątrz aplikacji.
export function safeNextPath(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
