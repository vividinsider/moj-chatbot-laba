import { cookies } from "next/headers";
import {
  createSessionToken,
  safeEqual,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

// Licznik w pamięci działa osobno w każdej instancji na hostingu.
// Spowalnia zgadywanie hasła, ale nie jest ochroną globalną.
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: Request) {
  const password = process.env.CHAT_PASSWORD;
  const secret = process.env.SESSION_SECRET;

  if (!password || !secret) {
    return Response.json(
      { error: "Brak konfiguracji: uzupełnij CHAT_PASSWORD i SESSION_SECRET." },
      { status: 500 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const entry = attempts.get(ip);
  const current =
    entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS };

  if (current.count >= MAX_ATTEMPTS) {
    return Response.json(
      { error: "Za dużo prób. Spróbuj ponownie za kilka minut." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const submitted = typeof body?.password === "string" ? body.password : "";

  if (!safeEqual(submitted, password)) {
    attempts.set(ip, { ...current, count: current.count + 1 });
    return Response.json({ error: "Błędne hasło." }, { status: 401 });
  }

  attempts.delete(ip);

  (await cookies()).set(SESSION_COOKIE, createSessionToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return Response.json({ ok: true });
}