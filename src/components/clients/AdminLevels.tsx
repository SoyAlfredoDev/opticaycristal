"use client";
import { useRef, useState, type FormEvent } from "react";
import { Pencil, ShieldCheck } from "lucide-react";
import type { LevelBenefits, LevelSettings, ManagedLevel } from "@/lib/clients/level-types";
import { clp } from "@/lib/clients/types";
import base from "./ClientSpace.module.css";
import styles from "./AdminLevels.module.css";

const endpoint = "/api/admin/clientes/niveles";
const date = (value: string) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const values = (v: LevelBenefits) => `${v.maxPercent}% · ${clp(v.maxAmount)} · ${v.maxInstallments} cuota${v.maxInstallments === 1 ? "" : "s"}`;

function LevelEditor({ level, onCancel, onSaved, onConflict }: {
  level: ManagedLevel; onCancel: () => void; onSaved: (replayed: boolean) => Promise<void>; onConflict: () => Promise<void>;
}) {
  const [percent, setPercent] = useState(String(level.maxPercent));
  const [amount, setAmount] = useState(String(level.maxAmount));
  const [installments, setInstallments] = useState(String(level.maxInstallments));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const sending = useRef(false), key = useRef("");
  const changed = Number(percent) !== level.maxPercent || Number(amount) !== level.maxAmount || Number(installments) !== level.maxInstallments;
  function edited() { key.current = ""; setError(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || !changed) return;
    sending.current = true; setBusy(true); setError(""); key.current ||= crypto.randomUUID();
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20_000), body: JSON.stringify({ code: level.code, expectedRevision: level.revision, maxPercent: Number(percent), maxAmount: Number(amount), maxInstallments: Number(installments), reason, requestKey: key.current }) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) { await onConflict(); return; }
        throw new Error(data.error || "No pudimos guardar los beneficios.");
      }
      await onSaved(data.replayed === true);
    } catch (error) { setError(error instanceof Error && error.name !== "TimeoutError" ? error.message : "No pudimos confirmar el guardado. Reintenta con los mismos datos."); }
    finally { sending.current = false; setBusy(false); }
  }
  return <form className={styles.editor} aria-label={`Editar beneficios de ${level.name}`} onSubmit={submit}>
    <label className={base.field}>Porcentaje financiable (%)<input className={base.input} type="number" min={1} max={99} step={1} required value={percent} disabled={busy} onChange={e => { setPercent(e.target.value); edited(); }} /></label>
    <label className={base.field}>Cupo máximo (CLP)<input className={base.input} type="number" min={1} max={1_000_000_000} step={1} required value={amount} disabled={busy} onChange={e => { setAmount(e.target.value); edited(); }} /></label>
    <label className={base.field}>Máximo de cuotas<select className={base.input} value={installments} disabled={busy} onChange={e => { setInstallments(e.target.value); edited(); }}>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} {n === 1 ? "cuota" : "cuotas"}</option>)}</select></label>
    <label className={base.field}>Motivo del cambio<textarea className={base.input} minLength={5} maxLength={500} rows={3} required value={reason} disabled={busy} onChange={e => { setReason(e.target.value); edited(); }} /></label>
    <p className={base.small}>Se actualizarán los beneficios vigentes de todos los clientes de este nivel. Las ventas registradas conservan sus condiciones.</p>
    {error && <p role="alert" className={base.error}>{error}</p>}
    <div className={base.actions}><button className={`${base.button} ${base.primary}`} disabled={busy || !changed || reason.trim().length < 5}>{busy ? "Guardando…" : "Guardar beneficios"}</button><button className={base.button} type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>
  </form>;
}

