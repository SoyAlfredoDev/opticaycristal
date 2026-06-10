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
    <section className="py-24 lg:py-32 bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <Reveal direction="left">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight mb-5 text-balance">
              Nos adaptamos a cualquier tipo de empresa
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed max-w-[65ch] mb-8">
              Ya sea un edificio corporativo, un piso de ventas o un centro de distribución. Nuestro formato es 100% móvil y se ajusta a tus instalaciones.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat, index) => {
                const Icon = cat.icon;
                return (
                  <Reveal key={cat.name} delay={index * 0.05}>
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted ring-1 ring-black/[0.03] transition-colors duration-300 hover:ring-primary/20">
                      <Icon size={22} weight="regular" className="text-primary shrink-0" />
                      <span className="font-medium text-text-primary text-sm">{cat.name}</span>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </Reveal>

          <Reveal direction="right" delay={0.15}>
            <div className="relative rounded-[var(--radius-shell)] p-1.5 ring-1 ring-black/[0.04] shadow-brand-lg">
              <div className="relative aspect-[4/5] rounded-[var(--radius-inner)] overflow-hidden">
                <Image
                  src="https://picsum.photos/seed/optica-equipo-trabajo/800/1000"
                  alt="Equipo de trabajo en entorno empresarial"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-text-primary/40 to-transparent" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
