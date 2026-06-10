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
    title: "Solicitas información",
    description: "Nos contactas para evaluar el tamaño de tu equipo y recibir una propuesta.",
  },
  {
    icon: CalendarBlank,
    title: "Coordinamos fecha",
    description: "Agendamos el día y los bloques de atención para tus colaboradores.",
  },
  {
    icon: Truck,
    title: "Acudimos a la empresa",
    description: "Instalamos nuestro equipo en un espacio habilitado dentro de tus oficinas.",
  },
  {
    icon: Eye,
    title: "Realizamos chequeos",
    description: "Tecnólogos médicos evalúan a cada trabajador y detectan problemas visuales.",
  },
  {
    icon: Eyeglasses,
    title: "Asesoría y lentes",
    description: "Orientamos sobre salud visual y ofrecemos lentes a quienes los necesiten.",
  },
];

export default function HowItWorksSection({
  ctaHref = "/jornadas",
  ctaLabel = "Cotizar servicio",
}: {
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <section id="como-funciona" className="py-24 lg:py-32 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight mb-4 text-balance">
            ¿Cómo funciona una jornada oftalmológica?
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed max-w-[65ch]">
            Nos encargamos de todo el proceso para que la experiencia sea fluida y sin complicaciones para la administración.
          </p>
        </Reveal>

        <div className="space-y-0 divide-y divide-border">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={index * 0.06}>
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 md:gap-8 py-8 first:pt-0 last:pb-0 items-start group">
                  <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-3 md:w-48 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center transition-colors duration-300 group-hover:bg-primary group-hover:text-surface">
                      <Icon size={22} weight="regular" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary md:text-base">
                      {step.title}
                    </span>
                  </div>
                  <p className="text-text-secondary leading-relaxed md:pt-2.5">
                    {step.description}
                  </p>
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