export function AdminLevels({ initial, canEdit }: { initial: LevelSettings; canEdit: boolean }) {
  const [settings, setSettings] = useState(initial), [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const sequence = useRef(0);
  async function load(level: string, cursor: string | null = null) {
    const current = ++sequence.current;
    setBusy(true); setError("");
    try {
      const query = new URLSearchParams();
      if (level) query.set("level", level);
      if (cursor) query.set("cursor", cursor);
      const response = await fetch(`${endpoint}${query.size ? `?${query}` : ""}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No pudimos consultar los niveles.");
      if (sequence.current !== current) return;
      setSettings(previous => ({ ...data.settings, history: cursor ? [...previous.history, ...data.settings.history.filter((item: { id: string }) => !previous.history.some(p => p.id === item.id))] : data.settings.history }));
      setFilter(level);
    } catch (error) { if (sequence.current === current) setError(error instanceof Error && error.name !== "TimeoutError" ? error.message : "No pudimos actualizar la vista. Inténtalo nuevamente."); }
    finally { if (sequence.current === current) setBusy(false); }
  }
  return <>
    <p className={`${base.small} ${styles.info}`}><ShieldCheck size={20} aria-hidden="true" />Beneficio actual: crédito directo sin interés corriente, siempre con pie. Se respetan simultáneamente el porcentaje, el cupo y las cuotas del nivel.</p>
    {!canEdit && <p className={base.muted}>Puedes consultar los beneficios y su historial. La edición está a cargo del responsable autorizado.</p>}
    {notice && <p role="status" className={base.success}>{notice}</p>}
    {error && <p role="alert" className={base.error}>{error} <button className={base.button} type="button" disabled={busy} onClick={() => void load(filter)}>Actualizar vista</button></p>}
    <div className={styles.grid}>{settings.levels.map(level => <section key={level.code} className={`${base.panel} ${styles.card}`} aria-labelledby={`level-${level.code}`}>
      <header className={styles.header}><h2 id={`level-${level.code}`}>{level.name}</h2><span className={base.small}>Versión {level.revision}</span></header>
      <dl className={styles.benefits}><div><dt>Cupo máximo</dt><dd>{clp(level.maxAmount)}</dd></div><div><dt>Porcentaje financiable</dt><dd>Hasta {level.maxPercent}%</dd></div><div><dt>Cuotas mensuales</dt><dd>Hasta {level.maxInstallments}</dd></div></dl>
      {editing === level.code ? <LevelEditor key={`${level.code}:${level.revision}`} level={level} onCancel={() => setEditing(null)} onSaved={async replayed => { setEditing(null); setNotice(replayed ? "El cambio ya estaba registrado." : "Beneficios actualizados. El cambio quedó registrado en el historial."); await load(filter); }} onConflict={async () => { setEditing(null); setNotice("Este nivel cambió mientras editabas. Revisa los valores actuales y vuelve a editar."); await load(filter); }} /> : canEdit && <button className={base.button} type="button" disabled={busy} onClick={() => { setEditing(level.code); setNotice(""); }}><Pencil size={16} aria-hidden="true" />Editar beneficios de {level.name}</button>}
    </section>)}</div>
    <section className={`${base.panel} ${base.section}`} aria-labelledby="level-history-title">
      <div className={styles.historyHeader}><div><h2 id="level-history-title">Historial de modificaciones</h2><p className={base.small}>Valores anteriores y nuevos, motivo y usuario responsable de cada cambio registrado desde la activación de esta vista.</p></div><label className={base.field}>Filtrar por nivel<select className={base.input} value={filter} disabled={busy} onChange={e => void load(e.target.value)}><option value="">Todos los niveles</option>{settings.levels.map(level => <option key={level.code} value={level.code}>{level.name}</option>)}</select></label></div>
      {busy && <p role="status" className={base.small}>Consultando historial…</p>}
      {!settings.history.length ? <p className={`${base.muted} ${base.section}`}>Todavía no hay modificaciones registradas{filter ? " para este nivel" : ""}.</p> : <ol className={styles.history}>{settings.history.map(item => <li key={item.id}><div className={styles.header}><strong>{item.name} · Versión {item.revision}</strong><time dateTime={item.createdAt}>{date(item.createdAt)}</time></div><p>Modificado por <strong>{item.actor}</strong></p><dl className={styles.comparison}><div><dt>Antes</dt><dd>{values(item.before)}</dd></div><div><dt>Después</dt><dd>{values(item.after)}</dd></div></dl><p className={styles.reason}><strong>Motivo:</strong> {item.reason}</p></li>)}</ol>}
      {settings.nextCursor && <button type="button" className={base.button} disabled={busy} onClick={() => void load(filter, settings.nextCursor)}>Ver modificaciones anteriores</button>}
    </section>
  </>;
}
