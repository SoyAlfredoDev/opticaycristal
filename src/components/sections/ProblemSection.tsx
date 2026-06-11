"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Eye,
  Brain,
  TrendDown,
  WarningCircle,
} from "@phosphor-icons/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const stats = [
  { value: "68%", label: "de trabajadores reportan fatiga visual" },
  { value: "4 h", label: "promedio perdidas al ir al oftalmólogo" },
  { value: "1 de 3", label: "posterga su chequeo visual" },
];

const problems = [
  {
    icon: Eye,
    title: "Fatiga visual",
    description: "Pantallas prolongadas generan cansancio ocular y dificultad para concentrarse.",
  },
  {
    icon: Brain,
    title: "Dolor de cabeza",
    description: "La tensión visual se traduce en dolores recurrentes durante la jornada laboral.",
  },
  {
    icon: TrendDown,
    title: "Menor productividad",
    description: "Equipos con visión deficiente rinden menos y cometen más errores.",
  },
  {
    icon: WarningCircle,
    title: "Problemas no detectados",
    description: "Muchos colaboradores desconocen alteraciones visuales que podrían corregirse a tiempo.",
  },
];

export default function ProblemSection() {
  const reduce = useReducedMotion();

  return (
    <section id="problema" className="section-dark section-y relative overflow-hidden">
      <div className="container-site relative z-10">
        <div className="mb-8 grid grid-cols-1 gap-6 sm:mb-10 sm:gap-8 lg:mb-12 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-16">
          <motion.div
            initial={reduce ? false : { opacity: 1, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <h2 className="section-title section-title--caps mb-3 text-white sm:mb-4">
              El problema que enfrentan{" "}
              <span className="hero-headline-serif normal-case text-primary">tus colaboradores</span>
            </h2>
            <p className="max-w-[55ch] text-base leading-relaxed text-text-on-dark-muted sm:text-lg">
              La exposición constante a pantallas convirtió la salud visual en un dolor silencioso dentro de las empresas chilenas.
            </p>
          </motion.div>

          <div className="mobile-scroll-row sm:!mx-0 sm:!px-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45, ease: EASE }}
                className="mobile-scroll-card card-dark px-4 py-4 sm:py-5"
              >
                <p className="stat-value mb-1 text-2xl font-bold text-primary sm:text-3xl">{stat.value}</p>
                <p className="text-xs leading-snug text-text-on-dark-muted sm:text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="image-frame relative lg:col-span-5"
          >
            <div className="relative aspect-[4/5] min-h-[280px] lg:min-h-full lg:aspect-auto lg:h-full">
              <Image
                src="/images/hero-corporate.png"
                alt="Trabajador en oficina con fatiga visual"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-lg font-semibold text-white">¿Te resulta familiar?</p>
                <p className="text-sm text-white/80">Tu equipo merece una solución en terreno.</p>
              </div>
            </div>
          </motion.div>

          <div className="lg:col-span-7">
            <div className="flyer-feature-grid rounded-xl border border-border-dark bg-brand-dark-elevated overflow-hidden">
              {problems.map((problem, i) => {
                const Icon = problem.icon;
                return (
                  <motion.div
                    key={problem.title}
                    initial={reduce ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ delay: i * 0.07, duration: 0.5, ease: EASE }}
                    className="flyer-feature-cell"
                  >
                    <div className="flyer-icon-circle flyer-icon-circle--outline mb-4 h-12 w-12">
                      <Icon size={22} weight="regular" />
                    </div>
                    <h3 className="mb-2 text-base font-bold uppercase tracking-wide text-white sm:text-lg">{problem.title}</h3>
                    <p className="text-sm leading-relaxed text-text-on-dark-muted">{problem.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
