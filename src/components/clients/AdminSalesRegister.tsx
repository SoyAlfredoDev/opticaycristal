"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Plus, RefreshCw, Search } from "lucide-react";
import { clp } from "@/lib/clients/types";
import { SALES_PAGE_SIZE, type AdminSalePage, type AdminSaleRow } from "@/lib/clients/sales-register-types";
import { SaleCommitmentUpload } from "./SaleCommitmentUpload";
import { OperationRecovery } from "./OperationRecovery";
import styles from "./AdminSalesRegister.module.css";
import wizard from "./AdminSales.module.css";

const date = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" });
function status(sale: AdminSaleRow) {
  return sale.status === "cancelled" ? "Anulada" : sale.remaining > 0 ? "Pendiente" : "Pagada";
}

export function AdminSalesRegister({ seller = false }: { seller?: boolean }) {
  const [data, setData] = useState<AdminSalePage | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/clientes/ventas/historial?q=${encodeURIComponent(query)}&offset=${offset}`,
      { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No pudimos cargar las ventas.");
        if (!controller.signal.aborted) { setData(result); setError(""); }
      })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, offset, revision]);

  function refresh() {
    setLoading(true);
    setRevision(value => value + 1);
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft.trim());
    setOffset(0);
    refresh();
  }
  function page(next: number) { setOffset(next); refresh(); }

  return <>
    <div className={wizard.titleRow}>
      <div><h1>Ventas</h1><p className={styles.intro}>{seller ? "Ventas registradas con tu acceso." : "Historial de ventas de la óptica."}</p></div>
      <Link href="/admin/clientes/ventas/nueva" className={wizard.primary}><Plus size={18} aria-hidden="true" />Registrar venta</Link>
    </div>
    <OperationRecovery kind="create" />
    <section className={styles.register} aria-label="Listado de ventas">
      <div className={styles.toolbar}>
        <form className={styles.search} onSubmit={search}>
          <label htmlFor="sale-search">Buscar por cliente, producto o control</label>
          <div><input id="sale-search" value={draft} onChange={event => setDraft(event.target.value)} maxLength={100} />
            <button className={wizard.secondary} disabled={loading}><Search size={17} aria-hidden="true" />Buscar</button></div>
        </form>
        <button className={wizard.secondary} disabled={loading} onClick={refresh}><RefreshCw size={16} aria-hidden="true" />Actualizar</button>
      </div>
      {loading ? <p className={styles.empty} role="status">Cargando ventas…</p> :
        error ? <p role="alert" className={styles.error}>{error}</p> :
          !data?.sales.length ? <p className={styles.empty}>{query ? "No hay ventas que coincidan con la búsqueda." : "Aún no hay ventas registradas."}</p> :
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>Ventas registradas y su número de control interno</caption>
                <thead><tr><th>Fecha</th><th>Cliente y producto</th><th>Control interno</th><th>Total</th><th>Saldo</th><th>Estado</th><th>Compromiso</th><th><span className={styles.srOnly}>Acciones</span></th></tr></thead>
                <tbody>{data.sales.map(sale => <tr key={sale.id}>
                    <td data-label="Fecha">{date.format(new Date(sale.createdAt))}</td>
                    <td data-label="Cliente y producto"><strong>{sale.customerName}</strong><span className={styles.product}>{sale.productName}</span></td>
                    <td data-label="Control interno"><span className={styles.control}>{sale.controlNumber ?? "Sin control histórico"}</span></td>
                    <td data-label="Total"><strong>{clp(sale.total)}</strong><span className={styles.product}>{sale.credit ? "Crédito" : "Contado"}</span>{sale.creditOverride&&<details className={styles.overrideAudit}><summary>Cupo máximo aplicado</summary><p>{sale.creditOverride.reason}</p><p>Por nivel: {clp(sale.creditOverride.standardCredit)} · Aplicado: {clp(sale.creditOverride.appliedCredit)}</p><p>{sale.creditOverride.actor} · {date.format(new Date(sale.creditOverride.createdAt))}</p></details>}</td>
                    <td data-label="Saldo">{sale.status === "cancelled" ? "—" : clp(sale.remaining)}</td>
                    <td data-label="Estado"><span className={styles.status} data-status={status(sale)}>{status(sale)}</span></td>
                    <td data-label="Compromiso"><SaleCommitmentUpload sale={sale} onUploaded={file => setData(current => current ? {...current, sales: current.sales.map(row => row.id === sale.id ? {...row, commitmentFile: file} : row)} : current)} /></td>
                    <td><Link className={styles.saleLink} href={`/admin/clientes/${encodeURIComponent(sale.customerId)}?venta=${encodeURIComponent(sale.id)}#venta-${encodeURIComponent(sale.id)}`}>
                      Ver ficha <ArrowRight size={15} aria-hidden="true" /></Link></td>
                  </tr>
                  )}</tbody>
              </table>
            </div>}
      <div className={styles.pagination}>
        <button className={wizard.secondary} disabled={loading || !!error || offset === 0} onClick={() => page(Math.max(0, offset - SALES_PAGE_SIZE))}>Anterior</button>
        <span>Página {Math.floor(offset / SALES_PAGE_SIZE) + 1}</span>
        <button className={wizard.secondary} disabled={loading || !!error || !data?.hasMore || offset + SALES_PAGE_SIZE > 10000}
          onClick={() => page(offset + SALES_PAGE_SIZE)}>Siguiente</button>
      </div>
    </section>
  </>;
}
