"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { SectionReveal } from "./SectionReveal";
import { galleryPhotos, type GalleryPhoto } from "./photo-gallery";
import site from "@/components/site/Site.module.css";
import styles from "./PhotoGallery.module.css";

function PhotoSet({ photos, hidden = false }: { photos: readonly GalleryPhoto[]; hidden?: boolean }) {
  return (
    <ul className={styles.set} aria-hidden={hidden || undefined}>
      {photos.map((photo) => (
        <li
          key={photo.id}
          className={styles.card}
          style={{
            "--x": `${photo.x}px`,
            "--y": `${photo.y}px`,
            "--w": `${photo.w}px`,
            "--h": `${photo.h}px`,
            zIndex: photo.z,
          } as CSSProperties}
        >
          <div className={styles.frame}>
            <Image
              src={photo.src}
              alt={hidden ? "" : photo.alt}
              fill
              sizes="(max-width: 700px) 150px, 260px"
              loading="eager"
              className={photo.fit === "contain" ? styles.contain : styles.cover}
              style={{ objectPosition: photo.position }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PhotoGallery() {
  const [paused, setPaused] = useState(false);

  return (
    <section id="galeria" aria-labelledby="gallery-title" className={`${site.section} ${styles.section}`}>
      <SectionReveal>
        <div className={site.container}>
          <div className={site.sectionHeading}>
            <h2 id="gallery-title">Vistas de la óptica</h2>
            <div className={styles.headingAside}>
              <span className={site.sectionCaption}>El local en Santiago Centro</span>
              <button
                type="button"
                className={styles.pause}
                aria-pressed={paused}
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? "Reanudar galería" : "Pausar galería"}
              </button>
            </div>
          </div>
          <p className={styles.lead}>Interior del local en Huérfanos 713, Santiago Centro: vitrinas, muro de monturas y la atención en la óptica.</p>
        </div>
        <div className={styles.stage} role="region" aria-label="Vistas de la óptica y de clientes">
          <div className={styles.track} data-paused={paused ? "true" : "false"}>
            <PhotoSet photos={galleryPhotos} />
            <PhotoSet photos={galleryPhotos} hidden />
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
