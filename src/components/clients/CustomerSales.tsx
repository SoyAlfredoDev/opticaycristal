"use client";
import { useRef, useState } from "react";
import type { CustomerHistoryPage, HistorySale } from "@/lib/clients/history-types";
import { useCustomerData } from "./CustomerDataProvider";
import { CustomerDataState, CustomerSkeleton } from "./CustomerDataState";
import { SalesHistory, NextPayment } from "./SalesHistory";
import { CreditInvitation } from "./CreditInvitation";
import { CustomerPayments } from "./CustomerPayments";
import { useCustomerPage } from "./useCustomerPage";
import styles from "./ClientSpace.module.css";
export function CustomerSales({ installmentsOnly }: { installmentsOnly:boolean }) {
  const { customer,historyVersion } = useCustomerData();
  // A new server version resets pagination: a new sale must not shift an old page.
  return <History key={`${installmentsOnly}:${historyVersion}`} customerReady={!!customer} installmentsOnly={installmentsOnly}/>;
}
function History({ customerReady,installmentsOnly }: { customerReady:boolean; installmentsOnly:boolean }) {
  const { customer,historyVersion } = useCustomerData();
  const [cursors,setCursors] = useState<(string|null)[]>([null]);
  const top = useRef<HTMLDivElement>(null);
  const count = customer ? installmentsOnly ? customer.activity.creditCount : customer.activity.purchaseCount : null;
  const cursor = cursors[cursors.length-1];
  const params = new URLSearchParams({ cuotas:installmentsOnly?"1":"0" });
  if (cursor) params.set("cursor",cursor);
  const { data,error,loading,refresh } = useCustomerPage<CustomerHistoryPage>(customerReady&&count ? `/api/clientes/compras?${params}` : null);
  if (!customer) return <CustomerDataState/>;
  const invitation = customer.credit.principalOutstanding===0 && (installmentsOnly || count===0);
  const changePage = (next:(string|null)[]) => { setCursors(next); top.current?.scrollIntoView({block:"start"}); };
  return <div ref={top}>
    {invitation && cursors.length===1 && <CreditInvitation customer={customer} installmentsOnly={installmentsOnly}/>}
    {installmentsOnly && customer.activity.nextInstallment && <NextPayment installment={customer.activity.nextInstallment}/>}
    {error && <p role="alert">{error} <button className={styles.textLink} onClick={refresh}>Reintentar</button></p>}
    {!data && loading && <CustomerSkeleton/>}
    {data && <SalesHistory sales={data.sales} installmentsOnly={installmentsOnly} overview={false} renderPayments={sale=><CustomerPayments key={`${sale.id}:${historyVersion}`} sale={sale as HistorySale}/>}/>}
    {(cursors.length>1||data?.nextCursor) && <nav aria-label="Páginas del historial" className={`${styles.actions} ${styles.section}`}>
      <button className={styles.button} disabled={cursors.length===1} onClick={()=>changePage(cursors.slice(0,-1))}>Anterior</button>
      <span className={`${styles.small} ${styles.muted}`}>Página {cursors.length}</span>
      <button className={styles.button} disabled={!data?.nextCursor||loading} onClick={()=>data?.nextCursor&&changePage([...cursors,data.nextCursor])}>Siguiente</button>
    </nav>}
  </div>;
}
