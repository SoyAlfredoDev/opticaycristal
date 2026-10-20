"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { whatsappUrl } from "@/components/site/content";
import { getMesOptions, getMesLabel } from "@/lib/jornada-form";
import site from "@/components/site/Site.module.css";
import styles from "@/components/site/Views.module.css";
import local from "./JornadaQuickForm.module.css";

type Details = { empresa: string; personas: string; mes: string; direccion: string };
type Errors = Partial<Record<keyof Details, string>>;
const empty: Details = { empresa: "", personas: "", mes: "", direccion: "" };

export default function JornadaQuickForm() {
  const uid = useId();
  const form = useRef<HTMLFormElement>(null);
  const [data, setData] = useState<Details>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const months = getMesOptions();

  function update(key: keyof Details, value: string) {
    setData((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Errors = {};
    if (data.empresa.trim().length < 2) next.empresa = "Ingresa el nombre de la empresa.";
    if (!/^\d+$/.test(data.personas) || Number(data.personas) < 1 || Number(data.personas) > 1000000) next.personas = "Ingresa una cantidad válida de personas.";
    if (!months.some((month) => month.value === data.mes)) next.mes = "Selecciona un mes estimado.";
    if (data.direccion.trim().length < 5) next.direccion = "Ingresa la dirección, con comuna o ciudad.";
    setErrors(next);
    if (Object.keys(next).length) {
      const first = Object.keys(next)[0];
      form.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const message = [
      "Hola, quiero coordinar una jornada óptica para mi empresa.",
      `Empresa: ${data.empresa.trim()}`,
      `Cantidad de personas: ${Number(data.personas)}`,
      `Fecha estimada: ${getMesLabel(data.mes)}`,
      `Dirección: ${data.direccion.trim()}`,
    ].join("\n");
    window.location.assign(whatsappUrl(message));
  }

  function feedback(key: keyof Details) {
    return errors[key] ? <span className={styles.fieldError} id={`${uid}-${key}-error`} role="alert">{errors[key]}</span> : null;
  }

  return <div id="solicitar-jornada" className={`${styles.formCard} ${local.card}`}>
    <h2 id={`${uid}-title`}>Solicita tu jornada</h2>
    <p>Completa estos cuatro datos y conversemos por WhatsApp.</p>
    <form ref={form} aria-labelledby={`${uid}-title`} onSubmit={submit} noValidate>
      <div className={styles.formGrid}>
        <div className={`${styles.field} ${styles.fullField}`}>
          <label htmlFor={`${uid}-empresa`}>Nombre de la empresa</label>
          <input id={`${uid}-empresa`} name="empresa" autoComplete="organization" required maxLength={190} value={data.empresa} onChange={(event) => update("empresa", event.target.value)} aria-invalid={!!errors.empresa} aria-describedby={errors.empresa ? `${uid}-empresa-error` : undefined} />
          {feedback("empresa")}
        </div>
        <div className={styles.field}>
          <label htmlFor={`${uid}-personas`}>Cantidad de personas</label>
          <input id={`${uid}-personas`} name="personas" type="number" inputMode="numeric" min={1} max={1000000} step={1} required value={data.personas} onChange={(event) => update("personas", event.target.value)} aria-invalid={!!errors.personas} aria-describedby={errors.personas ? `${uid}-personas-error` : undefined} />
          {feedback("personas")}
        </div>
        <div className={styles.field}>
          <label htmlFor={`${uid}-mes`}>Fecha estimada</label>
          <select id={`${uid}-mes`} name="mes" required value={data.mes} onChange={(event) => update("mes", event.target.value)} aria-invalid={!!errors.mes} aria-describedby={errors.mes ? `${uid}-mes-error` : undefined}>
            <option value="">Selecciona un mes</option>
            {months.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
          </select>
          {feedback("mes")}
        </div>
        <div className={`${styles.field} ${styles.fullField}`}>
          <label htmlFor={`${uid}-direccion`}>Dirección del operativo</label>
          <input id={`${uid}-direccion`} name="direccion" autoComplete="street-address" required maxLength={250} placeholder="Calle, número y comuna o ciudad" value={data.direccion} onChange={(event) => update("direccion", event.target.value)} aria-invalid={!!errors.direccion} aria-describedby={errors.direccion ? `${uid}-direccion-error` : undefined} />
          {feedback("direccion")}
        </div>
      </div>
      <button type="submit" className={`${site.button} ${site.primary} ${styles.submit}`}>Continuar por WhatsApp<ArrowUpRight size={18} aria-hidden="true" /></button>
      <p className={local.note}>Se abrirá WhatsApp con tu mensaje preparado. Tú decides cuándo enviarlo.</p>
    </form>
  </div>;
}
