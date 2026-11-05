'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import s from './Survey.module.css';
const questions = [['attention', '¿Cómo calificas la atención recibida?'], ['platform', '¿Qué tan fácil fue usar tu cuenta y consultar tu crédito?'], ['product', '¿Cómo calificas la calidad de tus lentes o producto?']] as const;
export function SurveyForm({ token }: {
    token: string;
}) {
    const [state, setState] = useState('loading'), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    useEffect(() => { const c = new AbortController(); fetch('/api/encuestas/' + encodeURIComponent(token), { cache: 'no-store', signal: c.signal }).then(async (r) => { const j = await r.json(); if (!r.ok)
        throw Error(j.error); setState(j.answered ? 'thanks' : 'form'); }).catch(e => { if (!c.signal.aborted) {
        setError(e.message);
        setState('error');
    } }); return () => c.abort(); }, [token]);
    return <main id="contenido-principal" className={s.page}><section className={s.card}><Image unoptimized src="/images/home/oc-logo-oficial.png" width="150" height="77" alt="Óptica & Cristal" className={s.logo}/>{state === 'thanks' ? <div className={s.thanks}><div className={s.check} aria-hidden="true">✓</div><h1>¡Gracias por compartir tu experiencia!</h1><p>Tu opinión nos ayuda a mejorar.</p><Link href="/">Volver a la web</Link></div> : <><h1>Tu experiencia importa</h1><p className={s.muted}>Tres preguntas para seguir mejorando contigo.</p>{state === 'loading' && <p role="status">Preparando tu encuesta…</p>}{error && <p role="alert">{error}</p>}{state === 'form' && <form onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const score = (k: string) => f.get(k) === 'na' ? null : Number(f.get(k)); setBusy(true); setError(''); try {
        const r = await fetch('/api/encuestas/' + encodeURIComponent(token), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attention: score('attention'), platform: score('platform'), product: score('product'), kind: f.get('kind') || null, comment: f.get('comment') }) });
        const j = await r.json();
        if (!r.ok)
            throw Error(j.error);
        setState('thanks');
    }
    catch (err) {
        setError(err instanceof Error ? err.message : 'Intenta nuevamente.');
    }
    finally {
        setBusy(false);
    } }}>{questions.map(([key, label]) => <fieldset key={key} className={s.question} disabled={busy}><legend>{label}</legend><div className={s.choices}>{[1, 2, 3, 4, 5].map(n => <label className={s.option} key={n}><input required type="radio" name={key} value={n} aria-label={`${n} de 5: ${label}`}/><span>{n} ★</span></label>)}</div><p className={s.muted}>{key === 'platform' ? '1: Muy difícil · 5: Muy fácil' : '1: Muy mala · 5: Excelente'}</p>{key !== 'attention' && <label className={s.na}><input type="radio" name={key} value="na"/>{key === 'platform' ? ' Aún no la he usado' : ' Aún no lo he recibido/probado'}</label>}</fieldset>)}<div className={s.comment}><label htmlFor="kind">Sugerencia o reclamo (opcional)</label><select id="kind" name="kind" disabled={busy}><option value="">Selecciona una opción</option><option value="suggestion">Sugerencia</option><option value="complaint">Reclamo</option></select><label htmlFor="comment">Cuéntanos más</label><textarea id="comment" name="comment" rows={4} maxLength={2000} disabled={busy}/></div><p className={s.muted}>Tus respuestas serán revisadas por la óptica para mejorar la atención. No incluyas contraseñas ni datos bancarios.</p><button className={s.submit} disabled={busy}>{busy ? 'Guardando…' : 'Enviar mi opinión'}</button></form>}</>}</section></main>;
}
