import Link from "next/link";
import { requestedSupportTicket } from "@/lib/clients/support-types";
import { SupportDesk } from "@/components/clients/SupportDesk";
import styles from "@/components/clients/ClientSpace.module.css";
export default async function CustomerSupportPage({searchParams}:{searchParams:Promise<{ticket?:string}>}) {
  const initialTicketId=requestedSupportTicket((await searchParams).ticket);
  return <><Link href="/mi-cuenta/perfil" className={styles.textLink}>← Mi perfil</Link><h1>Soporte</h1><p className={styles.muted}>Crea una solicitud o consulta nuestras respuestas.</p><SupportDesk initialTicketId={initialTicketId} /></>;
}
