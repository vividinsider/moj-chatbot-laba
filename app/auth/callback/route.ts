import { NextResponse } from "next/server";
import { createUserClient, safeNextPath } from "@/lib/auth";

// Powrót z Google: wymiana jednorazowego kodu na sesję, potem przejście do czatu.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    console.error("Błąd logowania przez Google:", error.message);
  }

  return NextResponse.redirect(new URL("/login?error=google", url.origin));
}
