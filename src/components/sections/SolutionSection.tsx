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
    <section id="solucion" className="relative py-28 lg:py-36 bg-white overflow-hidden">
      {/* ── Decorative elements ── */}
      <div className="circle-decoration circle-decoration--muted absolute bottom-0 -left-20 w-[350px] h-[350px]" />
      <div className="circle-decoration circle-decoration--primary absolute top-20 right-1/3 w-[200px] h-[200px] opacity-20" />

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          <Reveal direction="left" className="lg:col-span-5 lg:sticky lg:top-28">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Nuestra solución</p>
            <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-text-primary tracking-tight mb-5 text-balance leading-[1.12]">
              La óptica va a tu oficina
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed max-w-[60ch] mb-8">
              Transformamos un espacio de tu empresa en un box de atención visual. Minimizamos desplazamientos y entregamos comodidad para todos tus trabajadores.
            </p>

            <div className="relative rounded-[var(--radius-shell)] p-1.5 ring-1 ring-black/[0.04] shadow-brand-lg bg-white">
              <div className="relative aspect-[3/4] rounded-[var(--radius-inner)] overflow-hidden">
                <Image
                  src="/images/solution-corporate.png"
                  alt="Chequeo oftalmológico corporativo en empresa"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-text-primary/50 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-xl font-bold text-white mb-1">Atención en menos de 30 minutos</p>
                  <p className="text-white/80 text-sm">
                    Tus colaboradores vuelven rápidamente a sus labores.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="lg:col-span-7 space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title} delay={index * 0.08}>
                  <div className="flex gap-5 p-6 rounded-[var(--radius-inner)] bg-white shadow-brand ring-1 ring-black/[0.04] transition-all duration-500 ease-premium hover:-translate-y-0.5 hover:shadow-brand-hover">
                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                      <Icon size={22} weight="regular" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-1 tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="text-text-secondary text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
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
