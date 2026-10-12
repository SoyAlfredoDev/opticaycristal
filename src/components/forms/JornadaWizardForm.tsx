"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  PencilSimple,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  CHILE_REGIONES,
  EMPTY_JORNADA_FORM,
  getMesLabel,
  getMesOptions,
  submitJornadaRequest,
  validateConfirmacion,
  validateContacto,
  validateEmpresa,
  type JornadaFormData,
  type JornadaFormErrors,
} from "@/lib/jornada-form";

const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  { id: 1, label: "Contacto" },
  { id: 2, label: "Empresa" },
  { id: 3, label: "Confirmar" },
] as const;

type Step = (typeof STEPS)[number]["id"];

function validateStep(step: Step, data: JornadaFormData) {
  if (step === 1) return validateContacto(data);
  if (step === 2) return validateEmpresa(data);
  return validateConfirmacion(data);
}

export default function JornadaWizardForm({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<JornadaFormData>(EMPTY_JORNADA_FORM);
  const [errors, setErrors] = useState<JornadaFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sitioWeb, setSitioWeb] = useState("");

  const mesOptions = useMemo(() => getMesOptions(), []);
  const regionOptions = useMemo(
    () => CHILE_REGIONES.map((region) => ({ value: region, label: region })),
    []
  );

  const handleChange = <K extends keyof JornadaFormData>(field: K, value: JornadaFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const goToStep = (next: Step) => {
    setErrors({});
    setStep(next);
  };

  const handleContinue = () => {
    const nextErrors = validateStep(step, formData);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    goToStep((step + 1) as Step);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const nextErrors = {
      ...validateContacto(formData),
      ...validateEmpresa(formData),
      ...validateConfirmacion(formData),
    };

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.responsable || nextErrors.cargo || nextErrors.telefono || nextErrors.correo) {
        setStep(1);
      } else if (nextErrors.empresa || nextErrors.region || nextErrors.mesEstimado) {
        setStep(2);
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitJornadaRequest(formData, sitioWeb);
      setIsSuccess(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "No pudimos enviar la solicitud. Inténtalo de nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_JORNADA_FORM);
    setErrors({});
    setStep(1);
    setIsSuccess(false);
    setIsSubmitting(false);
    setSubmitError(null);
    setSitioWeb("");
  };

  if (isSuccess) {
    return (
      <motion.div
        key="success"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        role="status"
        className="flex flex-col items-center px-1 py-6 text-center sm:py-8"
      >
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
          <CheckCircle size={36} weight="fill" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-text-primary">Solicitud enviada con éxito</h3>
        <p className="mb-6 max-w-sm leading-relaxed text-text-secondary">
          Recibimos tu solicitud. Nos comunicaremos contigo pronto para coordinar los detalles de la jornada.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button variant="outline" className="min-h-[48px] w-full sm:w-auto" onClick={resetForm}>
            Enviar otra solicitud
          </Button>
          {onClose && (
            <Button className="min-h-[48px] w-full sm:w-auto" onClick={onClose}>
              Cerrar
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <form
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={(event) => {
        event.preventDefault();
        if (isSubmitting) return;
        if (step < 3) handleContinue();
        else void handleSubmit();
      }}
      noValidate
    >
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Sitio web
          <input
            type="text"
            name="sitioWeb"
            tabIndex={-1}
            autoComplete="off"
            value={sitioWeb}
            onChange={(event) => setSitioWeb(event.target.value)}
          />
        </label>
      </div>
      <ol className="mb-4 flex shrink-0 items-center gap-1 sm:mb-5 sm:gap-2" aria-label="Progreso de la solicitud">
        {STEPS.map((item, index) => {
          const complete = step > item.id;
          const current = step === item.id;

          return (
            <li key={item.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 ${
                    current || complete
                      ? "bg-primary text-white"
                      : "bg-muted text-text-tertiary"
                  }`}
                  aria-current={current ? "step" : undefined}
                >
                  {complete ? <CheckCircle size={14} weight="fill" /> : item.id}
                </span>
                <span
                  className={`truncate text-[11px] font-semibold sm:text-sm ${
                    current ? "text-brand-dark" : "text-text-tertiary"
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <span
                  className={`mx-1 hidden h-px flex-1 sm:block ${
                    complete ? "bg-primary/40" : "bg-border"
                  }`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="sr-only">
        Paso {step} de 3: {STEPS[step - 1].label}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-lg font-bold text-brand-dark">Datos personales y de contacto</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Indícanos quién coordinará la jornada para contactarte.
                </p>
              </div>
              <Input
                label="Persona responsable"
                name="responsable"
                value={formData.responsable}
                onChange={(e) => handleChange("responsable", e.target.value)}
                error={errors.responsable}
                placeholder="Ej. María González"
                autoComplete="name"
                required
              />
              <Input
                label="Cargo"
                name="cargo"
                value={formData.cargo}
                onChange={(e) => handleChange("cargo", e.target.value)}
                error={errors.cargo}
                placeholder="Ej. Jefe de RRHH"
                autoComplete="organization-title"
                required
              />
              <Input
                label="Teléfono"
                name="telefono"
                type="tel"
                inputMode="tel"
                value={formData.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
                error={errors.telefono}
                placeholder="Ej. +56 9 1234 5678"
                autoComplete="tel"
                required
              />
              <Input
                label="Correo electrónico"
                name="correo"
                type="email"
                inputMode="email"
                value={formData.correo}
                onChange={(e) => handleChange("correo", e.target.value)}
                error={errors.correo}
                placeholder="Ej. nombre@empresa.cl"
                autoComplete="email"
                required
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-lg font-bold text-brand-dark">Datos de la empresa y jornada</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  No necesitamos una fecha exacta. Basta con un mes estimado.
                </p>
              </div>
              <Input
                label="Nombre de la empresa"
                name="empresa"
                value={formData.empresa}
                onChange={(e) => handleChange("empresa", e.target.value)}
                error={errors.empresa}
                placeholder="Ej. Empresa SpA"
                autoComplete="organization"
                required
              />
              <Select
                label="Región"
                name="region"
                value={formData.region}
                onChange={(e) => handleChange("region", e.target.value)}
                error={errors.region}
                options={regionOptions}
                placeholder="Selecciona una región"
                required
              />
              <Select
                label="Mes estimado del operativo"
                name="mesEstimado"
                value={formData.mesEstimado}
                onChange={(e) => handleChange("mesEstimado", e.target.value)}
                error={errors.mesEstimado}
                options={mesOptions}
                placeholder="Selecciona un mes"
                required
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-lg font-bold text-brand-dark">Confirma tu solicitud</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Revisa los datos. Puedes volver atrás y modificar cualquier información.
                </p>
              </div>

              <SummaryCard
                title="Contacto"
                onEdit={() => goToStep(1)}
                rows={[
                  { label: "Persona responsable", value: formData.responsable },
                  { label: "Cargo", value: formData.cargo },
                  { label: "Teléfono", value: formData.telefono },
                  { label: "Correo electrónico", value: formData.correo },
                ]}
              />
              <SummaryCard
                title="Empresa y jornada"
                onEdit={() => goToStep(2)}
                rows={[
                  { label: "Empresa", value: formData.empresa },
                  { label: "Región", value: formData.region },
                  { label: "Mes estimado", value: getMesLabel(formData.mesEstimado) },
                ]}
              />

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <label className="flex items-start gap-3 text-sm leading-relaxed text-text-primary">
                  <input
                    type="checkbox"
                    name="autorizacionDatos"
                    checked={formData.autorizacionDatos}
                    onChange={(e) => handleChange("autorizacionDatos", e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary accent-primary"
                    required
                    aria-invalid={errors.autorizacionDatos ? "true" : "false"}
                    aria-describedby={errors.autorizacionDatos ? "autorizacion-error" : undefined}
                  />
                  <span>
                    He leído y autorizo el tratamiento de mis datos personales para gestionar esta
                    solicitud y ser contactado por Óptica y Cristal.{" "}
                    <a
                      href="/privacidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      Política de Privacidad
                    </a>
                    .
                  </span>
                </label>
                {errors.autorizacionDatos && (
                  <p id="autorizacion-error" className="mt-2 text-sm text-primary" role="alert">
                    {errors.autorizacionDatos}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {submitError && (
        <p className="mt-3 text-sm text-primary" role="alert">
          {submitError}
        </p>
      )}

      <div className="mt-4 flex shrink-0 flex-col-reverse gap-3 border-t border-border/70 bg-white pt-4 sm:flex-row sm:items-center sm:justify-between">
        {step > 1 ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-[48px] w-full sm:w-auto"
            onClick={() => goToStep((step - 1) as Step)}
            disabled={isSubmitting}
          >
            <span className="inline-flex items-center gap-2">
              <ArrowLeft size={16} weight="bold" />
              Atrás
            </span>
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}

        {step < 3 ? (
          <Button
            type="submit"
            className="min-h-[48px] w-full sm:w-auto"
            icon={<ArrowRight size={16} weight="bold" />}
          >
            Continuar
          </Button>
        ) : (
          <Button
            type="submit"
            className="min-h-[48px] w-full sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Enviando..." : "Confirmar"}
          </Button>
        )}
      </div>
    </form>
  );
}

function SummaryCard({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: { label: string; value: string }[];
  onEdit: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold uppercase tracking-wide text-brand-dark">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-[36px] items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          <PencilSimple size={14} weight="bold" />
          Editar
        </button>
      </div>
      <dl className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
            <dt className="text-xs font-medium text-text-tertiary">{row.label}</dt>
            <dd className="break-words text-sm font-semibold text-text-primary">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
