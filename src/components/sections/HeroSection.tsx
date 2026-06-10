"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Buildings, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

export default function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative min-h-[100dvh] flex items-center pt-24 pb-16 lg:pt-24 lg:pb-20 overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-soft/60 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-left"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-soft text-primary text-xs font-semibold mb-6">
              <Buildings size={14} weight="fill" />
              <span>Servicio B2B para empresas</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary tracking-tighter leading-[1.05] mb-5 text-balance">
              Salud visual en tu empresa,{" "}
              <span className="text-primary">sin salir de la oficina</span>
            </h1>

            <p className="text-lg text-text-secondary mb-8 max-w-[65ch] leading-relaxed">
              Jornadas oftalmológicas en terreno. Chequeos visuales y venta de lentes para tus colaboradores, dentro del horario laboral.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3">
              <Button
                href="/jornadas"
                size="lg"
                icon={<ArrowRight size={16} weight="bold" />}
              >
                Cotizar servicio
              </Button>
              <Button href="#como-funciona" variant="outline" size="lg">
                Ver el proceso
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="rounded-[var(--radius-shell)] p-1.5 ring-1 ring-black/[0.04] shadow-brand-lg">
              <div className="relative aspect-[4/3] rounded-[var(--radius-inner)] overflow-hidden bg-muted">
                <Image
                  src="https://picsum.photos/seed/optica-empresa-chequeo/1200/900"
                  alt="Profesional realizando chequeo visual en empresa"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 to-transparent" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function HeroTrustStrip() {
  const items = [
    "Atención con tecnólogos médicos",
    "Venta de lentes ópticos",
    "Costo $0 para la empresa",
  ];

  return (
    <section className="py-8 border-y border-border bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-text-secondary">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle size={16} weight="fill" className="text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
