import { ChevronDown, UserRound } from "lucide-react";
import { currentCustomer } from "@/lib/clients/current";
import { ProfileVerification } from "@/components/clients/ProfileVerification";
import styles from "@/components/clients/ClientSpace.module.css";

export default async function CustomerProfilePage() {
  const c = await currentCustomer();
  return <>
    <h1>Mi perfil</h1>
    <ProfileVerification customer={c} />
    <details className={`${styles.panel} ${styles.section} ${styles.personalDetails}`}>
      <summary className={styles.detailsSummary}><span className={styles.iconLabel}><UserRound size={20} aria-hidden="true" />Mis datos personales</span><ChevronDown size={20} aria-hidden="true" /></summary>
      <div className={`${styles.profileGrid} ${styles.section}`}>
        {[["Nombre", c.firstName], ["Apellido", c.lastName], ["RUT", c.rut.slice(0, -1) + "-" + c.rut.slice(-1)], ["WhatsApp", c.whatsapp], ["Correo electrónico", c.email]].map(([label, value]) => <div className={styles.field} key={label}><span>{label}</span><strong className={styles.profileValue}>{value}</strong></div>)}
      </div>
      <p className={`${styles.small} ${styles.muted} ${styles.section}`}>Para corregir tus datos, contacta a la óptica. La cédula se revisa presencialmente, sin guardar copia.</p>
    </details>
  </>;
}
