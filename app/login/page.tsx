import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { getCurrentUser, safeNextPath, supabaseConfig } from "@/lib/auth";

const ERRORS: Record<string, string> = {
  google: "Logowanie przez Google nie udało się albo zostało anulowane. Spróbuj ponownie.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  const { user } = await getCurrentUser();
  if (user) redirect(next);

  const { url, key } = supabaseConfig();
  return (
    <LoginForm
      supabaseUrl={url}
      supabaseKey={key}
      next={next}
      initialError={params.error ? (ERRORS[params.error] ?? "Logowanie nie udało się.") : ""}
    />
  );
}
