import Dashboard from "../travel-dashboard";
import LoginForm from "../login-form";
import { hasValidSession } from "@/lib/session";

export default async function DashboardPage() {
  return (await hasValidSession()) ? <Dashboard /> : <LoginForm />;
}
