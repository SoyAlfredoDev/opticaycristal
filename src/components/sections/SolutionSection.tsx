"use client";

import Image from "next/image";
import {
  Stethoscope,
  Eyeglasses,
  CalendarCheck,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";

const features = [
  {
    icon: Stethoscope,
    title: "Evaluación profesional en terreno",
    description:
      "Llevamos equipos oftalmológicos a tu empresa. Atendemos a tus colaboradores en sus propias instalaciones.",
  },
  {
    icon: Eyeglasses,
    title: "Venta de lentes ópticos",
    description:
      "Amplio catálogo de armazones y cristales. Los trabajadores pueden probarse y adquirir lentes al instante.",
  },
  {
    icon: CalendarCheck,
    title: "Coordinación rápida y simple",
    description:
      "Nos encargamos de la logística. Agendamos bloques de atención sin interrumpir la operación normal.",
  },
  {
    icon: ShieldCheck,
    title: "Garantía y respaldo",
    description:
      "Óptica establecida en Santiago Centro con garantía real en todos nuestros productos y servicios.",
  },
];

export default function SolutionSection() {
  return (
    <section id="solucion" className="section-y relative overflow-hidden bg-white">
      <div className="circle-decoration circle-decoration--fill absolute -left-24 bottom-0 h-[360px] w-[360px]" />

      <div className="container-site relative z-10">
        <Reveal className="mb-14 max-w-2xl lg:mb-16">
          <h2 className="mb-5 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-text-primary md:text-4xl lg:text-[2.75rem]">
            La óptica va a tu oficina
          </h2>
          <p className="max-w-[60ch] text-lg leading-relaxed text-text-secondary">
            Transformamos un espacio de tu empresa en un box de atención visual. Minimizamos desplazamientos y entregamos comodidad para todos tus trabajadores.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <Reveal direction="left" className="lg:col-span-5">
            <div className="relative h-full overflow-hidden rounded-[var(--radius-shell)] shadow-brand-lg ring-1 ring-black/[0.04]">
              <div className="relative aspect-[4/5] min-h-[420px] lg:min-h-full lg:aspect-auto lg:h-full">
                <Image
                  src="/images/solution-corporate.png"
                  alt="Chequeo oftalmológico corporativo en empresa"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-text-primary/55 via-text-primary/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <p className="mb-1 text-xl font-bold text-white">
                    Atención en menos de 30 minutos
                  </p>
                  <p className="text-sm text-white/85">
                    Tus colaboradores vuelven rápidamente a sus labores.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7 lg:gap-5">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title} delay={index * 0.08}>
                  <div className="card-float group h-full p-6 lg:p-7">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                      <Icon size={22} weight="regular" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold tracking-tight text-text-primary">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {feature.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
