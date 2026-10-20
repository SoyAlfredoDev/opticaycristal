"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { whatsappUrl } from "@/components/site/content";
import { CONVENIO } from "@/lib/convenios";
import site from "@/components/site/Site.module.css";
import styles from "@/components/site/Views.module.css";
import local from "./ConvenioQuickForm.module.css";

type Details = { empresa: string; personas: string };
type Errors = Partial<Record<keyof Details, string>>;
const empty: Details = { empresa: "", personas: "" };

export default function ConvenioQuickForm() {
  const uid = useId();
  const form = useRef<HTMLFormElement>(null);
  const [data, setData] = useState<Details>(empty);
  const [errors, setErrors] = useState<Errors>({});

  function update(key: keyof Details, value: string) {
    setData((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Errors = {};
    if (data.empresa.trim().length < 2) next.empresa = "Ingresa el nombre de la empresa.";
    if (!/^\d+$/.test(data.personas) || Number(data.personas) < CONVENIO.minWorkers || Number(data.personas) > 1000000) next.personas = `Los convenios son para empresas con ${CONVENIO.minWorkers} o más trabajadores.`;
    setErrors(next);
    if (Object.keys(next).length) {
      const first = Object.keys(next)[0];
      form.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const message = [
      "Hola, quiero información sobre el convenio óptico para mi empresa.",
      `Empresa: ${data.empresa.trim()}`,
      `Cantidad de trabajadores: ${Number(data.personas)}`,
    ].join("\n");
    window.location.assign(whatsappUrl(message));
  }

  function feedback(key: keyof Details) {
    return errors[key] ? <span className={styles.fieldError} id={`${uid}-${key}-error`} role="alert">{errors[key]}</span> : null;
  }

  return <div id="solicitar-convenio" className={`${styles.formCard} ${local.card}`}>
    <h2 id={`${uid}-title`}>Consulta por tu convenio</h2>
    <p>Solo necesitamos dos datos para comenzar.</p>
    <form ref={form} aria-labelledby={`${uid}-title`} onSubmit={submit} noValidate>
      <div className={styles.formGrid}>
        <div className={`${styles.field} ${styles.fullField}`}>
          <label htmlFor={`${uid}-empresa`}>Nombre de la empresa</label>
          <input id={`${uid}-empresa`} name="empresa" autoComplete="organization" required maxLength={190} value={data.empresa} onChange={(event) => update("empresa", event.target.value)} aria-invalid={!!errors.empresa} aria-describedby={errors.empresa ? `${uid}-empresa-error` : undefined} />
          {feedback("empresa")}
        </div>
        <div className={`${styles.field} ${styles.fullField}`}>
          <label htmlFor={`${uid}-personas`}>Cantidad de trabajadores</label>
          <input id={`${uid}-personas`} name="personas" type="number" inputMode="numeric" min={CONVENIO.minWorkers} max={1000000} step={1} required value={data.personas} onChange={(event) => update("personas", event.target.value)} aria-invalid={!!errors.personas} aria-describedby={errors.personas ? `${uid}-personas-error` : undefined} />
          {feedback("personas")}
        </div>
      </div>
      <button type="submit" className={`${site.button} ${site.primary} ${styles.submit}`}>Continuar por WhatsApp<ArrowUpRight size={18} aria-hidden="true" /></button>
      <p className={local.note}>Se abrirá WhatsApp con tu mensaje preparado. Tú decides cuándo enviarlo.</p>
    </form>
  </div>;
}
