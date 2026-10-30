import { redirect } from "next/navigation";
import { customerAdminSession } from "@/lib/clients/admin";
import { listCustomerSummaries } from "@/lib/clients/store";
import { ClientBrand } from "@/components/clients/ClientBrand";
import { AdminClients } from "@/components/clients/AdminClients";
import styles from "@/components/clients/ClientSpace.module.css";
export const dynamic = "force-dynamic";
export default async function AdminCustomersPage() {
  if (!await customerAdminSession()) redirect("/admin/login");
  const customers = await listCustomerSummaries();
  return <div className={styles.space}><ClientBrand admin initials="AD" /><main className={styles.main} id="contenido-principal"><AdminClients initialCustomers={customers} /></main></div>;
}
