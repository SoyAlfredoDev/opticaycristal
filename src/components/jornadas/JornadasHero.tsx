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
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden bg-white pt-24 pb-16 lg:pt-24 lg:pb-20">
      <div className="organic-blob organic-blob--soft absolute -top-24 -left-24 h-[420px] w-[420px] opacity-70" />
      <div className="circle-decoration circle-decoration--ring absolute -top-16 -left-16 h-[360px] w-[360px] opacity-30" />
      <div className="circle-decoration circle-decoration--fill absolute bottom-0 right-1/4 h-[280px] w-[280px]" />

      <div className="container-site relative z-10 w-full">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="mb-6 text-balance text-4xl font-bold leading-[1.06] tracking-[-0.03em] text-text-primary md:text-5xl lg:text-[3.25rem]">
              Jornadas oftalmológicas{" "}
              <span className="text-primary">en tu empresa</span>
            </h1>

            <p className="mb-10 max-w-[55ch] text-lg leading-relaxed text-text-secondary lg:text-xl">
              Llevamos chequeos visuales y venta de lentes directamente a tus instalaciones. Tus colaboradores reciben atención profesional sin perder tiempo en traslados.
            </p>

            <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.text}
                    className="card-float flex items-center gap-3 p-4"
                  >
                    <Icon size={20} weight="regular" className="shrink-0 text-primary" />
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
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative overflow-hidden rounded-[var(--radius-shell)] shadow-brand-lg ring-1 ring-black/[0.04]">
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <Image
                  src="/images/hero-corporate.png"
                  alt="Jornada oftalmológica corporativa en empresa"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/8 to-transparent" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
