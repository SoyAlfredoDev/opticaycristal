"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { logoutAction } from "@/app/admin/actions";
import { ORDER_STATUSES, type OrderStatus, type PurchaseOrder } from "@/lib/orders/types";

const labels: Record<OrderStatus, string> = { nuevo: "Nuevo", contactado: "Contactado", cotizado: "Cotizado", cerrado: "Cerrado" };
function dateLabel(value: string) { return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(value)); }

export function OrdersPanel({ orders, errorCarga, mysqlConfigured }: { orders: PurchaseOrder[]; errorCarga: string | null; mysqlConfigured: boolean }) {
  const [query, setQuery] = useState("");
  const [localOrders, setLocalOrders] = useState(orders);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es-CL");
    return localOrders.filter((order) => [order.customer.name, order.customer.email, order.customer.phone, order.customer.comuna, ...order.items.map((item) => item.title)].join(" ").toLocaleLowerCase("es-CL").includes(q));
  }, [localOrders, query]);

  async function changeStatus(id: string, status: OrderStatus) {
    setPending(id); setNotice("");
    try {
      const response = await fetch(`/api/pedidos/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!response.ok) { const result = await response.json() as { error?: string }; throw new Error(result.error ?? "No se pudo actualizar el estado."); }
      setLocalOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo actualizar el pedido."); }
    finally { setPending(null); }
  }

  return <div className="min-h-dvh bg-warm text-text-primary">
    <header className="border-b border-border bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Panel interno</p><p className="mt-1 text-sm font-semibold text-brand-dark">Óptica &amp; Cristal</p></div>
      <nav aria-label="Administración" className="flex items-center gap-4 text-sm font-semibold"><Link href="/admin" className="text-text-secondary hover:text-brand-dark">Solicitudes</Link><Link href="/admin/pedidos" aria-current="page" className="text-primary">Pedidos</Link><Link href="/admin/radar" className="text-text-secondary hover:text-brand-dark">Radar B2B</Link></nav>
      <form action={logoutAction}><button type="submit" className="min-h-11 px-3 text-sm font-semibold text-text-secondary">Cerrar sesión</button></form>
    </div></header>
    <main id="contenido-principal" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Pedidos y ventas</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">Solicitudes de compra del catálogo. Confirma precio y disponibilidad con cada cliente.</p></div><p className="text-sm font-semibold text-brand-dark">{localOrders.length} {localOrders.length === 1 ? "pedido" : "pedidos"}</p></div>
      <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">El catálogo aún no tiene precios ni inventario conectado. Estos registros son solicitudes para cotizar; no son ventas cobradas.</p>
      {!mysqlConfigured && <p className="mt-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm leading-relaxed text-text-secondary">El registro está en un archivo local. Configura MySQL del hosting antes de recibir pedidos reales para conservarlos de forma duradera.</p>}
      {errorCarga && <p role="alert" className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary">{errorCarga}</p>}
      {notice && <p role="alert" className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary">{notice}</p>}
      <label className="mt-6 block"><span className="sr-only">Buscar pedidos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, correo o producto" className="min-h-12 w-full rounded-full border border-border bg-white px-5 text-sm outline-none focus:border-primary sm:max-w-xl" /></label>
      {filtered.length ? <div className="mt-6 space-y-4">{filtered.map((order) => <article key={order.id} className="rounded-[1.25rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold text-brand-dark">{order.customer.name}</h2><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950">{labels[order.status]}</span></div><p className="mt-1 text-sm text-text-secondary">{order.customer.email} · {order.customer.phone}</p><p className="mt-1 text-sm text-text-secondary">{order.customer.comuna} · {order.customer.address}</p></div><div className="flex flex-col gap-2 md:items-end"><time className="text-xs text-text-tertiary">{dateLabel(order.createdAt)}</time><label className="text-xs text-text-secondary">Estado<select aria-label={`Estado del pedido de ${order.customer.name}`} value={order.status} disabled={pending === order.id} onChange={(event) => void changeStatus(order.id, event.target.value as OrderStatus)} className="ml-2 min-h-10 rounded-full border border-border bg-white px-3 text-sm font-semibold text-brand-dark">{ORDER_STATUSES.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label></div></div>
        <ul className="mt-4 grid gap-3 border-t border-border-soft pt-4 sm:grid-cols-2">{order.items.map((item) => <li key={item.productId} className="flex items-center gap-3"><Image src={item.image} alt="" width={72} height={58} className="h-[58px] w-[72px] object-cover" /><span className="text-sm font-semibold text-brand-dark">{item.title} <span className="font-normal text-text-secondary">× {item.quantity}</span></span></li>)}</ul>
        {order.customer.comments && <p className="mt-3 text-sm text-text-secondary">Comentario: {order.customer.comments}</p>}
      </article>)}</div> : <div className="mt-8 rounded-[1.25rem] border border-dashed border-border bg-white px-6 py-16 text-center"><p className="text-base font-semibold text-brand-dark">{localOrders.length ? "No encontramos coincidencias" : "Todavía no hay pedidos"}</p><p className="mt-2 text-sm text-text-secondary">Los nuevos pedidos enviados desde el carro aparecerán aquí.</p></div>}
    </main>
  </div>;
}
