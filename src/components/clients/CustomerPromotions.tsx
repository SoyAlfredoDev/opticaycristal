"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Glasses, Sparkles, Pause, Play } from "lucide-react";
import { storeMapUrl, whatsappUrl } from "@/components/site/content";
import styles from "./CustomerPromotions.module.css";

type Announcement = {
  id: string; label: string; title: string; accent: string; action?: string; href?: string; description?: string;
  image?: string; imageAlt?: string; address?: string; reference?: boolean;
};
// Add future announcements here; content, controls and rotation share this list.
const announcements: readonly Announcement[] = [
  { id: "consulta", label: "Consulta visual gratuita", title: "Consulta visual", accent: "Totalmente gratuita.", action: "Coordinar mi consulta", href: whatsappUrl("Hola, soy cliente y quiero coordinar mi consulta visual gratuita.") },
  { id: "visita", label: "Visita la óptica", title: "Te esperamos", accent: "en la óptica.", action: "Cómo llegar", href: storeMapUrl("directions"), image: "/images/home/hero-optical-boutique-v3.webp", imageAlt: "Interior de una óptica, imagen referencial", address: "Huérfanos 713 · Local 18", reference: true },
  { id: "ia", label: "Próximo asistente de IA", title: "Tu asesor con IA.", accent: "Próximamente.", description: "Estamos preparando un asistente especializado en estilo y estética para ayudarte a elegir tus lentes, con el respaldo de nuestro equipo óptico." },
];
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const reducedMotion = () => window.matchMedia(motionQuery).matches;
const serverMotion = () => true;

export function CustomerPromotions({ advisorAvailable = false }: { advisorAvailable?: boolean } = {}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reduce = useSyncExternalStore(subscribeMotion, reducedMotion, serverMotion);
  const selected = announcements[index];
  const current = advisorAvailable && selected.id === "ia" ? { ...selected, label: "Asesor de monturas", accent: "Prueba tu estilo.", description: "Compara tres formas y colores con una foto o tus preferencias.", action: "Probar monturas", href: "/mi-cuenta/asesor-de-monturas" } : selected;
  useEffect(() => {
    if (!playing || reduce || hovered || focused) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % announcements.length), 8000);
    return () => window.clearInterval(timer);
  }, [playing, reduce, hovered, focused]);

  return (
    <section className={styles.carousel} aria-label="Novedades de la óptica" aria-roledescription="carrusel"
      onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(true); }} onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className={`${styles.slide} ${current.image ? styles.visit : ""} ${current.id === "ia" ? styles.upcoming : ""}`} role="group" aria-roledescription="anuncio" aria-label={`${index + 1} de ${announcements.length}: ${current.label}`}>
        {current.image ? <Image src={current.image} alt={current.imageAlt ?? ""} fill sizes="(max-width: 650px) 100vw, (max-width: 1200px) 80vw, 1100px" className={styles.photo} /> :
          <div className={styles.decoration} aria-hidden="true">{current.id === "ia" ? <Sparkles strokeWidth={1.5} /> : <Glasses strokeWidth={1.8} />}</div>}
        <div className={styles.copy}>
          <p className={styles.brand}>ÓPTICA &amp; CRISTAL</p>
          <h2 className={styles.title}>{current.title}<br /><span>{current.accent}</span></h2>
          {current.address && <p className={styles.address}>{current.address}</p>}
          {current.description && <p className={styles.description}>{current.description}</p>}
          {current.href && current.action && <a href={current.href} target={current.href.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className={styles.link}>{current.action}<ArrowUpRight size={17} aria-hidden="true" /></a>}
        </div>
        {current.reference && <span className={styles.reference}>Imagen referencial</span>}
      </div>
      <div className={styles.controls}>
        <div className={styles.selectors}>
          {announcements.map((item, position) => <button key={item.id} type="button" aria-label={`Mostrar anuncio ${position + 1}: ${item.label}`} aria-pressed={index === position} onClick={() => { setIndex(position); setPlaying(false); }}><span aria-hidden="true" /></button>)}
        </div>
        {!reduce && <button type="button" className={styles.playback} onClick={() => setPlaying(value => !value)}>
          {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}{playing ? "Pausar" : "Reanudar"}
        </button>}
      </div>
    </section>
  );
}
