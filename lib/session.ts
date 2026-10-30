import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "chat_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 godzin w sekundach

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function createSessionToken(secret: string) {
  const expires = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${expires}.${sign(expires, secret)}`;
}

export async function hasValidSession() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !process.env.CHAT_PASSWORD) return false;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (!safeEqual(signature, sign(expires, secret))) return false;

  return Number(expires) > Date.now();
}