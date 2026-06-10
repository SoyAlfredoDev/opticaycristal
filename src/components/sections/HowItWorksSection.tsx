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
    description:
      "Nos contactas para evaluar el tamaño de tu equipo y recibir una propuesta.",
  },
  {
    icon: CalendarBlank,
    title: "Coordinamos fecha",
    description:
      "Agendamos el día y los bloques de atención para tus colaboradores.",
  },
  {
    icon: Truck,
    title: "Acudimos a la empresa",
    description:
      "Instalamos nuestro equipo en un espacio habilitado dentro de tus oficinas.",
  },
  {
    icon: Eye,
    title: "Realizamos chequeos",
    description:
      "Tecnólogos médicos evalúan a cada trabajador y detectan problemas visuales.",
  },
  {
    icon: Eyeglasses,
    title: "Asesoría y lentes",
    description:
      "Orientamos sobre salud visual y ofrecemos lentes a quienes los necesiten.",
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
    <section id="como-funciona" className="section-y relative overflow-hidden bg-white">
      <div className="circle-decoration circle-decoration--warm absolute -bottom-24 -left-24 h-[320px] w-[320px]" />

      <div className="container-site relative z-10">
        <Reveal className="mb-14 max-w-2xl lg:mb-16">
          <h2 className="mb-5 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-text-primary md:text-4xl lg:text-[2.75rem]">
            ¿Cómo funciona una jornada oftalmológica?
          </h2>
          <p className="max-w-[60ch] text-lg leading-relaxed text-text-secondary">
            Nos encargamos de todo el proceso para que la experiencia sea fluida y sin complicaciones para la administración.
          </p>
        </Reveal>

        <div className="relative">
          <div
            className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent lg:block"
            aria-hidden
          />

          <div className="space-y-5">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.title} delay={index * 0.07}>
                  <div className="group relative flex flex-col gap-5 rounded-[var(--radius-card)] bg-white p-6 shadow-card ring-1 ring-black/[0.04] transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-brand-hover lg:flex-row lg:items-center lg:gap-8 lg:p-7">
                    <div className="flex items-center gap-4 lg:w-[280px] lg:shrink-0">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                        <Icon size={22} weight="regular" />
                      </div>
                    </div>

                    <div className="hidden h-3 w-3 shrink-0 rounded-full bg-primary/20 ring-4 ring-primary/10 lg:absolute lg:left-[1.375rem] lg:top-1/2 lg:block lg:-translate-y-1/2" />

                    <div className="flex-1">
                      <h3 className="mb-1.5 text-lg font-semibold tracking-tight text-text-primary">
                        {step.title}
                      </h3>
                      <p className="max-w-[65ch] text-sm leading-relaxed text-text-secondary">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        <Reveal className="mt-14 text-center" delay={0.3}>
          <Button href={ctaHref} size="lg">
            {ctaLabel}
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
