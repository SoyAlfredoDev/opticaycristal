import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

import { AdminShell } from "@/components/admin/AdminShell";
import { customerAdminSession } from "@/lib/clients/admin";
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return <AdminShell allowCustomers={Boolean(await customerAdminSession())}>{children}</AdminShell>;
}
