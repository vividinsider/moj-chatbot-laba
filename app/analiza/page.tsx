import { redirect } from "next/navigation";
import Analyze from "../analyze";
import { getCurrentUser } from "@/lib/auth";

export default async function AnalysisPage() {
  const { user } = await getCurrentUser();
  if (!user) redirect("/login?next=/analiza");
  return <Analyze />;
}
