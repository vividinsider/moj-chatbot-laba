import KnowledgeUpload from "../knowledge-upload";
import LoginForm from "../login-form";
import { hasValidSession } from "@/lib/session";

export default async function UploadPage() {
  return (await hasValidSession()) ? <KnowledgeUpload /> : <LoginForm />;
}
