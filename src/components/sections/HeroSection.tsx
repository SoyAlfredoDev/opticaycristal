"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Buildings, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

export default function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden bg-white pt-24 pb-16 lg:pt-24 lg:pb-20">
      {/* Organic background shapes */}
      <div className="organic-blob organic-blob--soft absolute -top-32 right-0 h-[520px] w-[520px] opacity-80" />
      <div className="circle-decoration circle-decoration--ring absolute -top-24 -right-24 h-[480px] w-[480px]" />
      <div className="circle-decoration circle-decoration--ring-soft absolute top-32 right-[18%] h-[220px] w-[220px]" />
      <div className="circle-decoration circle-decoration--fill absolute -bottom-32 -left-32 h-[420px] w-[420px]" />
      <div className="circle-decoration circle-decoration--warm absolute bottom-24 right-[8%] h-[140px] w-[140px]" />

      <div className="container-site relative z-10 w-full">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-left"
          >
            <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-xs font-semibold text-primary ring-1 ring-primary/10">
              <Buildings size={14} weight="fill" />
              <span>Servicio exclusivo para empresas</span>
            </div>

            <h1 className="mb-6 text-balance text-4xl font-bold leading-[1.06] tracking-[-0.03em] text-text-primary md:text-5xl lg:text-[3.25rem] xl:text-[3.5rem]">
              Mejoramos la salud visual de{" "}
              <span className="text-primary">los trabajadores de tu empresa</span>
            </h1>

            <p className="mb-9 max-w-[52ch] text-lg leading-relaxed text-text-secondary lg:text-xl">
              Jornadas oftalmológicas en terreno. Chequeos visuales y venta de lentes para tus colaboradores, dentro del horario laboral.
            </p>

            <div className="flex flex-col items-start gap-3 sm:flex-row">
              <Button
                href="/jornadas"
                size="lg"
                icon={<ArrowRight size={16} weight="bold" />}
              >
                Solicitar jornada
              </Button>
              <Button href="#como-funciona" variant="outline" size="lg">
                Ver el proceso
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="relative lg:pl-4"
          >
            <div className="circle-decoration circle-decoration--ring absolute -inset-8 hidden lg:block" />
            <div className="circle-decoration circle-decoration--ring-soft absolute -inset-16 hidden lg:block" />

            <div className="relative overflow-hidden rounded-[var(--radius-shell)] shadow-brand-lg ring-1 ring-black/[0.04]">
              <div className="relative aspect-[5/4] overflow-hidden bg-muted lg:aspect-[4/3]">
                <Image
                  src="/images/hero-corporate.png"
                  alt="Profesional realizando chequeo visual en empresa"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 48vw"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/8 via-transparent to-transparent" />
              </div>
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -bottom-5 -left-3 rounded-2xl bg-white p-5 shadow-brand-lg ring-1 ring-black/[0.04] lg:-bottom-6 lg:-left-8"
            >
              <p className="stat-value text-3xl font-bold text-primary">+200</p>
              <p className="text-xs font-medium text-text-secondary">Empresas atendidas</p>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -top-4 right-2 rounded-2xl bg-white px-4 py-3 shadow-brand ring-1 ring-black/[0.04] lg:-top-5 lg:right-0"
            >
              <p className="text-sm font-semibold text-text-primary">Atención en terreno</p>
              <p className="text-xs text-text-secondary">Sin costo para la empresa</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function HeroTrustStrip() {
  const stats = [
    { value: "+200", label: "Empresas atendidas" },
    { value: "+10.000", label: "Trabajadores evaluados" },
    { value: "$0", label: "Costo para la empresa" },
  ];

  const items = [
    "Atención con tecnólogos médicos",
    "Venta de lentes ópticos",
    "Costo $0 para la empresa",
  ];

  return (
    <section className="border-y border-border/60 bg-muted/40 py-10">
      <div className="container-site">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <p className="stat-value text-2xl font-bold text-primary md:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-medium text-text-secondary md:text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end lg:flex-col lg:items-end">
            {items.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <CheckCircle size={18} weight="fill" className="shrink-0 text-primary" />
                <span className="text-sm font-medium text-text-secondary">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
