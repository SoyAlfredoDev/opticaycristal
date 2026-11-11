import type { ReactNode } from "react";
import Link from "next/link";
import { CreditInvitation, type CreditSummary } from "./CreditInvitation";
import type { CustomerSale } from "@/lib/clients/sales-types";
import { LoanDebtSummary } from "./LoanDebtSummary";
import { clp } from "@/lib/clients/types";
import styles from "./ClientSpace.module.css";
const day=(value:string)=>value.split("-").reverse().join("/");
const dateFormat=new Intl.DateTimeFormat("es-CL",{timeZone:"America/Santiago",dateStyle:"medium"});
const todayFormat=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit"});
export function SalesHistory({sales,admin=false,installmentsOnly=false,customer,overview=true,renderPayments}:{sales:CustomerSale[];admin?:boolean;installmentsOnly?:boolean;customer?:CreditSummary;overview?:boolean;renderPayments?:(sale:CustomerSale)=>ReactNode}){
 const visible=installmentsOnly?sales.filter(s=>s.credit>0):sales;
 const invite=overview&&!admin&&customer&&customer.credit.principalOutstanding===0&&(
  installmentsOnly?visible.every(s=>s.status==="cancelled"||s.remaining===0):sales.length===0
 )?<CreditInvitation customer={customer} installmentsOnly={installmentsOnly}/>:null;
 if(!visible.length&&invite)return invite;
 if(!visible.length)return <section className={`${styles.panel} ${styles.section}`}><p>{installmentsOnly?"Aún no tienes cuotas.":"Aún no hay compras."}</p></section>;
 const today=todayFormat.format(new Date());
 const upcoming=overview&&installmentsOnly?visible.filter(s=>s.status!=="cancelled").flatMap(s=>s.installments.filter(i=>i.paid<i.amount)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]:undefined;
 return <>{invite}{overview&&installmentsOnly&&upcoming&&<NextPayment installment={upcoming}/>}{visible.map(s=><section id={`venta-${s.id}`} key={s.id} className={`${styles.panel} ${styles.section}`}><div className={styles.line}><h2>{s.productName}</h2><span className={styles.pill}>{s.status==="cancelled"?"Anulada":s.remaining?"En curso":"Pagada"}</span></div>
 {s.status==="cancelled"?<p>Devolución de {clp(s.deposit)} a coordinar con la óptica.</p>:<>{s.credit>0&&<><div className={styles.line}><span>Saldo de capital</span><strong>{clp(s.remaining)}</strong></div>{s.installments.map(i=><div className={styles.line} key={i.id}><span>{day(i.dueDate)}<br/><small>{i.paid===i.amount?"Pagada":i.dueDate<today?"Vencida":i.paid?"Pago parcial":"Pendiente"}</small></span><strong>{clp(i.amount-i.paid)}</strong></div>)}{!admin&&s.remaining>0&&<LoanDebtSummary saleId={s.id}/>}<span className={`${styles.pill} ${s.signedAt?styles.verified:styles.pending}`}>{s.signedAt?"Firma confirmada":"Pendiente de firma"}</span></>}</>}
 {!admin&&s.credit>0&&<p><Link className={styles.textLink} href={`/mi-cuenta/compras/${s.id}/compromiso`}>Ver compromiso de pago</Link></p>}
 <details className={styles.section}><summary>Detalle de la compra</summary><p className={`${styles.small} ${styles.section}`}>{s.quantity} unidad{s.quantity>1?"es":""} · {dateFormat.format(new Date(s.createdAt))}</p><div className={styles.line}><span>Total con IVA</span><strong>{clp(s.total)}</strong></div><p className={styles.small}>Neto {clp(s.net)} · IVA {clp(s.vat)}</p><p>Recibido {s.credit?"de pie":"al contado"}: {clp(s.deposit)}</p>{s.credit>0&&<><p>Crédito original: {clp(s.credit)}</p>{admin&&<Link className={styles.textLink} href={`/admin/clientes/ventas/${s.id}/compromiso`}>Compromiso de pago</Link>}{s.signedAt&&!s.commitmentVersion.startsWith("2026-")&&<p><a className={styles.textLink} href={admin?`/api/admin/clientes/compromisos/respaldo?sale=${encodeURIComponent(s.id)}`:`/api/clientes/compras/${s.id}/compromiso/firmado`}>Descargar copia firmada</a></p>}</>}{renderPayments?renderPayments(s):s.payments.length>0&&<><h3>Pagos</h3>{s.payments.map(p=><p className={styles.small} key={p.id}>{day(p.paidOn)} · {clp(p.totalAmount??p.amount)}{(p.interestAmount??0)>0&&<> · Mora recibida {clp(p.interestAmount??0)}</>}{(p.interestWaived??0)>0&&<> · Mora condonada {clp(p.interestWaived??0)}</>}{p.reversed?" · Revertido":""}<br/>{p.reference}</p>)}</>}</details></section>)}</>;
}

export function NextPayment({installment:i}:{installment:{dueDate:string;amount:number;paid:number}}) {
 const today=todayFormat.format(new Date());
 return <section className={`${styles.panel} ${styles.nextPayment}`}><span className={styles.pill}>{i.dueDate<today?"Cuota vencida":"Próxima cuota"}</span><div className={styles.money}>{clp(i.amount-i.paid)}</div><p>{day(i.dueDate)}</p><p className={styles.small}>Puedes solicitar otro crédito al terminar el actual.</p></section>;
}
