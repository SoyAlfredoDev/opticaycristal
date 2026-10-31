import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import Link from "next/link";
import { customerAdminSession } from "@/lib/clients/admin";
import { requestedSupportTicket } from "@/lib/clients/support-types";
import { SupportDesk } from "@/components/clients/SupportDesk";
import styles from "@/components/clients/ClientSpace.module.css";
export const dynamic = "force-dynamic";
export default async function AdminSupportPage({searchParams}:{searchParams:Promise<{ticket?:string}>}) {
  if (!await customerAdminSession()) return <AdminAccessDenied/>;
  const initialTicketId=requestedSupportTicket((await searchParams).ticket);
  return <div className={styles.space}><main id="contenido-principal" className={styles.main}><div className={styles.adminHead}><div><h1>Tickets de ayuda</h1><p className={styles.muted}>Revisa solicitudes, responde y márcalas como resueltas.</p></div><Link href="/admin/clientes" className={styles.button}>Volver a clientes</Link></div><SupportDesk key={initialTicketId||"support"} admin initialTicketId={initialTicketId} /></main></div>;
}
