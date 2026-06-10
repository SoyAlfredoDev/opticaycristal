"use client";

import Image from "next/image";
import {
  Briefcase,
  Storefront,
  Desktop,
  Buildings,
  Package,
  Truck,
} from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";

const categories = [
  { icon: Briefcase, name: "Oficinas y corporativos" },
  { icon: Storefront, name: "Retail y sucursales" },
  { icon: Desktop, name: "Centros de atención" },
  { icon: Buildings, name: "Empresas administrativas" },
  { icon: Package, name: "Bodegas y logística" },
  { icon: Truck, name: "Equipos operativos" },
];

export default function AudienceSection() {
  return (
    <section className="section-y relative overflow-hidden bg-primary-mist/50">
      <div className="circle-decoration circle-decoration--ring absolute right-10 top-10 h-[180px] w-[180px] opacity-20" />
      <div className="circle-decoration circle-decoration--fill absolute bottom-20 left-1/3 h-[120px] w-[120px]" />

      <div className="container-site relative z-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal direction="left">
            <h2 className="mb-5 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-text-primary md:text-4xl lg:text-[2.75rem]">
              Nos adaptamos a cualquier tipo de empresa
            </h2>
            <p className="mb-8 max-w-[60ch] text-lg leading-relaxed text-text-secondary">
              Ya sea un edificio corporativo, un piso de ventas o un centro de distribución. Nuestro formato es 100% móvil y se ajusta a tus instalaciones.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat, index) => {
                const Icon = cat.icon;
                return (
                  <Reveal key={cat.name} delay={index * 0.05}>
                    <div className="card-float flex items-center gap-3 p-4 transition-all duration-300 hover:ring-primary/15">
                      <Icon size={22} weight="regular" className="shrink-0 text-primary" />
                      <span className="text-sm font-medium text-text-primary">{cat.name}</span>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </Reveal>

          <Reveal direction="right" delay={0.15}>
            <div className="relative overflow-hidden rounded-[var(--radius-shell)] shadow-brand-lg ring-1 ring-black/[0.04]">
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src="/images/audience-workers.png"
                  alt="Equipo de trabajo en entorno empresarial"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-text-primary/25 to-transparent" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
