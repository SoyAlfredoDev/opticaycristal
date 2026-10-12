"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Maximize2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { collections, whatsappUrl } from "./content";
import { DepthMedia } from "./DepthMedia";
import { LinkButton } from "./LinkButton";
import styles from "@/components/site/Site.module.css";

export function CollectionGallery() {
  const [selected, setSelected] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousOverflow = useRef("");
  const titleId = useId();
  const isOpen = selected !== null;
  const current = collections[selected ?? 0];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    previousOverflow.current = document.body.style.overflow;
    dialog.showModal();
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow.current;
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  function close() {
    document.body.style.overflow = previousOverflow.current;
    dialogRef.current?.close();
    setSelected(null);
  }
  function step(direction: number) {
    setSelected((index) => index === null ? null : (index + direction + collections.length) % collections.length);
  }
  function onKey(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      const controls = event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      step(event.key === "ArrowLeft" ? -1 : 1);
    }
  }

  return (
    <>
      <div className={styles.galleryGrid}>
        {collections.map((collection, index) => (
          <article key={collection.id} className={styles.collection}>
            <DepthMedia>
              <button type="button" className={`${styles.collectionImage} ${collection.cutout ? styles.cutout : ""}`}
                onClick={() => setSelected(index)} aria-label={`Ampliar imagen de ${collection.title.toLowerCase()}`}>
                <Image src={collection.image} alt={collection.alt} fill
                  sizes="(min-width: 900px) 31vw, (min-width: 600px) 45vw, 88vw" quality={90} />
                <span className={styles.zoomIcon}><Maximize2 size={17} strokeWidth={1.5} aria-hidden="true" /></span>
              </button>
            </DepthMedia>
            <button type="button" className={styles.collectionTitle} onClick={() => setSelected(index)}>
              <h3>{collection.title}</h3><ArrowRight size={20} strokeWidth={1.4} aria-hidden="true" />
            </button>
            <p>{collection.subtitle}</p>
          </article>
        ))}
      </div>
      <p className={styles.referenceNote}>Imágenes referenciales. Consulta modelos y disponibilidad con nuestro equipo.</p>

      <dialog ref={dialogRef} aria-labelledby={titleId} className={styles.galleryDialog}
        onClose={() => { document.body.style.overflow = previousOverflow.current; setSelected(null); }} onKeyDown={onKey}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div className={styles.dialogContent}>
          <button ref={closeRef} type="button" className={`${styles.iconButton} ${styles.dialogClose}`}
            onClick={close} aria-label="Cerrar galería"><X size={22} aria-hidden="true" /></button>
          <div className={`${styles.dialogImage} ${current.cutout ? styles.cutout : ""}`}>
            {isOpen ? <Image key={current.id} src={current.image} alt={current.alt} fill
              sizes="(min-width: 900px) 850px, 95vw" quality={90} /> : null}
          </div>
          <div className={styles.dialogInfo}>
            <div aria-live="polite" aria-atomic="true">
              <p className={styles.galleryCount}>{(selected ?? 0) + 1} / {collections.length}</p>
              <h2 id={titleId}>{current.title}</h2>
              <p>{current.subtitle}</p>
            </div>
            <div className={styles.galleryControls}>
              <button className={styles.iconButton} type="button" onClick={() => step(-1)} aria-label="Imagen anterior">
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
              <button className={styles.iconButton} type="button" onClick={() => step(1)} aria-label="Imagen siguiente">
                <ArrowRight size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className={styles.dialogBottom}>
            <p>Imagen referencial. Consulta disponibilidad.</p>
            <LinkButton href={whatsappUrl(current.message)} target="_blank" rel="noopener noreferrer" arrow>
              Consultar por WhatsApp
            </LinkButton>
          </div>
        </div>
      </dialog>
    </>
  );
}
