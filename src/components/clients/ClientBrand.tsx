import Image from "next/image";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { brand } from "@/components/site/content";
import { clientLogo } from "./client-logo";
import styles from "./ClientSpace.module.css";

export function ClientBrand({ admin = false, initials, prominent = false }: { admin?: boolean; initials?: string; prominent?: boolean }) {
  return <header className={`${styles.top} ${prominent ? styles.topAuth : ""}`}>
    <Link className={styles.brand} href={admin ? "/admin/clientes" : "/mi-cuenta"}>
      <Image src={clientLogo} unoptimized alt={brand.name} width={196} height={100} priority />
      <span>{admin ? "GESTIÓN DE CLIENTES" : "MI ESPACIO · CLIENTES"}</span>
    </Link>
    {initials ? <div className={styles.headerActions}>
      {!admin && <Link href="/mi-cuenta/ayuda" className={styles.helpAccess} aria-label="Ayuda y contacto"><CircleHelp size={21} aria-hidden="true" /></Link>}
      {admin ? <span className={styles.avatar} aria-label="Administración">{initials}</span> : <Link href="/mi-cuenta/perfil" className={styles.avatar} aria-label="Mi perfil">{initials}</Link>}
    </div> : <Link href="/" aria-label="Volver al sitio de la óptica" className={styles.textLink}>Volver a la web</Link>}
  </header>;
}
