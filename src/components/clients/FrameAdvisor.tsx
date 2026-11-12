"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, MessageCircle, Sparkles } from "lucide-react";
import { shapeLabels, styles as preferenceStyles, type Advice, type Style } from "@/lib/frame-advisor/shared";
import { whatsappUrl } from "@/components/site/content";
import type { Portrait } from "@/lib/frame-advisor/photo";
import space from "./ClientSpace.module.css";
import styles from "./FrameAdvisor.module.css";

const endpoint = "/api/clientes/asesor-de-monturas";
type Preview = { state: "waiting" | "pending" | "ready" | "failed" | "expired"; image?: string };
const waiting = (): Preview[] => [0,1,2].map(() => ({ state: "waiting" }));
const photoBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

export function FrameAdvisor() {
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [original, setOriginal] = useState("");
  const [style, setStyle] = useState<Style>("clásico");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<"photo" | "advice" | "images" | "rating" | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Advice | null>(null);
  const [previews, setPreviews] = useState<Preview[]>(waiting);
  const [previous, setPrevious] = useState<Advice | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const retry = useRef<string | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void fetch(endpoint, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (response.ok && mounted.current) setPrevious((await response.json()).advice);
    }).catch(() => undefined);
    return () => { mounted.current = false; controller.abort(); };
  }, []);

  const resultId = result?.id;
  useEffect(() => { if (resultId) heading.current?.focus(); }, [resultId]);

  async function selectPhoto(file?: File) {
    if (!file || pending.current) return;
    pending.current = true;
    setBusy("photo"); setError(""); setPortrait(null); setOriginal(""); setConsent(false); retry.current = null;
    try {
      const { analyzePortrait } = await import("@/lib/frame-advisor/photo");
      const photo = await analyzePortrait(file);
      const encoded = await photoBase64(photo.original);
      if (!mounted.current) return;
      setPortrait(photo); setOriginal(`data:image/jpeg;base64,${encoded}`);
    } catch (error) {
      if (mounted.current) setError(error instanceof Error ? error.message : "No pudimos abrir la foto.");
    } finally { pending.current = false; if (mounted.current) setBusy(null); }
  }

  async function createImages(advice: Advice, photo: Blob, existing = waiting()) {
    setBusy("images");
    const encoded = await photoBase64(photo);
    for (let index=0; index<3 && mounted.current; index++) {
      if (["ready", "failed", "expired"].includes(existing[index].state)) continue;
      setProgress(index+1);
      setPreviews(current => current.map((item,i) => i===index ? { state: "pending" } : item));
      try {
        const response = await fetch(`${endpoint}/imagenes`, {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(175_000),
          body: JSON.stringify({ adviceId: advice.id, index, photo: encoded, consent: "photo-edit-v1" }),
        });
        const body = await response.json();
        if (!mounted.current) return;
        if (!response.ok) {
          setPreviews(current => current.map((item,i) => i===index ? { state: body.retry ? "pending" : "failed" } : item));
          setError(body.error ?? "No pudimos preparar una de tus imágenes.");
          if (body.retry || response.status === 429 || response.status === 401 || response.status === 404) break;
          continue;
        }
        setPreviews(current => current.map((item,i) => i===index ? { state: "ready", image: body.image } : item));
      } catch {
        if (mounted.current) {
          setPreviews(current => current.map((item,i) => i===index ? { state: "pending" } : item));
          setError("Se interrumpió la conexión. Pulsa «Actualizar imágenes» para recuperar las propuestas terminadas.");
        }
        break; // Do not repeat an expensive provider call after an uncertain network outcome.
      }
    }
  }

  async function recoverImages(advice: Advice) {
    try {
      const response = await fetch(`${endpoint}/imagenes?adviceId=${advice.id}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error();
      const body = await response.json() as { images: { index: number; state: Preview["state"]; image: string | null }[] };
      if (mounted.current) setPreviews([0,1,2].map(index => {
        const found = body.images.find(item => item.index === index);
        return found ? { state: found.state, image: found.image ?? undefined } : { state: "waiting" };
      }));
    } catch { if (mounted.current) setError("No pudimos recuperar las imágenes. Inténtalo más tarde."); }
  }

  async function consult(event: FormEvent) {
    event.preventDefault();
    if (pending.current || !portrait || !consent) return;
    pending.current = true;
    setBusy("advice"); setError("");
    retry.current ??= crypto.randomUUID();
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(35_000),
        body: JSON.stringify({ action: "consult", requestId: retry.current, style, profile: portrait.profile }),
      });
      const body = await response.json();
      if (!body.retry) retry.current = null;
      if (!response.ok) throw new Error(body.error ?? "No pudimos preparar tu asesoría.");
      if (!mounted.current) return;
      setResult(body.advice); setPrevious(body.advice); setPreviews(waiting()); setRating(null); setFeedback("");
      await createImages(body.advice, portrait.prepared);
    } catch (error) {
      if (mounted.current) setError(error instanceof Error && error.name === "Error" ? error.message : "Se interrumpió la consulta. Puedes volver a intentar.");
    } finally { pending.current = false; if (mounted.current) setBusy(null); }
  }

  async function sendRating(event: FormEvent) {
    event.preventDefault();
    if (!result || !rating || pending.current) return;
    pending.current = true; setBusy("rating"); setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ action: "rate", id: result.id, rating, feedback }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No pudimos guardar tu calificación.");
      if (!mounted.current) return;
      setResult({ ...result, rating: body.rating }); setPrevious({ ...result, rating: body.rating }); setFeedback("");
    } catch { if (mounted.current) setError("No pudimos guardar tu calificación."); }
    finally { pending.current = false; if (mounted.current) setBusy(null); }
  }

  return <div className={styles.advisor}>
    <div className={space.pageIntro}><h1>Asesor de monturas</h1><p>Tu foto, tres propuestas y una explicación para ti.</p></div>
    <form onSubmit={consult} className={`${space.panel} ${styles.form}`}>
      <div>
        <h2>Elige tu foto</h2>
        <p>De frente, sin lentes y con buena luz.</p>
        <div className={styles.photoActions}>
          <label className={styles.photoButton}><Camera size={19} aria-hidden="true" />{portrait ? "Cambiar foto" : "Tomar o elegir foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" disabled={!!busy} onChange={event => {
              const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void selectPhoto(file);
            }} />
          </label>
          {portrait && <button type="button" disabled={!!busy} className={space.button} onClick={() => {
            setPortrait(null); setOriginal(""); setConsent(false); retry.current = null;
          }}>Quitar foto</button>}
        </div>
        {/* Private in-memory images are deliberately not sent to the public image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {original && <img className={styles.original} src={original} alt="Tu foto original, antes de añadir las monturas" />}
      </div>
      <fieldset className={styles.preferences} disabled={!!busy}>
        <legend>¿Qué estilo buscas?</legend>
        {preferenceStyles.map(value => <label key={value}><input type="radio" name="frame-style" checked={style === value} onChange={() => {
          setStyle(value); retry.current = null;
        }} />{value}</label>)}
      </fieldset>
      <label className={styles.consent}><input type="checkbox" checked={consent} disabled={!!busy} onChange={event => setConsent(event.target.checked)} />
        Autorizo el envío de mi foto a OpenAI para crear estas tres propuestas.
      </label>
      {portrait?.quality.action === "enhance" && <p className={styles.privacy} role="status">Aplicaremos un ajuste suave de nitidez, sin reconstruir tus rasgos.</p>}
      <p className={styles.privacy}>No guardamos tu foto original. Tus propuestas son privadas y están disponibles durante 24 horas.</p>
      <button type="submit" className={`${space.button} ${space.primary}`} disabled={!!busy || !portrait || !consent}><Sparkles size={19} aria-hidden="true" /> Crear mis tres propuestas</button>
      {previous && !result && <button type="button" className={space.button} disabled={!!busy} onClick={() => {
        setResult(previous); setRating(null); setFeedback(""); void recoverImages(previous);
      }}>Ver mi última asesoría</button>}
    </form>
    {busy && <p role="status" className={styles.progress}><span aria-hidden="true" />{busy === "photo" ? "Preparando tu foto…" : busy === "advice" ? "Eligiendo tres estilos para ti…" : busy === "images" ? `Creando propuesta ${progress} de 3. Puede tardar un momento…` : "Guardando tu calificación…"}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {result && <section className={styles.results} aria-labelledby="frame-results-title">
      <h2 id="frame-results-title" ref={heading} tabIndex={-1}>Tres maneras de verte con lentes</h2>
      <p>Simulaciones con IA: pueden variar detalles de la foto. El ajuste y la disponibilidad se confirman en la óptica.</p>
      <div className={styles.options}>{result.suggestions.map((suggestion,index) => {
        const preview = previews[index], shape = shapeLabels[suggestion.shape];
        return <article className={styles.option} key={`${result.id}:${index}`}>
          <div className={styles.preview} aria-busy={preview.state === "pending"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview.image ? <img src={`data:image/jpeg;base64,${preview.image}`} alt={`Tu foto con montura ${shape.toLowerCase()} en ${suggestion.colors[0]}`} /> :
              <div className={styles.imagePlaceholder}>{preview.state === "pending" ? "Creando tu propuesta…" : preview.state === "failed" ? "Imagen no disponible" : preview.state === "expired" ? "La imagen ya venció" : "Tu propuesta aparecerá aquí"}</div>}
          </div>
          <div className={styles.optionBody}><h3>{shape} · {suggestion.colors[0]}</h3><p>{suggestion.reason}</p>
            <p className={styles.privacy}>También puedes probar: {suggestion.colors.slice(1).join(", ")}.</p>
            <a className={styles.contact} href={whatsappUrl(`Hola, probé el asesor y me gustó el estilo ${shape.toLowerCase()} en ${suggestion.colors[0]}. ¿Me ayudan a buscar una similar?`)} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} aria-hidden="true" /> Buscar una parecida</a>
          </div>
        </article>;
      })}</div>
      {!busy && previews.some(item => !item.image) && <button type="button" className={space.button} onClick={() => void recoverImages(result)}>Actualizar imágenes</button>}
      {!busy && portrait && consent && previews.some(item => item.state === "waiting") && <button type="button" className={space.button} onClick={async () => {
        if (pending.current) return;
        pending.current = true; setError("");
        try { await createImages(result, portrait.prepared, previews); }
        finally { pending.current = false; if (mounted.current) setBusy(null); }
      }}>Completar propuestas con esta foto</button>}
      {result.rating ? <p className={styles.thanks} role="status">Gracias por calificar tu asesoría.</p> :
        <form onSubmit={sendRating} className={`${space.panel} ${styles.form}`}>
          <fieldset className={styles.preferences} disabled={!!busy}><legend>¿Qué tan útil fue esta asesoría?</legend>
            {[1,2,3,4,5].map(value => <label key={value}><input type="radio" name="frame-rating" aria-label={`${value} de 5`} checked={rating === value} onChange={() => setRating(value)} />{value}</label>)}
          </fieldset>
          <label className={space.field}>Comentario opcional<textarea placeholder="Cuéntanos qué mejorar, sin incluir datos personales." className={space.input} maxLength={400} rows={2} value={feedback} onChange={event => setFeedback(event.target.value)} disabled={!!busy} /></label>
          <button type="submit" className={space.button} disabled={!rating || !!busy}>Enviar calificación</button>
        </form>}
    </section>}
  </div>;
}
