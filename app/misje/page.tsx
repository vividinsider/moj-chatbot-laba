import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PageNav from "../page-nav";
import MissionsView from "./missions-view";

export default async function MissionsPage() {
  const { user } = await getCurrentUser();
  if (!user) redirect("/login?next=/misje");

  return (
    <main className="chat dashboard">
      <PageNav title="Misje" subtitle="Zadanie od danych wejściowych do gotowego wyniku. Wynik czyta i zatwierdza człowiek." />
      <MissionsView />
    </main>
  );
}
