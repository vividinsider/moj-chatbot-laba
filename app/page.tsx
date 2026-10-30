import Chat from "./chat";
import LoginForm from "./login-form";
import { hasValidSession } from "@/lib/session";

export default async function Home() {
  return (await hasValidSession()) ? <Chat /> : <LoginForm />;
}