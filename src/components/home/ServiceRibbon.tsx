"use client";

import { useEffect, useRef } from "react";
import styles from "./ServiceRibbon.module.css";

const topRow = [
  { label: "Lentes de sol", tone: "ivory" },
  { label: "Estuches", tone: "outline" },
  { label: "Consulta visual", tone: "italic" },
  { label: "Monofocales", tone: "stamp" },
  { label: "Lentes ópticos", tone: "ivory" },
  { label: "Asesoría", tone: "outline" },
  { label: "Accesorios", tone: "italic" },
  { label: "Monturas", tone: "stamp" },
] as const;

const bottomRow = [
  { label: "Multifocales", tone: "outline" },
  { label: "Paños", tone: "ivory" },
  { label: "Despacho a domicilio", tone: "stamp" },
  { label: "Jornadas", tone: "italic" },
  { label: "Convenios", tone: "ivory" },
  { label: "Kit de limpieza", tone: "outline" },
  { label: "Atención para empresas", tone: "italic" },
  { label: "Lentes y accesorios", tone: "stamp" },
] as const;

const services = [...topRow, ...bottomRow].map((item) => item.label);

function Row({
  items,
  direction,
}: {
  items: readonly { label: string; tone: string }[];
  direction: "left" | "right";
}) {
  const unit = [...items, ...items];
  const track = [...unit, ...unit];

  return (
    <div className={styles.row}>
      <div className={`${styles.track} ${direction === "left" ? styles.toLeft : styles.toRight}`}>
        {track.map((item, index) => (
          <span key={`${item.label}-${index}`} className={`${styles.item} ${index >= unit.length ? styles.clone : ""}`}>
            <span className={`${styles.word} ${styles[item.tone]}`}>{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ServiceRibbon() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const ribbon = ref.current;
    const scope = ribbon?.closest("main")?.parentElement;
    if (!ribbon || !scope) return;
    const property = "--oc-home-services-height";
    const previous = scope.style.getPropertyValue(property);
    const measure = () => scope.style.setProperty(property, `${ribbon.getBoundingClientRect().height}px`);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(ribbon);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      if (previous) scope.style.setProperty(property, previous);
      else scope.style.removeProperty(property);
    };
  }, []);
  return (
    <section ref={ref} className={styles.ribbon} aria-label="Servicios">
      <ul className={styles.srOnly}>
        {services.map((service) => (
          <li key={service}>{service}</li>
        ))}
      </ul>
      <div aria-hidden="true">
        <Row items={topRow} direction="left" />
        <Row items={bottomRow} direction="right" />
      </div>
    </section>
  );
}
