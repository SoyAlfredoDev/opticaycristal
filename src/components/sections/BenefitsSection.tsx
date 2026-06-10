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
    <section id="beneficios" className="section-y relative overflow-hidden bg-muted">
      <div className="circle-decoration circle-decoration--ring absolute -right-12 top-1/2 h-[240px] w-[240px] -translate-y-1/2 opacity-30" />

      <div className="container-site relative z-10">
        <Reveal className="mb-14 max-w-2xl lg:mb-16">
          <h2 className="mb-5 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-text-primary md:text-4xl lg:text-[2.75rem]">
            Un beneficio que funciona para todos
          </h2>
          <p className="max-w-[60ch] text-lg leading-relaxed text-text-secondary">
            Diseñado para generar impacto positivo desde el primer día, optimizando el tiempo empresarial y la calidad de vida laboral.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <Reveal direction="left">
            <div className="card-float h-full p-8 lg:p-10">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Buildings size={26} weight="regular" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-text-primary">
                  Para la empresa
                </h3>
              </div>
              <ul className="space-y-4">
                {companyBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle
                      size={20}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-primary"
                    />
                    <span className="leading-relaxed text-text-secondary">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal direction="right" delay={0.1}>
            <div className="card-float h-full border-primary/10 bg-primary-mist/40 p-8 lg:p-10">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Users size={26} weight="regular" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-text-primary">
                  Para los trabajadores
                </h3>
              </div>
              <ul className="space-y-4">
                {employeeBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle
                      size={20}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-primary"
                    />
                    <span className="leading-relaxed text-text-secondary">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
