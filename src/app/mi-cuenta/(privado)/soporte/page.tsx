import Link from "next/link";
import { SupportDesk } from "@/components/clients/SupportDesk";
import styles from "@/components/clients/ClientSpace.module.css";
export default function CustomerSupportPage() {
  return <><Link href="/mi-cuenta/perfil" className={styles.textLink}>← Mi perfil</Link><h1>Soporte</h1><p className={styles.muted}>Crea una solicitud o consulta nuestras respuestas.</p><SupportDesk /></>;
}
