"use client";

import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, FileText, LoaderCircle, Upload, X } from "lucide-react";
import type { AdminSaleRow } from "@/lib/clients/sales-register-types";
import type { SaleCommitmentFile } from "@/lib/clients/commitment-upload-types";
import { prepareCommitmentPhotos } from "@/lib/clients/prepare-commitment-photos";
import styles from "./SaleCommitmentUpload.module.css";

const date = new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" });
export function SaleCommitmentUpload({ sale, onUploaded }: { sale: AdminSaleRow; onUploaded: (file: SaleCommitmentFile) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), busy = useRef(false), requestKey = useRef("");
  const [files, setFiles] = useState<File[]>([]), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const endpoint = `/api/admin/clientes/ventas/${encodeURIComponent(sale.id)}/compromiso/archivo`;
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy.current || !files.length) return;
    busy.current = true; setSaving(true); setError("");
    try {
      const prepared = await prepareCommitmentPhotos(files), body = new FormData();
      if (!requestKey.current) requestKey.current = crypto.randomUUID();
      body.append("requestKey", requestKey.current); prepared.forEach(file => body.append("files", file));
      const response = await fetch(endpoint, { method: "POST", body, signal: AbortSignal.timeout(45_000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos cargar el documento.");
      onUploaded(result.file); dialog.current?.close();
    } catch (error) {
      setError(error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
        ? "La carga está tardando demasiado. Actualiza las ventas antes de reintentar."
        : error instanceof TypeError ? "No pudimos enviar el archivo. Revisa tu conexión y vuelve a seleccionarlo."
          : error instanceof Error ? error.message : "No pudimos cargar el documento.");
    }
    finally { busy.current = false; setSaving(false); }
  }
  if (sale.credit <= 0) return <span className={styles.muted}>No aplica</span>;
  if (sale.commitmentFile) return <div className={styles.cell}>
    <span className={styles.ready}><CheckCircle2 size={15} aria-hidden="true" />Documento cargado</span>
    <a className={styles.link} href={endpoint} target="_blank" rel="noopener noreferrer"><FileText size={15} aria-hidden="true" />Ver compromiso</a>
    <span className={styles.audit}>{sale.commitmentFile.uploadedBy}<br />{date.format(new Date(sale.commitmentFile.uploadedAt))}</span>
  </div>;
  if (sale.status === "cancelled") return <span className={styles.muted}>Venta anulada</span>;
  return <div className={styles.cell}>
    <span className={styles.pending}><AlertCircle size={15} aria-hidden="true" />Compromiso pendiente</span>
    <button type="button" className={styles.upload} onClick={() => { setError(""); dialog.current?.showModal(); }}><Upload size={15} aria-hidden="true" />Subir compromiso</button>
    <dialog ref={dialog} className={styles.dialog} aria-label="Subir compromiso de pago" onCancel={event => { if (busy.current) event.preventDefault(); }}>
      <form onSubmit={submit}>
        <header><h2>Subir compromiso de pago</h2><button className={styles.close} type="button" aria-label="Cerrar" disabled={saving} onClick={() => dialog.current?.close()}><X size={21} /></button></header>
        <p className={styles.customer}>{sale.customerName} · {sale.controlNumber || "Venta"}</p>
        <p>Adjunta todas las hojas del compromiso firmado: un PDF o hasta cuatro fotos JPG/PNG.</p>
        <label className={styles.picker}>Documento firmado
          <input type="file" multiple accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" disabled={saving}
            onChange={event => { setFiles(Array.from(event.target.files || [])); requestKey.current = ""; setError(""); }} />
        </label>
        <small>PDF de hasta 3 MB. Las fotos se optimizan automáticamente antes de subirlas.</small>
        <p className={styles.note}>Cargar el documento no valida la firma ni modifica los pagos de la venta.</p>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <footer><button type="button" disabled={saving} className={styles.cancel} onClick={() => dialog.current?.close()}>Cancelar</button>
          <button className={styles.save} disabled={saving || !files.length}>{saving ? <><LoaderCircle className={styles.spin} size={17} aria-hidden="true" />Guardando…</> : <><Upload size={17} aria-hidden="true" />Guardar documento</>}</button></footer>
        <span className={styles.srOnly} role="status">{saving ? "Preparando y guardando el compromiso…" : ""}</span>
      </form>
    </dialog>
  </div>;
}
