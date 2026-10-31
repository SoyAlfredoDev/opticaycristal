"use client";
import { useState } from "react";
import type { HistorySale, CustomerPaymentPage } from "@/lib/clients/history-types";
import { clp } from "@/lib/clients/types";
import { useCustomerPage } from "./useCustomerPage";
import styles from "./ClientSpace.module.css";
export function CustomerPayments({ sale }: { sale:HistorySale }) {
  const [cursors,setCursors] = useState<(string|null)[]>([null]);
  const current = cursors[cursors.length-1];
  const { data,error,loading,refresh } = useCustomerPage<CustomerPaymentPage>(current ? `/api/clientes/compras/${encodeURIComponent(sale.id)}/pagos?cursor=${encodeURIComponent(current)}` : null);
  const page = current ? data : { payments:sale.payments, nextCursor:sale.paymentsNextCursor };
  if (!sale.payments.length) return null;
  return <><h3>Pagos</h3>{page?.payments.map(payment=><p className={styles.small} key={payment.id}>{payment.paidOn.split("-").reverse().join("/")} · {clp(payment.amount)}{payment.reversed?" · Revertido":""}<br/>{payment.reference}</p>)}
    {error && <p role="alert">{error} <button className={styles.textLink} onClick={refresh}>Reintentar</button></p>}
    {loading && <p role="status">Cargando pagos…</p>}
    {(cursors.length>1||page?.nextCursor) && <nav aria-label="Páginas de pagos" className={`${styles.actions} ${styles.section}`}>
      <button className={styles.button} disabled={cursors.length===1} onClick={()=>setCursors(c=>c.slice(0,-1))}>Anteriores</button>
      <span className={styles.small}>Página {cursors.length}</span>
      <button className={styles.button} disabled={!page?.nextCursor||loading} onClick={()=>page?.nextCursor&&setCursors(c=>[...c,page.nextCursor])}>Siguientes</button>
    </nav>}
  </>;
}
