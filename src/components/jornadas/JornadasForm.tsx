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
    const mes = MESES[date.getMonth()];
    const año = date.getFullYear();
    options.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: `${mes} ${año}`,
    });
  }

  return options;
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.responsable.trim()) {
    errors.responsable = "Ingresa el nombre de la persona responsable.";
  }
  if (!data.cargo.trim()) {
    errors.cargo = "Ingresa el cargo.";
  }
  if (!data.empresa.trim()) {
    errors.empresa = "Ingresa el nombre de la empresa.";
  }
  if (!data.mesEstimado) {
    errors.mesEstimado = "Selecciona el mes estimado del operativo.";
  }

  return errors;
}

export default function JornadasForm() {
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
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    // TODO: integrar con Resend para envío de correo electrónico
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSubmitting(false);
    setIsSuccess(true);
    setFormData({ responsable: "", cargo: "", empresa: "", mesEstimado: "" });
  };

  return (
    <section id="solicitar" className="py-24 lg:py-32 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight mb-4 text-balance">
              Solicita tu jornada oftalmológica
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed max-w-[65ch] mb-8">
              Completa el formulario y nos pondremos en contacto contigo para coordinar fecha, logística y detalles del operativo en tu empresa.
            </p>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle size={18} weight="fill" className="text-primary shrink-0" />
                Sin costo para la empresa
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={18} weight="fill" className="text-primary shrink-0" />
                Atención con tecnólogos médicos
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={18} weight="fill" className="text-primary shrink-0" />
                Respuesta en un plazo de 48 horas hábiles
              </li>
            </ul>
          </div>

          <div className="rounded-[var(--radius-shell)] p-1.5 ring-1 ring-black/[0.04] shadow-brand-lg">
            <div className="rounded-[var(--radius-inner)] bg-background p-6 md:p-8">
              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    role="alert"
                    className="flex flex-col items-center text-center py-8 px-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-5">
                      <CheckCircle size={36} weight="fill" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">
                      Solicitud enviada con éxito
                    </h3>
                    <p className="text-text-secondary leading-relaxed max-w-sm mb-6">
                      Recibimos tu solicitud. Nos comunicaremos contigo pronto para coordinar los detalles de la jornada.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setIsSuccess(false)}
                    >
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
                    className="space-y-5"
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
                      className="w-full mt-2"
                      disabled={isSubmitting}
                      icon={<PaperPlaneTilt size={16} weight="bold" />}
                    >
                      {isSubmitting ? "Enviando..." : "Enviar solicitud"}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
