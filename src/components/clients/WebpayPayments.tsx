"use client";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { products } from '@/components/optica/catalog';
import { clp } from '@/lib/clients/types';
import styles from './ClientSpace.module.css';
type Payment = {
    customerName?: string;
    reference?: string;
    id: string;
    kind: string;
    description: string;
    amount: number;
    principal: number;
    interest: number;
    state: string;
};
type Data = {
    enabled: boolean;
    payments: Payment[];
    sales?: {
        id: string;
        description: string;
        remaining: number;
    }[];
};
const labels: Record<string, string> = { quoted: 'Listo para pagar', creating: 'Preparando pago', ready: 'Pago iniciado', confirming: 'Verificando', unknown: 'En verificación: no repitas el pago', review: 'Revisión de la óptica: no repitas el pago', paid: 'Pago registrado', cancelled: 'Cancelado', rejected: 'No autorizado' };
export function WebpayPayments({ admin = false }: {
    admin?: boolean;
}) {
    const titleId = useId();
    const endpoint = admin ? '/api/admin/webpay' : '/api/clientes/webpay';
    const [data, setData] = useState<Data | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [selected, setSelected] = useState<Payment | null>(null);
    const keys = useRef(new Map<string, string>()), dialog = useRef<HTMLDialogElement>(null), params = useSearchParams();
    const key = (kind: string) => { let k = keys.current.get(kind); if (!k) {
        k = crypto.randomUUID();
        keys.current.set(kind, k);
    } return k; };
    const refresh = useCallback(async () => { try {
        const r = await fetch(endpoint, { cache: 'no-store' }), j = await r.json();
        if (!r.ok)
            throw Error(j.error?.message || 'No pudimos cargar los pagos.');
        if (!Array.isArray(j.payments) || typeof j.enabled !== 'boolean')
            throw Error('Respuesta de pagos no válida.');
        setData(j);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'No pudimos cargar los pagos.');
    } }, [endpoint]);
    useEffect(() => { const controller = new AbortController(); fetch(endpoint, { cache: 'no-store', signal: controller.signal }).then(async (r) => { const j = await r.json(); if (!r.ok)
        throw Error(j.error?.message || 'No pudimos cargar los pagos.'); if (!Array.isArray(j.payments) || typeof j.enabled !== 'boolean')
        throw Error('Respuesta de pagos no válida.'); setData(j); }).catch(e => { if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'No pudimos cargar los pagos.'); }); return () => controller.abort(); }, [endpoint]);
    useEffect(() => { if (selected)
        dialog.current?.showModal();
    else
        dialog.current?.close(); }, [selected]);
    async function post(body: unknown) { setBusy(true); setError(''); try {
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), j = await r.json();
        if (!r.ok)
            throw Error(j.error?.message || 'No se pudo completar la solicitud.');
        return j;
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Revisa el estado antes de volver a pagar.');
        return null;
    }
    finally {
        setBusy(false);
    } }
    async function credit(saleId: string, mode: string) { const r = await post({ action: 'credit', saleId, mode, requestKey: key(saleId + mode) }); if (r) {
        setSelected(r.payment);
        void refresh();
    } }
    async function pay(p: Payment) { const r = await post({ action: 'start', id: p.id }); if (!r)
        return; const form = document.createElement('form'); form.method = 'POST'; form.action = r.url; const input = document.createElement('input'); input.type = 'hidden'; input.name = 'token_ws'; input.value = r.token; form.append(input); document.body.append(form); form.submit(); }
    return <>
 {error && <p role="alert">{error} <button className={styles.textLink} onClick={() => void refresh()}>Actualizar estado</button></p>}
 {!data && <p role="status">Cargando pagos…</p>}
 {data && !data.enabled && <p className={styles.muted}>Webpay Plus está pendiente de activación. Los pagos en el local y por transferencia siguen disponibles.</p>}
 {!admin && params.get('resultado') && <p role="status">El resultado confirmado aparece en tu historial. Si figura en verificación, evita pagar nuevamente y contacta a la óptica.</p>}
 {admin && <form className={`${styles.panel} ${styles.form}`} onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const r = await post({ rut: f.get('rut'), productId: f.get('productId'), quantity: Number(f.get('quantity')), total: Number(f.get('total')), confirmed: f.get('confirmed') === 'on', requestKey: key('catalog') }); if (r) {
            keys.current.delete('catalog');
            form.reset();
            void refresh();
        } }}>
 <h2>Cobro de catálogo</h2><p className={styles.small}>Confirma el precio con el cliente antes de generar el cobro. El cliente lo verá en Mi cuenta → Pagos.</p>
 <label className={styles.field}>RUT del cliente registrado<input name="rut" className={styles.input} required maxLength={20}/></label>
 <label className={styles.field}>Producto<select name="productId" className={styles.input}>{products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
 <label className={styles.field}>Cantidad<input name="quantity" type="number" min="1" max="100" defaultValue="1" required className={styles.input}/></label>
 <label className={styles.field}>Total acordado con IVA, en pesos<input name="total" type="number" min="1" max="1000000000" required className={styles.input}/></label>
 <label><input name="confirmed" type="checkbox" required/> Confirmé el precio y disponibilidad con el cliente.</label>
 <button className={`${styles.button} ${styles.primary}`} disabled={busy}>Generar cobro</button></form>}
 {!admin && data?.sales?.map(s => <section className={`${styles.panel} ${styles.section}`} key={s.id}><h2>{s.description}</h2><p>Capital pendiente: {clp(Number(s.remaining))}</p><div className={styles.actions}><button className={styles.button} disabled={busy || !data.enabled} onClick={() => void credit(s.id, 'next')}>Pagar próxima cuota</button><button className={styles.button} disabled={busy || !data.enabled} onClick={() => void credit(s.id, 'balance')}>Pagar saldo total</button></div></section>)}
 {data?.payments.map(p => <section className={`${styles.panel} ${styles.section}`} key={p.id}><div className={styles.line}><h2>{p.description}</h2><strong>{clp(p.amount)}</strong></div>{admin && <p>{p.customerName} · {p.reference}</p>}<p>{labels[p.state] || 'Consultar estado'}</p>
 {admin && ['ready', 'unknown', 'confirming'].includes(p.state) && <button className={styles.button} disabled={busy} onClick={async () => { await post({ action: 'reconcile', id: p.id }); void refresh(); }}>Consultar resultado con Transbank</button>}
 {!admin && data.enabled && ['quoted', 'ready'].includes(p.state) && <button className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => setSelected(p)}>Ver y pagar</button>}
 </section>)}
 {data && !data.payments.length && <p>Aún no hay cobros Webpay.</p>}
 <dialog aria-labelledby={titleId} ref={dialog} className={styles.panel} onCancel={() => setSelected(null)} style={{ maxWidth: 'min(520px, 92vw)', padding: '24px' }}>{selected && <><h2 id={titleId}>Confirmar pago</h2><p>{selected.description}</p><p className={styles.money}>{clp(selected.amount)}</p>{selected.kind === 'credit' && <p>Capital {clp(selected.principal)} · Mora {clp(selected.interest)}</p>}<p>Continuarás al sitio seguro de Webpay Plus para pagar.</p>{error && <p role="alert">{error}</p>}<div className={styles.actions}><button className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => void pay(selected)}>Ir a Webpay</button><button className={styles.button} disabled={busy} onClick={() => setSelected(null)}>Volver</button>{selected.kind === 'credit' && selected.state === 'quoted' && <button className={styles.textLink} disabled={busy} onClick={async () => { const r = await post({ action: 'cancel', id: selected.id }); if (r) {
        setSelected(null);
        keys.current.clear();
        void refresh();
    } }}>Cancelar este intento</button>}</div></>}</dialog>
 </>;
}
