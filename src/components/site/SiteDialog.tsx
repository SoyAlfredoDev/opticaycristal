"use client";
import { useEffect, useRef, type ReactNode, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import styles from "./Site.module.css";
export function SiteDialog({ open, onClose, titleId, children, className = "" }: { open: boolean; onClose: () => void; titleId: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const previousOverflow = useRef("");
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousOverflow.current = document.body.style.overflow;
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("button")?.focus();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow.current; if (dialog.open) dialog.close(); triggerRef.current?.focus(); };
  }, [open]);
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])");
    const first = controls[0]; const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  return <dialog ref={ref} aria-labelledby={titleId} className={`${styles.galleryDialog} ${className}`} onClose={() => { document.body.style.overflow = previousOverflow.current; onClose(); }} onKeyDown={trapFocus}
    onClick={(event) => { if (event.target === event.currentTarget) ref.current?.close(); }}>
    <div className={styles.dialogContent}><button type="button" className={`${styles.iconButton} ${styles.dialogClose}`} onClick={() => ref.current?.close()} aria-label="Cerrar producto"><X size={22} aria-hidden="true" /></button>{children}</div>
  </dialog>;
}
