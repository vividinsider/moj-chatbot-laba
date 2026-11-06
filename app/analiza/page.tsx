import Analyze from "../analyze";
import LoginForm from "../login-form";
import { hasValidSession } from "@/lib/session";

export default async function AnalysisPage() {
  return (await hasValidSession()) ? <Analyze /> : <LoginForm />;
}