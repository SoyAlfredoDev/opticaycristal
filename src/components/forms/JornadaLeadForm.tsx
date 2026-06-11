"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PaperPlaneTilt, CheckCircle } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface FormData {
  responsable: string;
  cargo: string;
  empresa: string;
  mesEstimado: string;
}

interface FormErrors {
  responsable?: string;
  cargo?: string;
  empresa?: string;
  mesEstimado?: string;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getMesOptions() {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: `${MESES[date.getMonth()]} ${date.getFullYear()}`,
    });
  }
  return options;
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.responsable.trim()) errors.responsable = "Ingresa el nombre de la persona responsable.";
  if (!data.cargo.trim()) errors.cargo = "Ingresa el cargo.";
  if (!data.empresa.trim()) errors.empresa = "Ingresa el nombre de la empresa.";
  if (!data.mesEstimado) errors.mesEstimado = "Selecciona el mes estimado del operativo.";
  return errors;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export default function JornadaLeadForm() {
  const [formData, setFormData] = useState<FormData>({
    responsable: "",
    cargo: "",
    empresa: "",
    mesEstimado: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const mesOptions = getMesOptions();

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setIsSuccess(true);
    setFormData({ responsable: "", cargo: "", empresa: "", mesEstimado: "" });
  };

  return (
    <div className="flyer-value-card relative overflow-hidden p-5 sm:p-7 lg:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-mist/60" aria-hidden />
      <div className="relative mb-6 border-b-2 border-primary/15 pb-5">
        <h3 className="mb-1 text-lg font-extrabold uppercase tracking-tight text-brand-dark sm:text-xl">Solicita tu jornada</h3>
        <p className="text-sm text-text-secondary">Completa el formulario y te contactamos en 48 horas hábiles.</p>
      </div>
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: EASE }}
            role="alert"
            className="flex flex-col items-center px-2 py-8 text-center"
          >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
              <CheckCircle size={36} weight="fill" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-text-primary">Solicitud enviada con éxito</h3>
            <p className="mb-6 max-w-sm leading-relaxed text-text-secondary">
              Recibimos tu solicitud. Nos comunicaremos contigo pronto para coordinar los detalles de la jornada.
            </p>
            <Button variant="outline" onClick={() => setIsSuccess(false)}>
              Enviar otra solicitud
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-4 sm:space-y-5"
            noValidate
          >
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
              label="Mes estimado del operativo"
              name="mesEstimado"
              value={formData.mesEstimado}
              onChange={(e) => handleChange("mesEstimado", e.target.value)}
              error={errors.mesEstimado}
              options={mesOptions}
              required
            />
            <Button
              type="submit"
              size="lg"
              className="mt-1 w-full min-h-[52px] text-base"
              disabled={isSubmitting}
              icon={<PaperPlaneTilt size={16} weight="bold" />}
            >
              {isSubmitting ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
