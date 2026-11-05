'use client';
import { useEffect, useState } from 'react';
import s from './Survey.module.css';
type Row = {
    id: string;
    name: string;
    product_name: string;
    state: string;
    sent_at: string | null;
    opened_at: string | null;
    visited_at: string | null;
    responded_at: string | null;
    attention: number | null;
    platform: number | null;
    product: number | null;
    comment_kind: string | null;
    comment: string;
};
type Data = {
    hasMore: boolean;
    summary: Record<string, string | number | null>;
    items: Row[];
};
export function AdminSurveys() { const [offset, setOffset] = useState(0), [data, setData] = useState<Data | null>(null), [error, setError] = useState(''); useEffect(() => { const c = new AbortController(); fetch('/api/admin/encuestas?offset=' + offset, { cache: 'no-store', signal: c.signal }).then(async (r) => { const j = await r.json(); if (!r.ok)
    throw Error(j.error); setData(j); setError(''); }).catch(e => { if (!c.signal.aborted)
    setError(e.message); }); return () => c.abort(); }, [offset]); return <>{error && <p role="alert">{error}</p>}{!data && <p role="status">Cargando encuestas…</p>}{data && <><div className={s.stats}>{[['total', 'Invitaciones'], ['sent', 'Correos enviados'], ['opened', 'Aperturas aproximadas'], ['visited', 'Enlaces visitados'], ['answered', 'Respuestas'], ['attention', 'Atención / 5'], ['platform', 'Plataforma / 5'], ['product', 'Producto / 5']].map(([k, label]) => <div key={k}><strong>{data.summary[k] ?? '—'}</strong><div>{label}</div></div>)}</div><p className={s.muted}>Las aperturas y visitas pueden incluir precargas automáticas. «Enviado» indica aceptación del proveedor; no garantiza recepción. Las opciones «aún no» se excluyen de los promedios.</p><div className={s.list}>{data.items.map(r => <article key={r.id} className={s.response}><h2>{r.name}</h2><p>{r.product_name}</p><p>{r.responded_at ? 'Respondida' : r.state === 'sent' ? 'Esperando respuesta' : ({ pending: 'Programada', processing: 'Envío en verificación', failed: 'Revisar envío', skipped: 'Omitida' }[r.state] || r.state)} · Correo {r.sent_at ? 'enviado' : 'pendiente'} · Apertura {r.opened_at ? 'detectada' : 'sin detectar'} · Enlace {r.visited_at ? 'visitado' : 'sin visita'}</p>{r.responded_at && <><p>Atención: {r.attention}/5 · Plataforma: {r.platform === null ? 'No usada' : r.platform + '/5'} · Producto: {r.product === null ? 'No probado' : r.product + '/5'}</p>{r.comment && <p><strong>{r.comment_kind === 'complaint' ? 'Reclamo' : 'Sugerencia'}:</strong> {r.comment}</p>}</>}</article>)}</div>{!data.items.length && <p>Aún no hay encuestas. Se programarán con las nuevas ventas a crédito.</p>}<div className={s.pager}><button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 25))}>Anterior</button><button disabled={!data.hasMore} onClick={() => setOffset(offset + 25)}>Siguiente</button></div></>}</>; }
