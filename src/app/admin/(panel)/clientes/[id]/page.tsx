import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminCustomerCategory } from "@/components/clients/AdminCustomerCategory";
import { getCategorySettings } from "@/lib/clients/categories";
import { customerAdminSession,canManageCustomerCategories } from "@/lib/clients/admin";
import { getCustomerProfile } from "@/lib/clients/store";
import { OperationRecovery } from "@/components/clients/OperationRecovery";
import { SaleControls } from "@/components/clients/SaleControls";
import { SalesHistory } from "@/components/clients/SalesHistory";
import { RecordPayment } from "@/components/clients/RecordPayment";
import { clp } from "@/lib/clients/types";
import styles from "@/components/clients/ClientSpace.module.css";
export const dynamic = "force-dynamic";
export default async function AdminCustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff=await customerAdminSession();
  if (!staff) return <AdminAccessDenied/>;
  const { id } = await params;
  if (id.length > 100) notFound();
  const c = await getCustomerProfile(id);if (!c) notFound();
  const categorySettings=await getCategorySettings(id);
  return <div className={styles.space}><main className={styles.main} id="contenido-principal"><Link className={`${styles.textLink} ${styles.back}`} href="/admin/clientes">← Volver a clientes</Link><div className={styles.adminHead}><div><h1>{c.firstName} {c.lastName}</h1><span className={styles.muted}>Cuenta de cliente particular</span></div><span className={styles.pill}>{c.tier.name}</span></div><div className={styles.grid}><section className={styles.panel}><h2>Ficha del cliente</h2><dl className={styles.details}>{[["Nombre",c.firstName],["Apellido",c.lastName],["RUT",c.rut.slice(0,-1)+"-"+c.rut.slice(-1)],["Correo",c.email],["WhatsApp",c.whatsapp],["Fecha de registro",new Intl.DateTimeFormat("es-CL",{dateStyle:"medium",timeZone:"America/Santiago"}).format(new Date(c.createdAt))]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className={`${styles.statusStack} ${styles.section}`}><span className={`${styles.pill} ${c.emailVerified?styles.verified:styles.pending}`}>Correo {c.emailVerified?"verificado":"pendiente"}</span><span className={`${styles.pill} ${c.whatsappVerified?styles.verified:styles.pending}`}>WhatsApp {c.whatsappVerified?"verificado":"pendiente"}</span></div><p className={`${styles.small} ${styles.muted} ${styles.section}`}>El cliente puede verificar WhatsApp desde Perfil cuando la conexión esté habilitada; sigue siendo opcional para el crédito. No se guardan copias de cédulas.</p></section><section className={`${styles.panel} ${styles.finance}`}><p className={styles.small}>MÁXIMO ASIGNADO · {c.tier.name.toUpperCase()}</p><div className={styles.money}>{clp(c.tier.maxAmount)}</div><div className={styles.line}><span>Capital pendiente</span><strong>{clp(c.credit.principalOutstanding)}</strong></div><div className={styles.line}><span>Capacidad por saldo</span><strong>{clp(c.credit.capacity)}</strong></div><div className={styles.line}><span>Disponible para utilizar</span><strong>{clp(c.credit.available)}</strong></div>{c.credit.principalOutstanding>0&&<p className={styles.small}>Financiamiento en curso. No se habilita otro hasta liquidar el saldo.</p>}<p className={styles.small}>Hasta {c.tier.maxPercent}% · {c.tier.maxInstallments} cuota{c.tier.maxInstallments>1?"s":""} · Siempre con pie.</p>{!c.credit.enabled&&<p className={styles.small}>La cuenta tiene cupo asignado. Su uso está pendiente hasta verificar el correo.</p>}</section></div><AdminCustomerCategory customerId={id} initial={categorySettings} canEdit={canManageCustomerCategories(staff.u)}/><section className={`${styles.panel} ${styles.section}`}><h2>Historial de compras</h2><Link href="/admin/clientes/ventas" className={styles.button}>Registrar venta</Link><OperationRecovery kind="payment"/><SalesHistory sales={c.purchases} admin />{c.purchases.map(s=><SaleControls key={s.id} sale={s}/>)}{c.purchases.filter(s=>s.remaining>0).map(s=><RecordPayment key={`${s.id}:${s.remaining}`} saleId={s.id} remaining={s.remaining}/>)}</section></main></div>;
}
