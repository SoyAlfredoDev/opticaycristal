"use client";

import Image from "next/image";
import Link from "next/link";
import { Repeat2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./FrameAdvisorSection.module.css";

const rotationDelay = 8000;
const examples = [
  {
    folder: "foto-real",
    person: "Mujer",
    frames: [
      { file: "panto", name: "Panto", color: "carey" },
      { file: "redonda", name: "Redonda", color: "negro" },
      { file: "rectangular", name: "Rectangular", color: "gris" },
    ],
  },
  {
    folder: "retrato-exterior",
    person: "Hombre",
    frames: [
      { file: "rectangular-negro", name: "Rectangular", color: "negro" },
      { file: "cuadrada-azul-cobalto", name: "Cuadrada", color: "azul cobalto" },
      { file: "redondeada-carey-ambar", name: "Redondeada", color: "carey ámbar" },
    ],
  },
];

function nextExample(current: number) {
  return (current + 1) % examples.length;
}

export function FrameAdvisorExamples() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.15,
    });
    observer.observe(gallery);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    function syncRotation() {
      clearTimeout(timer);
      if (!document.hidden && !motion.matches) {
        timer = setTimeout(() => setActive(nextExample), rotationDelay);
      }
    }
    syncRotation();
    motion.addEventListener("change", syncRotation);
    document.addEventListener("visibilitychange", syncRotation);
    return () => {
      clearTimeout(timer);
      motion.removeEventListener("change", syncRotation);
      document.removeEventListener("visibilitychange", syncRotation);
    };
  }, [active, visible]);

  return (
    <div role="group" aria-label="Comparación de monturas" aria-roledescription="carrusel">
      <div className={styles.exampleStage} ref={galleryRef}>
        {examples.map(({ folder, person, frames }, index) => (
          <div className={styles.gallery} key={folder} data-active={index === active} aria-hidden={index !== active}>
            {frames.map(({ file, name, color }) => (
              <figure key={file}>
                <Image
                  src={`/asesor-monturas/portada/${folder}/${file}.webp`}
                  alt={`${person} con montura ${name.toLowerCase()} en ${color}`}
                  width={1000}
                  height={1000}
                  unoptimized
                />
                <figcaption>{name} · {color}</figcaption>
              </figure>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.exampleActions}>
        <Link className={styles.button} href="/asesor-de-monturas/probar" prefetch={false}>
          Probar con mi foto
        </Link>
        <button className={styles.switchExample} type="button" onClick={() => setActive(nextExample)}>
          <Repeat2 size={17} aria-hidden="true" />
          Cambiar ejemplo
        </button>
      </div>
    </div>
  );
}
