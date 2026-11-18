"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Layers, X } from "lucide-react";
import type { CategorySettings } from "@/lib/clients/category-types";
import type { CustomerProfile } from "@/lib/clients/types";
import { AdminCustomerCategory } from "./AdminCustomerCategory";
import wizard from "./AdminSales.module.css";

function LevelDialog({ customerId, currentTier, tiers, canEdit, onUpdated, onClose }: {
  customerId: string;
  currentTier: string;
  tiers: CustomerProfile["tier"][];
  canEdit: boolean;
  onUpdated: (settings: CategorySettings) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [settings, setSettings] = useState<CategorySettings | null>(
    canEdit ? null : { currentCategory: currentTier, tiers, history: [] });
  const [allowed, setAllowed] = useState(canEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    if (!canEdit) return;
    const controller = new AbortController();
    fetch(`/api/admin/clientes/${encodeURIComponent(customerId)}/categoria`, {
      cache: "no-store", signal: controller.signal,
    }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No pudimos consultar los niveles.");
      if (!controller.signal.aborted) {
        setSettings(data.settings);
        setAllowed(data.canEdit === true);
        setError("");
      }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [canEdit, customerId, revision]);

  return <dialog ref={dialog} className={wizard.levelDialog} aria-label="Niveles del cliente"
    onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <div className={wizard.levelDialogHeader}>
      <span>Financiamiento del cliente</span>
      <button className={wizard.secondary} type="button" disabled={saving} aria-label="Cerrar niveles" onClick={onClose}>
        <X size={19} aria-hidden="true" />
      </button>
    </div>
    {error ? <div className={wizard.levelDialogStatus}>
      <p role="alert">{error}</p><button type="button" className={wizard.secondary} onClick={() => setRevision(value => value + 1)}>Reintentar</button>
    </div> : settings ? <AdminCustomerCategory customerId={customerId} initial={settings} canEdit={allowed} showAllTiers
      onBusy={setSaving} onSettingsChange={onUpdated} onSaved={latest => { onUpdated(latest); onClose(); }} />
      : <p className={wizard.levelDialogStatus} role="status">Consultando los niveles disponibles…</p>}
  </dialog>;
}

export function SaleCustomerLevel({ customerId, currentTier, tiers, canEdit, disabled, onUpdated }: {
  customerId: string;
  currentTier: string;
  tiers: CustomerProfile["tier"][];
  canEdit: boolean;
  disabled: boolean;
  onUpdated: (settings: CategorySettings) => void;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  return <>
    <button type="button" className={wizard.levelButton} disabled={disabled}
      aria-haspopup="dialog" onClick={event => setTarget(event.currentTarget.closest("main") ?? document.body)}>
      <Layers size={15} aria-hidden="true" />{canEdit ? "Subir de nivel" : "Ver niveles"}
    </button>
    {target && createPortal(<LevelDialog customerId={customerId} currentTier={currentTier} tiers={tiers} canEdit={canEdit}
      onUpdated={onUpdated} onClose={() => setTarget(null)} />, target)}
  </>;
}
