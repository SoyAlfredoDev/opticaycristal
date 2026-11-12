import Link from "next/link";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { customerAdminSession } from "@/lib/clients/admin";
import { searchCustomerSummaries } from "@/lib/clients/store";
import { AdminClients } from "@/components/clients/AdminClients";
import styles from "@/components/clients/ClientSpace.module.css";
export const dynamic = "force-dynamic";
export default async function AdminCustomersPage() {
  const staff=await customerAdminSession(true);
  if (!staff) return <AdminAccessDenied/>;
  const result = await searchCustomerSummaries();
  return <div className={styles.space}><main className={styles.main} id="contenido-principal">{staff.role!=="seller" && <Link className={styles.button} href="/admin/clientes/asesorias">Asesorías de monturas</Link>}<AdminClients initialCustomers={result.customers} initialHasMore={result.hasMore} seller={staff.role==="seller"} /></main></div>;
}
