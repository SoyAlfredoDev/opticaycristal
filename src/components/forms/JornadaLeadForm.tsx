"use client";

import { CalendarBlank, Buildings, User, ArrowRight } from "@phosphor-icons/react";
import SolicitarJornadaButton from "@/components/forms/SolicitarJornadaButton";

const steps = [
  { icon: User, label: "Contacto" },
  { icon: Buildings, label: "Empresa" },
  { icon: CalendarBlank, label: "Confirmar" },
];

export default function JornadaLeadForm() {
  return (
    <div className="flyer-value-card relative overflow-hidden p-5 sm:p-7 lg:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-mist/60" aria-hidden />
      <div className="relative mb-6 border-b-2 border-primary/15 pb-5">
        <h3 className="mb-1 text-lg font-extrabold uppercase tracking-tight text-brand-dark sm:text-xl">
          Solicita tu jornada
        </h3>
        <p className="text-sm text-text-secondary">
          Completa un formulario breve en 3 pasos. Te contactamos en 48 horas hábiles.
        </p>
      </div>

      <ol className="relative mb-6 space-y-3">
        {steps.map((item, index) => {
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon size={16} weight="regular" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
                  Paso {index + 1}
                </p>
                <p className="text-sm font-semibold text-brand-dark">{item.label}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <SolicitarJornadaButton
        size="lg"
        className="w-full min-h-[52px] text-base"
        icon={<ArrowRight size={16} weight="bold" />}
      >
        Solicitar jornada
      </SolicitarJornadaButton>
    </div>
  );
}
