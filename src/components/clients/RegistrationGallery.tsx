"use client";

import Image from "next/image";
import { useRef, useState, type CSSProperties } from "react";
import { Pause, Play, X } from "lucide-react";
import { store, storePhotos, storeVideo } from "@/components/site/content";
import { galleryPhotos } from "@/components/home/photo-gallery";
import home from "@/components/home/PhotoGallery.module.css";
import styles from "./Registration.module.css";

const customerPhotos = galleryPhotos.filter(photo => !storePhotos.some(storePhoto => storePhoto.src === photo.src));

const photos = [
  ...storePhotos,
  ...customerPhotos.slice(0, 1),
  { src: "/images/local/exhibicion-recorrido.jpg", alt: "Vista del local durante el recorrido de Óptica & Cristal" },
  ...customerPhotos.slice(1),
];

export function RegistrationGallery() {
  const [paused, setPaused] = useState(false);
  const playButton = useRef<HTMLButtonElement>(null);
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <section className={styles.gallery} aria-labelledby="registro-galeria">
      <header className={styles.galleryIntro}>
        <h2 id="registro-galeria">Conoce nuestra óptica</h2>
        <p>{store.fullAddress}</p>
      </header>
      <div className={styles.media} tabIndex={0} role="region" aria-label="Galería del local y recorrido en video">
        <div className={`${home.track} ${styles.track}`} style={{ "--gallery-duration": `${photos.length * 5}s` } as CSSProperties} data-paused={paused || videoOpen}>
          {[false, true].map(copy => (
            <div key={String(copy)} className={styles.photoSet} data-copy={copy} aria-hidden={copy || undefined}>
              {photos.map(photo => (
                <div key={photo.src} className={styles.photo}>
                  <Image src={photo.src} alt={copy ? "" : photo.alt} fill unoptimized style={"position" in photo ? { objectPosition: photo.position } : undefined} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className={styles.videoCard}>
          {videoOpen ? <>
            <video src={storeVideo.src} poster={storeVideo.poster} className={styles.video} controls playsInline muted autoPlay aria-label={storeVideo.title} />
            <button type="button" className={styles.closeVideo} aria-label="Cerrar recorrido" onClick={() => { setVideoOpen(false); requestAnimationFrame(() => playButton.current?.focus({ preventScroll: true })); }} autoFocus><X size={19} aria-hidden /></button>
          </> : <button type="button" className={styles.playVideo} ref={playButton} onClick={() => setVideoOpen(true)}>
            <Image src={storeVideo.poster} alt="" fill unoptimized />
            <span><Play size={18} aria-hidden />Ver recorrido</span>
          </button>}
        </div>
      </div>
      <button type="button" className={styles.pause} onClick={() => setPaused(value => !value)} disabled={videoOpen}>
        {paused ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
        {paused ? "Reanudar galería" : "Pausar galería"}
      </button>
    </section>
  );
}
