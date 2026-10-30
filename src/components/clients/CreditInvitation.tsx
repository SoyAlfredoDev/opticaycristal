import Link from "next/link";
import { BadgeCheck, ShoppingBag } from "lucide-react";
import type { CustomerProfile } from "@/lib/clients/types";
import { clp } from "@/lib/clients/types";
import styles from "./ClientSpace.module.css";

export type CreditSummary = Pick<CustomerProfile, "credit" | "tier">;

export function CreditInvitation({ customer, installmentsOnly }: { customer: CreditSummary; installmentsOnly: boolean }) {
  const { credit, tier } = customer;
  return (
    <section className={`${styles.panel} ${styles.section} ${styles.creditInvitation}`}>
      <span className={styles.invitationIcon} aria-hidden="true">{installmentsOnly ? <BadgeCheck size={26} /> : <ShoppingBag size={26} />}</span>
      <h2>{installmentsOnly ? "¡Estás al día!" : "Tu próxima mirada te espera"}</h2>
      <p className={styles.muted}>{installmentsOnly ? "No tienes cuotas pendientes." : "Aún no registras compras. Aprovecha tu cupo aprobado."}</p>
      <p className={styles.balanceLabel}>Cupo disponible</p>
      <div className={styles.money}>{clp(credit.capacity)}</div>
      <p className={styles.invitationTerms}>Hasta el {tier.maxPercent}% de tu compra · Siempre con pie.</p>
      {credit.enabled ? (
        <><p className={styles.small}>Disfruta tu crédito en la óptica.</p><Link className={`${styles.button} ${styles.primary}`} href="/credito-directo#visita">Visítanos en la óptica</Link></>
      ) : (
        <><p className={styles.small}>Tu cupo está asignado. Verifica tu correo para usarlo.</p><Link className={`${styles.button} ${styles.primary}`} href="/mi-cuenta/perfil">Verificar mi correo</Link></>
      )}
    </section>
  );
}
