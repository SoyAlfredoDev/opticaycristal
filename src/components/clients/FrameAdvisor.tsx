"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, MessageCircle, Sparkles } from "lucide-react";
import { colorPaint, shapeLabels, styles as preferenceStyles, type Advice, type Color, type Style, type Suggestion } from "@/lib/frame-advisor/shared";
import { whatsappUrl } from "@/components/site/content";
import type { Portrait } from "@/lib/frame-advisor/photo";
import space from "./ClientSpace.module.css";
import styles from "./FrameAdvisor.module.css";

const endpoint = "/api/clientes/asesor-de-monturas";

function Option({ suggestion, portrait }: { suggestion: Suggestion; portrait: Portrait | null }) {
  const [color, setColor] = useState<Color>(suggestion.colors[0]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const shape = shapeLabels[suggestion.shape];
  useEffect(() => {
    let active = true;
    void import("@/lib/frame-advisor/photo").then(({ drawTryOn }) => {
      if (active && canvas.current) drawTryOn(canvas.current, portrait, suggestion.shape, color);
    });
    return () => { active = false; };
  }, [portrait, suggestion.shape, color]);

  return <article className={styles.option}>
    <canvas ref={canvas} width={512} height={512} role="img" aria-label={`Vista referencial de montura ${shape.toLowerCase()} en ${color}`} />
    <div className={styles.optionBody}>
      <h2>{shape}</h2>
      <p>{suggestion.reason}</p>
      <div className={styles.colors} aria-label={`Colores para montura ${shape.toLowerCase()}`}>
        {suggestion.colors.map(name => <button type="button" key={name} aria-pressed={color === name} onClick={() => setColor(name)}>
          <span aria-hidden="true" style={{ backgroundColor: colorPaint[name] }} />{name}
        </button>)}
      </div>
      <a className={styles.contact} href={whatsappUrl(`Hola, probé el asesor de monturas y me gustó el estilo ${shape.toLowerCase()} en color ${color}. ¿Me ayudan a buscar una similar?`)} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={17} aria-hidden="true" /> Buscar una parecida
      </a>
    </div>
  </article>;
}

export function FrameAdvisor() {
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [style, setStyle] = useState<Style>("clásico");
  const [busy, setBusy] = useState<"photo" | "advice" | "rating" | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Advice | null>(null);
  const [resultPortrait, setResultPortrait] = useState<Portrait | null>(null);
  const [previous, setPrevious] = useState<Advice | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const retry = useRef<string | null>(null);
  const pending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(endpoint, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (response.ok) setPrevious((await response.json()).advice);
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const resultId = result?.id;
  useEffect(() => { if (resultId) heading.current?.focus(); }, [resultId]); // Keep focus on the submit confirmation when rating.

  async function selectPhoto(file?: File) {
    if (!file || pending.current) return;
    pending.current = true;
    setBusy("photo"); setError(""); setPortrait(null); retry.current = null;
    try {
      const { analyzePortrait } = await import("@/lib/frame-advisor/photo");
      setPortrait(await analyzePortrait(file));
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos analizar la foto. Puedes continuar sin ella.");
    } finally {
      pending.current = false; setBusy(null);
    }
  }

  async function consult(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy("advice"); setError("");
    retry.current ??= crypto.randomUUID();
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(35_000),
        body: JSON.stringify({ action: "consult", requestId: retry.current, style, profile: portrait?.profile ?? "sin-foto" }),
      });
      const body = await response.json();
      if (!body.retry) retry.current = null;
      if (!response.ok) throw new Error(body.error ?? "No pudimos preparar tu asesoría.");
      setResult(body.advice); setPrevious(body.advice); setResultPortrait(portrait); setRating(null); setFeedback("");
    } catch (error) {
      setError(error instanceof Error && error.name === "Error" ? error.message : "Se interrumpió la consulta. Puedes volver a intentar.");
    } finally {
      pending.current = false; setBusy(null);
    }
  }

  async function sendRating(event: FormEvent) {
    event.preventDefault();
    if (!result || !rating || pending.current) return;
    pending.current = true;
    setBusy("rating"); setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ action: "rate", id: result.id, rating, feedback }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No pudimos guardar tu calificación.");
      setResult({ ...result, rating: body.rating });
      setPrevious({ ...result, rating: body.rating });
      setFeedback("");
    } catch (error) {
      setError(error instanceof Error && error.name === "Error" ? error.message : "No pudimos guardar tu calificación.");
    } finally {
      pending.current = false; setBusy(null);
    }
  }

  return <div className={styles.advisor}>
    <div className={space.pageIntro}>
      <h1>Asesor de monturas</h1>
      <p>Descubre tres formas y colores para probar, según tu estilo.</p>
    </div>
    <form onSubmit={consult} className={`${space.panel} ${styles.form}`}>
      <div>
        <h2>Tu foto <small>Opcional</small></h2>
        <p>Colócate de frente y con buena luz. La foto se procesa en tu dispositivo.</p>
        <div className={styles.photoActions}>
          <label className={styles.photoButton}>
            <Camera size={19} aria-hidden="true" />{portrait ? "Cambiar foto" : "Tomar o elegir foto"}
            <input type="file" accept="image/*" capture="user" disabled={!!busy} onChange={event => {
              const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void selectPhoto(file);
            }} />
          </label>
          {portrait && <button type="button" disabled={!!busy} className={space.button} onClick={() => {
            setPortrait(null); setResultPortrait(null); retry.current = null;
          }}>Quitar foto</button>}
        </div>
        {portrait && <p role="status">Foto lista para el probador.</p>}
      </div>
      <fieldset className={styles.preferences} disabled={!!busy}>
        <legend>¿Qué estilo buscas?</legend>
        {preferenceStyles.map(value => <label key={value}>
          <input type="radio" name="frame-style" checked={style === value} onChange={() => {
            setStyle(value); retry.current = null;
          }} />{value}
        </label>)}
      </fieldset>
      <button type="submit" className={`${space.button} ${space.primary}`} disabled={!!busy}><Sparkles size={19} aria-hidden="true" /> Ver mis monturas</button>
      {previous && !result && <button type="button" className={space.button} disabled={!!busy} onClick={() => {
        setResult(previous); setResultPortrait(null); setRating(null); setFeedback("");
      }}>Ver mi última asesoría</button>}
    </form>

    {busy && <p role="status" className={styles.progress}><span aria-hidden="true" />{busy === "photo" ? "Preparando tu foto…" : busy === "advice" ? "Buscando tres estilos para ti…" : "Guardando tu calificación…"}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}

    {result && <section className={styles.results} aria-labelledby="frame-results-title">
      <h2 id="frame-results-title" ref={heading} tabIndex={-1}>Tus tres monturas sugeridas</h2>
      <p>Referencias de estilo. El ajuste y la disponibilidad se confirman con la óptica.</p>
      <div className={styles.options}>
        {result.suggestions.map(suggestion => <Option key={`${result.id}:${suggestion.shape}`} suggestion={suggestion} portrait={resultPortrait} />)}
      </div>
      {result.rating ? <p className={styles.thanks} role="status">Gracias por calificar tu asesoría.</p> :
        <form onSubmit={sendRating} className={`${space.panel} ${styles.form}`}>
          <fieldset className={styles.preferences} disabled={!!busy}>
            <legend>¿Qué tan útil fue esta asesoría?</legend>
            {[1, 2, 3, 4, 5].map(value => <label key={value}>
              <input type="radio" name="frame-rating" aria-label={`${value} de 5`} checked={rating === value} onChange={() => setRating(value)} />{value}
            </label>)}
          </fieldset>
          <label className={space.field}>Comentario opcional
            <textarea placeholder="Cuéntanos qué mejorar, sin incluir datos personales." className={space.input} maxLength={400} rows={2} value={feedback} onChange={event => setFeedback(event.target.value)} disabled={!!busy} />
          </label>
          <button type="submit" className={space.button} disabled={!rating || !!busy}>Enviar calificación</button>
        </form>}
    </section>}
  </div>;
}
