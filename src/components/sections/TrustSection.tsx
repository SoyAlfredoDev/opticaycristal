"use client";

import {
  MapPin,
  Medal,
  ShieldCheck,
  Handshake,
} from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";

const stats = [
  { value: "+200", label: "Empresas atendidas" },
  { value: "+10.000", label: "Trabajadores evaluados" },
  { value: "$0", label: "Costo para la empresa" },
];

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
    <section className="section-y relative overflow-hidden bg-muted">
      <div className="circle-decoration circle-decoration--ring absolute bottom-0 left-1/4 h-[220px] w-[220px] opacity-25" />

      <div className="container-site relative z-10">
        <Reveal className="mb-12 max-w-2xl lg:mb-14">
          <h2 className="mb-5 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-text-primary md:text-4xl lg:text-[2.75rem]">
            Más que un operativo, somos tu óptica de confianza
          </h2>
          <p className="max-w-[60ch] text-lg leading-relaxed text-text-secondary">
            Llevar salud visual a tu empresa requiere seriedad. Contamos con estructura real, profesionales certificados y procesos claros.
          </p>
        </Reveal>

        <Reveal className="mb-12">
          <div className="grid grid-cols-1 gap-4 rounded-[var(--radius-shell)] bg-white p-6 shadow-brand ring-1 ring-black/[0.04] sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border md:p-8">
            {stats.map((stat) => (
              <div key={stat.label} className="px-2 py-2 text-center sm:py-0">
                <p className="stat-value text-3xl font-bold text-primary md:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-text-secondary">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trustPillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <Reveal key={pillar.title} delay={index * 0.08}>
                <div className="card-float h-full p-6 lg:p-7">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Icon size={24} weight="regular" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight text-text-primary">
                    {pillar.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {pillar.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
