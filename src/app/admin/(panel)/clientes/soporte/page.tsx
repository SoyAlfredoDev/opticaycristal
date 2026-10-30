import Link from "next/link";
import { redirect } from "next/navigation";
import { customerAdminSession } from "@/lib/clients/admin";
import { ClientBrand } from "@/components/clients/ClientBrand";
import { SupportDesk } from "@/components/clients/SupportDesk";
import styles from "@/components/clients/ClientSpace.module.css";
export const dynamic = "force-dynamic";
export default async function AdminSupportPage() {
  if (!await customerAdminSession()) redirect("/admin/login");
  return <div className={styles.space}><ClientBrand admin initials="AD" /><main id="contenido-principal" className={styles.main}><div className={styles.adminHead}><div><h1>Tickets de ayuda</h1><p className={styles.muted}>Revisa solicitudes, responde y márcalas como resueltas.</p></div><Link href="/admin/clientes" className={styles.button}>Volver a clientes</Link></div><SupportDesk admin /></main></div>;
}
