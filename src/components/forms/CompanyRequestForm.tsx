"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { CHILE_REGIONES, getMesOptions, validateContacto } from "@/lib/jornada-form";
import { CONVENIO, convenioInterests, isConvenioInterest } from "@/lib/convenios";
import { emptyCompanyRequest, submitCompanyRequest, validateCompanyRequest, type CompanyErrors, type CompanyRequest, type RequestDetails, type RequestKind } from "@/lib/company-request";
import site from "@/components/site/Site.module.css";
import styles from "@/components/site/Views.module.css";
type FieldKey = Exclude<keyof CompanyRequest, "origen" | "detalles" | "autorizacionDatos"> | keyof RequestDetails;
type FieldSpec = { key: FieldKey; label: string; type?: "text" | "email" | "tel" | "number" | "date"; autoComplete?: string; required?: boolean; max?: number; full?: boolean };
const CONVENIO_STEPS = [
  { id: 1, label: "Quién lo lleva" },
  { id: 2, label: "La empresa" },
  { id: 3, label: "Confirmación" },
] as const;
type ConvenioStep = (typeof CONVENIO_STEPS)[number]["id"];
const COMPANY_ERROR_KEYS = ["empresa", "region", "trabajadores", "comuna", "rutEmpresa", "modalidadConvenio"] as const;
function convenioCompanyErrors(data: CompanyRequest): CompanyErrors {
  const all = validateCompanyRequest(data);
  return Object.fromEntries(COMPANY_ERROR_KEYS.flatMap((key) => all[key] ? [[key, all[key]]] : []));
}
const commonFields: readonly FieldSpec[] = [
  { key: "empresa", label: "Nombre de la empresa", autoComplete: "organization", required: true, max: 190 },
  { key: "responsable", label: "Nombre de contacto", autoComplete: "name", required: true, max: 160 },
  { key: "cargo", label: "Cargo", autoComplete: "organization-title", required: true, max: 160 },
  { key: "correo", label: "Correo electrónico", type: "email", autoComplete: "email", required: true, max: 190 },
  { key: "telefono", label: "Teléfono", type: "tel", autoComplete: "tel", required: true, max: 40 },
];
export function CompanyRequestForm({ kind }: { kind: RequestKind }) {
  const [data, setData] = useState(() => emptyCompanyRequest(kind));
  const [errors, setErrors] = useState<CompanyErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");
  const [failure, setFailure] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [step, setStep] = useState<ConvenioStep>(1);
  const successRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [focusToken, setFocusToken] = useState(0);
  const pendingFocus = useRef(false);
  const previousStep = useRef(step);
  const submitting = useRef(false);
  const uid = useId();
  const convenio = kind === "convenio";
  const anchor = convenio ? "solicitar-convenio" : "solicitar-jornada";
  const months = getMesOptions();
  useEffect(() => { if (status === "success") successRef.current?.focus(); }, [status]);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    headingRef.current?.focus();
  }, [step]);
  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusToken]);
  function focusInvalid() { pendingFocus.current = true; setFocusToken((value) => value + 1); }
  function update(key: FieldKey | "region" | "mesEstimado" | "autorizacionDatos", value: string | boolean) {
    setData((previous) => {
      if (key in previous) return { ...previous, [key]: value };
      return { ...previous, detalles: { ...previous.detalles, [key]: key === "trabajadores" ? value === "" ? undefined : Number(value) : value } };
    });
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }
  function advance() {
    const nextErrors = step === 1 ? validateContacto(data) : convenioCompanyErrors(data);
    setErrors(nextErrors); setFailure("");
    if (Object.keys(nextErrors).length) { focusInvalid(); return; }
    setStep((current) => current === 1 ? 2 : 3);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (convenio && step < 3) { advance(); return; }
    if (submitting.current) return;
    const nextErrors = validateCompanyRequest(data);
    setErrors(nextErrors); setFailure("");
    if (Object.keys(nextErrors).length) {
      if (convenio && Object.keys(validateContacto(data)).length) setStep(1);
      else if (convenio && Object.keys(convenioCompanyErrors(data)).length) setStep(2);
      focusInvalid();
      return;
    }
    submitting.current = true; setStatus("sending");
    try { await submitCompanyRequest(data, honeypot); setStatus("success"); }
    catch (error) { setFailure(error instanceof Error ? error.message : "No pudimos enviar la solicitud."); setStatus("idle"); }
    finally { submitting.current = false; }
  }
  if (status === "success") return <div id={anchor} ref={successRef} className={`${styles.formCard} ${styles.success}`} role="status" tabIndex={-1}>
    <CheckCircle2 strokeWidth={1.4} aria-hidden="true" /><h2>Recibimos tu solicitud</h2><p>{convenio ? "Te contactaremos para registrar tu empresa y dejar el beneficio disponible para tus trabajadores y sus familiares. Las cuotas por nómina se habilitan con un contrato." : "Te contactaremos para revisar disponibilidad y coordinar los detalles de la jornada."}</p>
    <button className={`${site.button} ${site.outline}`} type="button" onClick={() => { setData(emptyCompanyRequest(kind)); setHoneypot(""); setErrors({}); setStep(1); setStatus("idle"); }}>Enviar otra solicitud</button>
  </div>;
  const fields: readonly FieldSpec[] = convenio ? [] : [
    ...commonFields,
    { key: "trabajadores", label: "Participantes estimados (opcional)", type: "number" },
    { key: "comuna", label: "Comuna", required: true, max: 120 },
    { key: "fechaTentativa", label: "Fecha tentativa (opcional)", type: "date" },
    { key: "direccion", label: "Dirección de la jornada (opcional)", max: 250, full: true },
  ];
  const personFields = commonFields.slice(1);
  const companyFields: readonly FieldSpec[] = [
    commonFields[0],
    { key: "rutEmpresa", label: "RUT de la empresa (opcional)", max: 16 },
    { key: "trabajadores", label: "Número de trabajadores", type: "number", required: true },
    { key: "comuna", label: "Comuna", required: true, max: 120 },
  ];
  function renderField(field: FieldSpec) {
    const id = `${uid}-${field.key}`;
    const value = field.key in data ? data[field.key as keyof CompanyRequest] : data.detalles?.[field.key as keyof RequestDetails];
    return <div key={field.key} className={`${styles.field} ${field.full ? styles.fullField : ""}`}><label htmlFor={id}>{field.label}</label>
      <input id={id} name={field.key} type={field.type ?? "text"} autoComplete={field.autoComplete} required={field.required} maxLength={field.max}
        min={field.type === "number" ? convenio ? CONVENIO.minWorkers : 1 : undefined} max={field.type === "number" ? 1000000 : undefined} step={field.type === "number" ? 1 : undefined}
        value={typeof value === "string" || typeof value === "number" ? value : ""} onChange={(event) => update(field.key, event.target.value)}
        aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? `${id}-error` : undefined} />
      {errors[field.key] ? <span id={`${id}-error`} className={styles.fieldError}>{errors[field.key]}</span> : null}
    </div>;
  }
  const regionField = <div className={styles.field}><label htmlFor={`${uid}-region`}>Región</label><select id={`${uid}-region`} name="region" value={data.region} onChange={(event) => update("region", event.target.value)} required aria-invalid={!!errors.region} aria-describedby={errors.region ? `${uid}-region-error` : undefined}>
    <option value="">Selecciona una región</option>{CHILE_REGIONES.map((region) => <option key={region}>{region}</option>)}
  </select>{errors.region ? <span id={`${uid}-region-error`} className={styles.fieldError}>{errors.region}</span> : null}</div>;
  const interest = data.detalles?.modalidadConvenio;
  const convenioCopy = {
    1: ["Quién lleva el convenio", "Datos de la persona de tu empresa que coordinará el beneficio."],
    2: ["Datos de tu empresa", "El convenio queda a nombre de la empresa. El beneficio es para trabajadores y familiares."],
    3: ["Confirma la solicitud", "Revisa los datos antes de enviar. Esta solicitud no firma un contrato."],
  } as const;
  return <div id={anchor} className={styles.formCard}>
    <h2 id="request-form-title" ref={headingRef} tabIndex={-1}>{convenio ? convenioCopy[step][0] : "Solicita una jornada"}</h2>
    {convenio ? <ol className={styles.wizardSteps} aria-label="Progreso de la solicitud">{CONVENIO_STEPS.map((item) => <li key={item.id} aria-current={step === item.id ? "step" : undefined}><span>{item.id}</span>{item.label}</li>)}</ol> : null}
    <p>{convenio ? convenioCopy[step][1] : "Completa el formulario y te contactaremos para revisar los detalles. Los campos opcionales están indicados."}</p>
    <form ref={formRef} aria-labelledby="request-form-title" onSubmit={submit} noValidate aria-busy={status === "sending"}>
      <div className={styles.honeypot} aria-hidden="true"><label>Sitio web<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} /></label></div>
      {convenio && step === 1 ? <div className={styles.formGrid}>{personFields.map(renderField)}</div> : null}
      {convenio && step === 2 ? <div className={styles.formGrid}>
        {companyFields.map(renderField)}
        {regionField}
        <div className={`${styles.field} ${styles.fullField}`}><label htmlFor={`${uid}-interest`}>¿Qué le interesa a tu empresa? (opcional)</label><select id={`${uid}-interest`} name="modalidadConvenio" value={interest ?? ""} onChange={(event) => {
          const value = event.target.value;
          setData(previous => ({ ...previous, detalles: { ...previous.detalles, modalidadConvenio: isConvenioInterest(value) ? value : undefined } }));
          setErrors(previous => ({ ...previous, modalidadConvenio: undefined }));
        }} aria-invalid={!!errors.modalidadConvenio} aria-describedby={errors.modalidadConvenio ? `${uid}-interest-error` : undefined}><option value="">Selecciona una opción</option>{Object.entries(convenioInterests).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errors.modalidadConvenio ? <span className={styles.fieldError} id={`${uid}-interest-error`}>{errors.modalidadConvenio}</span> : null}</div>
      </div> : null}
      {convenio && step === 2 ? <p className={styles.status}>Para empresas con 5 o más trabajadores.</p> : null}
      {convenio && step === 3 ? <div className={styles.summary}>
        <section><h3>Quién lo lleva</h3><dl>
          <div><dt>Nombre</dt><dd>{data.responsable}</dd></div>
          <div><dt>Cargo</dt><dd>{data.cargo}</dd></div>
          <div><dt>Correo</dt><dd>{data.correo}</dd></div>
          <div><dt>Teléfono</dt><dd>{data.telefono}</dd></div>
        </dl><button type="button" onClick={() => setStep(1)}>Corregir contacto</button></section>
        <section><h3>La empresa</h3><dl>
          <div><dt>Empresa</dt><dd>{data.empresa}</dd></div>
          {data.detalles?.rutEmpresa ? <div><dt>RUT</dt><dd>{data.detalles.rutEmpresa}</dd></div> : null}
          <div><dt>Trabajadores</dt><dd>{data.detalles?.trabajadores}</dd></div>
          <div><dt>Comuna</dt><dd>{data.detalles?.comuna}</dd></div>
          <div><dt>Región</dt><dd>{data.region}</dd></div>
          {interest ? <div><dt>Interés</dt><dd>{convenioInterests[interest]}</dd></div> : null}
        </dl><button type="button" onClick={() => setStep(2)}>Corregir empresa</button></section>
        <label className={`${styles.field} ${styles.fullField}`}>Comentarios o preguntas sobre el convenio (opcional)<textarea name="comentarios" maxLength={2000} value={data.detalles?.comentarios ?? ""} onChange={(event) => update("comentarios", event.target.value)} /></label>
      </div> : null}
      {convenio && step === 3 ? <p className={styles.status}>Las cuotas por nómina, si las quieres, se habilitan con un contrato.</p> : null}
      {!convenio ? <div className={styles.formGrid}>{fields.map(renderField)}
        {regionField}
        <div className={styles.field}><label htmlFor={`${uid}-month`}>Mes estimado</label><select id={`${uid}-month`} name="mesEstimado" value={data.mesEstimado} onChange={(event) => update("mesEstimado", event.target.value)} required aria-invalid={!!errors.mesEstimado} aria-describedby={errors.mesEstimado ? `${uid}-month-error` : undefined}>
          <option value="">Selecciona un mes</option>{months.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
        </select>{errors.mesEstimado ? <span id={`${uid}-month-error`} className={styles.fieldError}>{errors.mesEstimado}</span> : null}</div>
        <label className={`${styles.field} ${styles.fullField}`}>Comentarios o necesidades (opcional)<textarea name="comentarios" maxLength={2000} value={data.detalles?.comentarios ?? ""} onChange={(event) => update("comentarios", event.target.value)} /></label>
      </div> : null}
      {!convenio || step === 3 ? <label className={styles.consent}><input type="checkbox" name="autorizacionDatos" checked={data.autorizacionDatos} onChange={(event) => update("autorizacionDatos", event.target.checked)} required aria-invalid={!!errors.autorizacionDatos} aria-describedby={errors.autorizacionDatos ? `${uid}-consent-error` : undefined} />
        <span>Autorizo el tratamiento de mis datos para gestionar esta solicitud y ser contactado. He leído la <Link href="/privacidad" target="_blank" rel="noopener noreferrer">política de privacidad</Link>.</span>
      </label> : null}{errors.autorizacionDatos && (!convenio || step === 3) ? <p className={styles.fieldError} id={`${uid}-consent-error`}>{errors.autorizacionDatos}</p> : null}
      {failure ? <p role="alert" className={styles.status}>{failure}</p> : null}
      {convenio && step < 3 ? <div className={styles.wizardActions}>
        {step === 2 ? <button type="button" className={`${site.button} ${site.outline}`} onClick={() => setStep(1)}>Volver</button> : null}
        <button type="button" className={`${site.button} ${site.primary} ${styles.submit}`} onClick={advance}>Continuar<ArrowUpRight size={18} aria-hidden="true" /></button>
      </div> : <div className={convenio ? styles.wizardActions : undefined}>
        {convenio ? <button type="button" className={`${site.button} ${site.outline}`} onClick={() => setStep(2)}>Volver</button> : null}
        <button type="submit" className={`${site.button} ${site.primary} ${styles.submit}`} disabled={status === "sending"}>{status === "sending" ? "Enviando solicitud…" : convenio ? "Solicitar registro de mi empresa" : "Enviar solicitud de jornada"}<ArrowUpRight size={18} aria-hidden="true" /></button>
      </div>}
    </form>
  </div>;
}
