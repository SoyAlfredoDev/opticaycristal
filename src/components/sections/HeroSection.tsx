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
    <section className="hero-v2 relative bg-white">
      <div className="hero-v2__bg pointer-events-none absolute inset-0" aria-hidden>
        <div className="dot-grid-pattern absolute left-0 top-0 h-[45%] w-[55%] opacity-60" />
        <div className="absolute -right-32 top-0 h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full bg-primary/[0.05]" />
      </div>

      <Navbar />

      <div className="container-site relative z-10 pb-8 pt-[calc(var(--nav-height)+1.25rem+env(safe-area-inset-top,0px))] sm:pb-12 sm:pt-[calc(var(--nav-height)+1.5rem+env(safe-area-inset-top,0px))] lg:max-w-none lg:px-[clamp(1.5rem,4vw,3.5rem)] lg:pb-16 lg:pt-[calc(var(--nav-height)+1.25rem+env(safe-area-inset-top,0px))] lg:w-full">
        <div className="grid grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-14 lg:py-4 xl:gap-20">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary sm:mb-4 sm:text-[11px]">
              <Truck size={14} weight="bold" />
              Jornadas en terreno
            </p>

            <h1 className="mb-4 text-[1.65rem] font-extrabold uppercase leading-[1.08] tracking-[-0.02em] text-brand-dark sm:mb-5 sm:text-[2.25rem] lg:max-w-[18ch] lg:text-[3rem]">
              Llevamos la salud visual{" "}
              <span className="hero-headline-serif normal-case text-primary">a tu empresa</span>
            </h1>

            <p className="mb-5 text-[15px] leading-relaxed text-text-secondary sm:mb-6 sm:max-w-[48ch] sm:text-base lg:mb-8 lg:text-lg">
              Jornadas oftalmológicas corporativas en tus instalaciones. Tu equipo recibe atención profesional{" "}
              <span className="text-highlight">sin costo</span> y sin perder horas de trabajo.
            </p>

            <ul className="mb-6 space-y-2.5 sm:mb-8 sm:space-y-3 lg:mb-9">
              {proofPoints.map((point, i) => (
                <motion.li
                  key={point}
                  initial={reduce ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.45, ease: EASE }}
                  className="flex items-start gap-2.5 text-sm text-text-primary sm:gap-3 sm:text-[15px]"
                >
                  <span className="flyer-icon-circle mt-0.5 h-5 w-5 border-[1.5px]">
                    <Check size={11} weight="bold" />
                  </span>
                  {point}
                </motion.li>
              ))}
            </ul>

            <div className="hidden flex-col gap-3 sm:flex sm:flex-row sm:items-center sm:gap-4">
              <Button href="/#contratar" size="lg" className="min-h-[52px] w-full rounded-full sm:w-auto">
                Solicitar jornada
              </Button>
              <Link
                href="#beneficios"
                className="group inline-flex min-h-[48px] items-center justify-center gap-2 text-sm font-semibold text-brand-dark transition-colors hover:text-primary sm:justify-start"
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
            className="hero-v2__visual relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none"
          >
            <div className="hero-v2__collage relative w-full">
              <div className="hero-v2__collage-main image-frame relative aspect-[4/3] w-full overflow-hidden ring-2 ring-primary/10 sm:aspect-[5/4] lg:aspect-[4/3]">
                <Image
                  src="/images/hero-consulta-oftalmologica.png"
                  alt="Consulta oftalmológica con paciente durante jornada visual corporativa"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/50 via-brand-dark/5 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 sm:bottom-4 sm:left-4 sm:right-4 sm:gap-3">
                  <p className="text-xs font-semibold text-white sm:text-sm lg:text-base">
                    Consulta oftalmológica en terreno
                  </p>
                  <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white sm:px-3 sm:py-1 sm:text-[10px]">
                    En vivo
                  </span>
                </div>
              </div>

              <div className="hero-v2__collage-secondary image-frame absolute z-10 aspect-square w-[32%] min-w-[5.5rem] max-w-[7.5rem] overflow-hidden shadow-brand-lg ring-2 ring-white sm:w-[38%] sm:min-w-[6.75rem] sm:max-w-[9.5rem] lg:max-w-[15rem]">
                <Image
                  src="/images/hero-equipo-trabajo.png"
                  alt="Equipo de trabajo colaborando en oficina corporativa"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 42vw, 20vw"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:mt-0 sm:block">
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45, duration: 0.5, ease: EASE }}
                className="hero-v2__stat-card card-premium relative z-20 flex items-center gap-3 border-l-4 border-l-primary px-4 py-3 sm:absolute sm:-bottom-1 sm:left-0 lg:-left-4"
              >
                <span className="flyer-icon-circle h-9 w-9 sm:h-10 sm:w-10">
                  <CurrencyCircleDollar size={20} weight="regular" className="sm:hidden" />
                  <CurrencyCircleDollar size={22} weight="regular" className="hidden sm:block" />
                </span>
                <div>
                  <p className="stat-value text-lg font-bold text-primary sm:text-xl">$0</p>
                  <p className="text-[11px] font-medium text-text-secondary sm:text-xs">Costo para tu empresa</p>
                </div>
              </motion.div>

              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55, duration: 0.5, ease: EASE }}
                className="card-premium flex items-center gap-2 rounded-xl bg-brand-dark px-3 py-2.5 text-white sm:absolute sm:-right-1 sm:top-8 sm:hidden lg:flex"
              >
                <Clock size={18} className="text-primary" weight="regular" />
                <span className="text-xs font-semibold">Sin interrumpir la jornada</span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.55, ease: EASE }}
          className="hero-v2__metrics mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-3 sm:grid-cols-4 lg:mt-12 lg:gap-4 lg:w-full"
        >
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-border bg-white px-3 py-3.5 text-center shadow-brand sm:px-4 sm:py-4 lg:px-5 lg:py-5"
            >
              <p className="stat-value text-xl font-bold text-primary sm:text-2xl lg:text-3xl">{m.value}</p>
              <p className="mt-0.5 text-[10px] font-medium leading-snug text-text-secondary sm:mt-1 sm:text-[11px] lg:text-xs">{m.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
