"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Truck,
  Clock,
  CurrencyCircleDollar,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import Navbar from "@/components/layout/Navbar";

const EASE = [0.16, 1, 0.3, 1] as const;

const proofPoints = [
  "Chequeos visuales completos en tus instalaciones",
  "Tecnólogos médicos y equipamiento profesional",
  "Coordinación simple: nosotros llevamos todo",
];

const metrics = [
  { value: "+200", label: "Empresas atendidas" },
  { value: "+10.000", label: "Trabajadores evaluados" },
  { value: "$0", label: "Costo para la empresa" },
  { value: "48 h", label: "Respuesta garantizada" },
];

export default function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <section className="hero-v2 relative flex min-h-0 flex-col overflow-x-hidden bg-white lg:min-h-screen">
      <div className="hero-v2__bg pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#fff8f6_0%,#ffffff_42%,#f8f5f0_100%)]" />
        <div className="absolute -right-32 top-0 h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full bg-primary/[0.04]" />
        <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-muted/80 blur-3xl" />
      </div>

      <Navbar />

      <div className="container-site relative z-10 flex flex-1 flex-col pb-10 pt-[4.5rem] sm:pb-14 sm:pt-[5.25rem] lg:min-h-screen lg:max-w-none lg:justify-between lg:px-[clamp(1.5rem,4vw,3.5rem)] lg:pb-8 lg:pt-[4.25rem] lg:w-full">
        <div className="grid flex-1 grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14 lg:py-6 xl:gap-20">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-mist px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              <Truck size={14} weight="bold" />
              Jornadas en terreno
            </p>

            <h1 className="mb-5 max-w-[16ch] text-[2rem] font-bold leading-[1.05] tracking-[-0.035em] text-text-primary sm:mb-6 sm:text-[2.75rem] lg:text-[3.35rem]">
              Salud visual en tu empresa.{" "}
              <span className="hero-headline-serif text-primary">Sin traslados.</span>
            </h1>

            <p className="mb-6 max-w-[48ch] text-base leading-relaxed text-text-secondary sm:mb-8 sm:text-lg">
              Llevamos jornadas oftalmológicas corporativas a tus instalaciones. Tu equipo recibe atención profesional sin perder horas de trabajo y sin costo para la organización.
            </p>

            <ul className="mb-8 space-y-3 sm:mb-9">
              {proofPoints.map((point, i) => (
                <motion.li
                  key={point}
                  initial={reduce ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.45, ease: EASE }}
                  className="flex items-start gap-3 text-sm text-text-primary sm:text-[15px]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                    <Check size={11} weight="bold" />
                  </span>
                  {point}
                </motion.li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Button href="/#contratar" size="lg" className="min-h-[52px] w-full rounded-full sm:w-auto">
                Solicitar jornada
              </Button>
              <Link
                href="#beneficios"
                className="group inline-flex min-h-[48px] items-center justify-center gap-2 text-sm font-semibold text-text-primary transition-colors hover:text-primary sm:justify-start"
              >
                Ver beneficios
                <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: EASE }}
            className="hero-v2__visual relative mx-auto w-full max-w-lg pb-14 sm:pb-10 lg:mx-0 lg:max-w-none lg:pb-12"
          >
            <div className="hero-v2__collage relative w-full">
              <div className="hero-v2__collage-main image-frame relative aspect-[4/3] w-full overflow-hidden sm:aspect-[5/4] lg:aspect-[4/3] lg:min-h-[min(52vh,520px)]">
                <Image
                  src="/images/hero-consulta-oftalmologica.png"
                  alt="Consulta oftalmológica con paciente durante jornada visual corporativa"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-text-primary/40 via-text-primary/5 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                  <p className="text-sm font-semibold text-white sm:text-base">
                    Consulta oftalmológica en terreno
                  </p>
                  <span className="shrink-0 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    En vivo
                  </span>
                </div>
              </div>

              <div className="hero-v2__collage-secondary image-frame absolute z-10 aspect-[4/3] w-[38%] min-w-[6.75rem] max-w-[9.5rem] overflow-hidden shadow-brand-lg ring-2 ring-white sm:w-[42%] sm:min-w-[7.5rem] sm:max-w-[13rem] lg:max-w-[15rem]">
                <Image
                  src="/images/hero-equipo-trabajo.png"
                  alt="Equipo de trabajo colaborando en oficina corporativa"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 42vw, 20vw"
                />
              </div>
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, duration: 0.5, ease: EASE }}
              className="hero-v2__stat-card card-premium absolute -bottom-1 left-0 z-20 flex items-center gap-3 px-4 py-3 sm:-bottom-0 sm:-left-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <CurrencyCircleDollar size={22} weight="regular" />
              </span>
              <div>
                <p className="stat-value text-xl font-bold text-primary">$0</p>
                <p className="text-xs font-medium text-text-secondary">Costo para tu empresa</p>
              </div>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55, duration: 0.5, ease: EASE }}
              className="hero-v2__time-card card-premium absolute -right-1 top-8 z-20 hidden items-center gap-2 px-3 py-2.5 sm:flex"
            >
              <Clock size={18} className="text-primary" weight="regular" />
              <span className="text-xs font-semibold text-text-primary">Sin interrumpir la jornada</span>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.55, ease: EASE }}
          className="hero-v2__metrics mt-10 grid shrink-0 grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-4 sm:gap-4 lg:mt-0 lg:w-full"
        >
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-border/80 bg-white/80 px-4 py-4 text-center shadow-brand backdrop-blur-sm sm:px-5 sm:py-5"
            >
              <p className="stat-value text-2xl font-bold text-primary sm:text-3xl">{m.value}</p>
              <p className="mt-1 text-[11px] font-medium leading-snug text-text-secondary sm:text-xs">{m.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
