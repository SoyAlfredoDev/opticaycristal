import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { getSession } from "@/lib/auth";

export default async function AdminLoginPage() {
  if (await getSession()) redirect("/admin");
  return <LoginForm />;
}
