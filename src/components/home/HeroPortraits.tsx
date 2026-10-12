"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HERO_INTERVAL_MS, heroPortraits, nextReadyPortrait } from "./portrait-data";
import styles from "./HomeHero.module.css";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const readMotion = () => window.matchMedia(motionQuery).matches;
const serverMotion = () => true;

export function HeroPortraits() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState<boolean[]>(heroPortraits.map(() => false));
  const reducedMotion = useSyncExternalStore(subscribeMotion, readMotion, serverMotion);
  const stageRef = useRef<HTMLDivElement>(null);
  const stopped = paused || reducedMotion;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (stopped || !visible) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      if (!document.hidden) timer = setInterval(() => setActive(current => nextReadyPortrait(current, ready)), HERO_INTERVAL_MS);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ready, stopped, visible]);

  function markReady(index: number, loaded: boolean) {
    setReady(current => current.map((value, position) => position === index ? loaded : value));
  }

  return (
    <div ref={stageRef} className={styles.portrait} role="group" aria-label="Personas usando lentes ópticos" aria-roledescription="carrusel" data-active-portrait={heroPortraits[active].id}>
      <div className={styles.portraitStage}>
        {heroPortraits.map((portrait, index) => (
          <div key={portrait.id} className={styles.person} data-active={index === active} data-person={portrait.id} aria-hidden={index !== active}>
            <Image src={portrait.src} alt={portrait.alt} unoptimized
              width={portrait.width} height={portrait.height} className={styles.personImage}
              sizes="(min-width: 1600px) 900px, (min-width: 900px) 60vw, 100vw"
              preload={index === 0} loading={index === 0 ? undefined : "eager"}
              onLoad={() => markReady(index, true)} onError={() => markReady(index, false)} />
          </div>
        ))}
      </div>
      <div className={styles.portraitControls}>
        {heroPortraits.map((portrait, index) => (
          <button key={portrait.id} type="button" aria-label={`Mostrar ${portrait.label.toLowerCase()}`}
            aria-pressed={active === index} disabled={!ready[index]}
            onClick={() => { setActive(index); setPaused(true); }}><span /></button>
        ))}
        <button type="button" aria-label={stopped ? "Reanudar retratos" : "Pausar retratos"}
          disabled={reducedMotion} onClick={() => setPaused(value => !value)}>
          {stopped ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
