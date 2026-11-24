import { redirect } from "next/navigation";
import Dashboard from "../travel-dashboard";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const { user } = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  return <Dashboard />;
}
