import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

import { bodyFont } from "@/components/site/fonts";
import { AdminShell } from "@/components/admin/AdminShell";
import { customerAdminSession } from "@/lib/clients/admin";
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession({allowSeller:true});
  if (!session) redirect("/admin/login");
  return <AdminShell fontClass={bodyFont.variable} seller={session.role==="seller"} allowCustomers={Boolean(await customerAdminSession(true))}>{children}</AdminShell>;
}
