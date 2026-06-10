"use client";

import { Buildings, Users, CheckCircle } from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";

const companyBenefits = [
  "Ahorro en horas laborales perdidas por traslados.",
  "Coordinación simple y sin costo para la empresa.",
  "Mayor productividad y concentración del equipo.",
  "Mejora en retención con un beneficio muy valorado.",
];

const employeeBenefits = [
  "Atención en el lugar de trabajo, sin traslados.",
  "Sin salas de espera ni permisos complicados.",
  "Asesoría experta para adquirir lentes ópticos.",
  "Mejora inmediata en calidad de vida y bienestar.",
];

export default function BenefitsSection() {
  return (
    <section id="beneficios" className="py-24 lg:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight mb-4 text-balance">
            Un beneficio que funciona para todos
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed max-w-[65ch]">
            Diseñado para generar impacto positivo desde el primer día, optimizando el tiempo empresarial y la calidad de vida laboral.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <Reveal direction="left">
            <div className="h-full rounded-[var(--radius-shell)] p-1.5 ring-1 ring-black/[0.04] shadow-brand">
              <div className="h-full rounded-[var(--radius-inner)] bg-surface p-8 lg:p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-primary-soft text-primary rounded-2xl flex items-center justify-center">
                    <Buildings size={24} weight="regular" />
                  </div>
                  <h3 className="text-2xl font-bold text-text-primary tracking-tight">
                    Para la empresa
                  </h3>
                </div>
                <ul className="space-y-4">
                  {companyBenefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle
                        size={20}
                        weight="fill"
                        className="text-primary shrink-0 mt-0.5"
                      />
                      <span className="text-text-secondary leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          <Reveal direction="right" delay={0.1}>
            <div className="h-full rounded-[var(--radius-shell)] p-1.5 ring-1 ring-primary/10 shadow-brand-lg">
              <div className="h-full rounded-[var(--radius-inner)] bg-primary p-8 lg:p-10 text-surface">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-surface/15 rounded-2xl flex items-center justify-center">
                    <Users size={24} weight="regular" className="text-surface" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">Para los trabajadores</h3>
                </div>
                <ul className="space-y-4">
                  {employeeBenefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle
                        size={20}
                        weight="fill"
                        className="text-surface/80 shrink-0 mt-0.5"
                      />
                      <span className="text-surface/85 leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
