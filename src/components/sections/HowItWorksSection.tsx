"use client";

import {
  ChatCircle,
  CalendarBlank,
  Truck,
  Eye,
  Eyeglasses,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

const steps = [
  {
    icon: ChatCircle,
    step: "01",
    title: "Solicitas información",
    description: "Nos contactas para evaluar el tamaño de tu equipo y recibir una propuesta.",
  },
  {
    icon: CalendarBlank,
    step: "02",
    title: "Coordinamos fecha",
    description: "Agendamos el día y los bloques de atención para tus colaboradores.",
  },
  {
    icon: Truck,
    step: "03",
    title: "Acudimos a la empresa",
    description: "Instalamos nuestro equipo en un espacio habilitado dentro de tus oficinas.",
  },
  {
    icon: Eye,
    step: "04",
    title: "Realizamos chequeos",
    description: "Tecnólogos médicos evalúan a cada trabajador y detectan problemas visuales.",
  },
  {
    icon: Eyeglasses,
    step: "05",
    title: "Asesoría y lentes",
    description: "Orientamos sobre salud visual y ofrecemos lentes a quienes los necesiten.",
  },
];

export default function HowItWorksSection({
  ctaHref = "/jornadas",
  ctaLabel = "Solicitar jornada",
}: {
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <section id="como-funciona" className="relative py-28 lg:py-36 bg-white overflow-hidden">
      {/* ── Decorative elements ── */}
      <div className="circle-decoration circle-decoration--warm absolute -bottom-20 -left-20 w-[300px] h-[300px]" />

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Reveal className="max-w-2xl mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">El proceso</p>
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-text-primary tracking-tight mb-5 text-balance leading-[1.12]">
            ¿Cómo funciona una jornada oftalmológica?
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed max-w-[60ch]">
            Nos encargamos de todo el proceso para que la experiencia sea fluida y sin complicaciones para la administración.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={index * 0.08}>
                <div className="group relative bg-white rounded-[var(--radius-shell)] p-6 ring-1 ring-black/[0.04] shadow-brand transition-all duration-500 ease-premium hover:-translate-y-1 hover:shadow-brand-hover h-full">
                  {/* Step number */}
                  <span className="text-5xl font-bold text-primary/[0.07] absolute top-4 right-5 select-none leading-none">
                    {step.step}
                  </span>

                  <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-5 transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                    <Icon size={22} weight="regular" />
                  </div>

                  <h3 className="text-base font-semibold text-text-primary mb-2 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {step.description}
                  </p>

                  {/* Connector line (desktop only) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-border" />
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-16 text-center" delay={0.3}>
          <Button href={ctaHref} size="lg">
            {ctaLabel}
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
