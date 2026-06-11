"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Eyeglasses,
  Stethoscope,
  CalendarCheck,
  Users,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

const highlights = [
  { icon: Stethoscope, text: "Chequeos visuales en terreno" },
  { icon: Eyeglasses, text: "Venta de lentes ópticos" },
  { icon: CalendarCheck, text: "Coordinación sin costo" },
  { icon: Users, text: "Para equipos de cualquier tamaño" },
];

export default function JornadasHero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative min-h-[100dvh] flex items-center pt-24 pb-16 lg:pt-28 lg:pb-24 overflow-hidden bg-white">
      {/* ── Decorative circles ── */}
      <div className="circle-decoration circle-decoration--primary absolute -top-16 -left-16 w-[400px] h-[400px] opacity-30" />
      <div className="circle-decoration circle-decoration--muted absolute bottom-0 right-1/4 w-[300px] h-[300px]" />

      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary-soft/40 rounded-full blur-[160px] -translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold text-text-primary tracking-[-0.03em] leading-[1.08] mb-6 text-balance">
              Jornadas oftalmológicas{" "}
              <span className="text-primary">en tu empresa</span>
            </h1>

            <p className="text-lg lg:text-xl text-text-secondary mb-10 max-w-[55ch] leading-relaxed">
              Llevamos chequeos visuales y venta de lentes directamente a tus instalaciones. Tus colaboradores reciben atención profesional sin perder tiempo en traslados.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.text}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted ring-1 ring-black/[0.03]"
                  >
                    <Icon size={20} weight="regular" className="text-primary shrink-0" />
                    <span className="text-sm font-medium text-text-primary">{item.text}</span>
                  </div>
                );
              })}
            </div>

            <Button
              href="#solicitar"
              size="lg"
              icon={<ArrowRight size={16} weight="bold" />}
            >
              Solicitar jornada
            </Button>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="rounded-[var(--radius-shell)] p-1.5 ring-1 ring-black/[0.04] shadow-brand-lg bg-white">
              <div className="relative aspect-[4/3] rounded-[var(--radius-inner)] overflow-hidden bg-muted">
                <Image
                  src="/images/hero-corporate.png"
                  alt="Jornada oftalmológica corporativa en empresa"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
