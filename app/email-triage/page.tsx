import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PageNav from "../page-nav";
import TriageForm from "./triage-form";

export default async function EmailTriagePage() {
  const { user } = await getCurrentUser();
  if (!user) redirect("/login?next=/email-triage");

  return (
    <main className="chat dashboard">
      <PageNav title="Triage maili" subtitle="Agent sortuje pocztę i pisze szkice. Niczego nie wysyła." />
      <TriageForm />
    </main>
  );
}
