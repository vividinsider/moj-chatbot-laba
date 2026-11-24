import { redirect } from "next/navigation";
import KnowledgeUpload from "../knowledge-upload";
import { getCurrentUser } from "@/lib/auth";

export default async function UploadPage() {
  const { user } = await getCurrentUser();
  if (!user) redirect("/login?next=/upload");
  return <KnowledgeUpload />;
}
