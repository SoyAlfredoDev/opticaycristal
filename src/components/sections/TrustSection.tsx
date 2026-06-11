"use client";

import {
  MapPin,
  Medal,
  ShieldCheck,
  Handshake,
} from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";

const trustPillars = [
  {
    icon: MapPin,
    title: "Ubicación real",
    description:
      "Local en Huérfanos 713, local 18, Santiago Centro. Una óptica física que respalda cada jornada.",
  },
  {
    icon: Medal,
    title: "Experiencia profesional",
    description:
      "Atención por tecnólogos médicos en oftalmología, con diagnóstico certero y protocolos claros.",
  },
  {
    icon: ShieldCheck,
    title: "Garantía de calidad",
    description:
      "Todos nuestros lentes y cristales cuentan con respaldo y procesos de calidad rigurosos.",
  },
  {
    icon: Handshake,
    title: "Servicio personalizado",
    description:
      "Trato cercano y humano, adaptado a las necesidades de cada empresa y sus colaboradores.",
  },
];

export default function TrustSection() {
  return (
    <section className="relative py-28 lg:py-36 bg-muted overflow-hidden">
      {/* ── Decorative circle ── */}
      <div className="circle-decoration circle-decoration--primary absolute -bottom-16 left-1/4 w-[220px] h-[220px] opacity-25" />

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Reveal className="max-w-2xl mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Confianza</p>
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-text-primary tracking-tight mb-5 text-balance leading-[1.12]">
            Más que un operativo, somos tu óptica de confianza
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed max-w-[60ch]">
            Llevar salud a tu empresa requiere seriedad. Contamos con estructura real, profesionales certificados y procesos claros.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {trustPillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <Reveal key={pillar.title} delay={index * 0.08}>
                <div className="h-full rounded-[var(--radius-shell)] p-1.5 ring-1 ring-black/[0.04] shadow-brand transition-all duration-500 ease-premium hover:-translate-y-1 hover:shadow-brand-hover bg-white">
                  <div className="h-full rounded-[var(--radius-inner)] bg-white p-7 text-left">
                    <div className="w-12 h-12 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mb-5">
                      <Icon size={24} weight="regular" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2 tracking-tight">
                      {pillar.title}
                    </h3>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
