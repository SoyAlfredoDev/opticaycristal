"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  MapPin,
  Medal,
  ShieldCheck,
  Eye,
  Buildings,
} from "@phosphor-icons/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const stats = [
  { value: "+200", label: "Empresas atendidas" },
  { value: "+10.000", label: "Trabajadores evaluados" },
  { value: "$0", label: "Costo para la empresa" },
];

const pillars = [
  {
    icon: MapPin,
    title: "Óptica física en Santiago Centro",
    description: "Huérfanos 713, local 18. Respaldo real detrás de cada jornada en terreno.",
  },
  {
    icon: Medal,
    title: "Tecnólogos médicos",
    description: "Profesionales en oftalmología con protocolos claros y diagnóstico certero.",
  },
  {
    icon: Eye,
    title: "Equipamiento profesional",
    description: "Tecnología oftalmológica de última generación llevada directamente a tu empresa.",
  },
  {
    icon: ShieldCheck,
    title: "Garantía y respaldo",
    description: "Todos nuestros productos y servicios cuentan con procesos de calidad rigurosos.",
  },
];

export default function OpticaSection() {
  const reduce = useReducedMotion();

  return (
    <section id="optica" className="section-dark section-y relative overflow-hidden">
      <div className="pointer-events-none absolute -right-20 top-1/4 h-64 w-64 rounded-full border border-primary/20" aria-hidden />

      <div className="container-site relative z-10">
        <div className="mb-10 grid grid-cols-1 gap-10 lg:mb-14 lg:grid-cols-2 lg:items-center lg:gap-16">
          <motion.div
            initial={reduce ? false : { opacity: 1, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <h2 className="section-title section-title--caps mb-4 text-white">
              Nuestra{" "}
              <span className="hero-headline-serif normal-case text-primary">óptica</span>
            </h2>
            <p className="mb-6 max-w-[55ch] text-base leading-relaxed text-text-on-dark-muted sm:text-lg">
              Más de una década llevando salud visual a empresas en la Región Metropolitana. Somos una óptica establecida con local propio, equipo profesional y experiencia comprobada en jornadas corporativas.
            </p>
            <p className="max-w-[55ch] text-sm leading-relaxed text-text-on-dark-muted sm:text-base">
              Cada jornada oftalmológica está respaldada por nuestra estructura real: profesionales certificados, equipos calibrados y un servicio cercano adaptado a las necesidades de cada organización.
            </p>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mobile-scroll-row sm:!mx-0 sm:!px-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45, ease: EASE }}
                className="mobile-scroll-card card-dark px-4 py-4 text-center sm:px-4 sm:py-5"
              >
                <p className="stat-value text-xl font-bold text-primary sm:text-2xl lg:text-3xl">{stat.value}</p>
                <p className="mt-1 text-[10px] font-medium leading-snug text-text-on-dark-muted sm:text-xs">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mb-12 lg:grid-cols-12 lg:gap-5">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: EASE }}
            className="image-frame relative lg:col-span-7"
          >
            <div className="relative aspect-[16/11] min-h-[220px] lg:aspect-auto lg:min-h-[340px]">
              <Image
                src="/images/solution-corporate.png"
                alt="Equipo y equipamiento oftalmológico profesional"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 55vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 to-transparent" />
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1, ease: EASE }}
            className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-primary p-6 text-white sm:p-7 lg:col-span-5"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/15" aria-hidden />
            <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" aria-hidden />
            <div className="flyer-icon-circle flyer-icon-circle--outline relative z-10 mb-4 h-14 w-14">
              <Buildings size={28} weight="regular" />
            </div>
            <div className="relative z-10">
              <p className="mb-2 text-2xl font-extrabold uppercase leading-tight sm:text-3xl">
                Confianza de cientos de empresas
              </p>
              <p className="text-sm leading-relaxed text-white/85 sm:text-base">
                Desde oficinas corporativas hasta centros de distribución, nos adaptamos a cada entorno laboral.
              </p>
            </div>
          </motion.div>
        </div>

        <div className="flyer-feature-grid rounded-xl border border-border-dark bg-brand-dark-elevated overflow-hidden">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.45, ease: EASE }}
                className="flyer-feature-cell"
              >
                <div className="flyer-icon-circle flyer-icon-circle--outline mb-4 h-12 w-12">
                  <Icon size={22} weight="regular" />
                </div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-white sm:text-base">{pillar.title}</h3>
                <p className="text-sm leading-relaxed text-text-on-dark-muted">{pillar.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
