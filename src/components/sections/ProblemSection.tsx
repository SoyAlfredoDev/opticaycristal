"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Brain,
  Drop,
  Heartbeat,
  SmileyNervous,
} from "@phosphor-icons/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const stats = [
  { value: "68%", label: "de trabajadores reportan fatiga visual" },
  { value: "4 h", label: "promedio perdidas al ir al oftalmólogo" },
  { value: "1 de 3", label: "posterga su chequeo visual" },
];

const problems = [
  {
    icon: Brain,
    title: "Me duele la cabeza",
    description: "Si no se atiende, puede agravar la salud de tu equipo.",
  },
  {
    icon: Heartbeat,
    title: "No me siento bien",
    description: "Esto genera menor productividad.",
  },
  {
    icon: Drop,
    title: "Siento los ojos secos",
    description: "¿Tienes integrantes con incomodidad en tu negocio?",
  },
  {
    icon: SmileyNervous,
    title: "Me siento estresado",
    description: "Explica, muchas veces, el comportamiento de tus trabajadores.",
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
            <h2 className="section-title mb-3 text-white sm:mb-4">
              ¿Te resulta familiar{" "}
              <span className="hero-headline-serif text-primary">escuchar esto?</span>
            </h2>
            <p className="max-w-[52ch] text-base leading-relaxed text-text-on-dark-muted sm:text-lg">
              Frases que aparecen entre reuniones y pantallas. Casi nunca se conectan con un chequeo visual.
            </p>
          </motion.div>

          <div>
            <p className="mb-3 inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary sm:mb-4 sm:text-[11px]">
              Índices reales, basados en estudios
            </p>
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
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="image-frame relative order-2 lg:order-1 lg:col-span-5"
          >
            <div className="relative aspect-[4/5] min-h-[280px] lg:aspect-auto lg:h-full lg:min-h-full">
              <Image
                src="/images/problem-equipo-incomodo.png"
                alt="Equipo de oficina con fatiga visual, dolor de cabeza y cansancio frente a pantallas"
                fill
                className="object-cover object-[center_20%]"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-brand-dark/15 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <p className="text-lg font-semibold text-white sm:text-xl">Se ve como tu equipo</p>
                <p className="mt-0.5 text-sm text-white/80">No te preocupes, te ayudamos.</p>
              </div>
            </div>
          </motion.div>

          <div className="order-1 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border-dark bg-border-dark sm:grid-cols-2 lg:order-2 lg:col-span-7">
            {problems.map((problem, i) => {
              const Icon = problem.icon;
              return (
                <motion.div
                  key={problem.title}
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: i * 0.07, duration: 0.5, ease: EASE }}
                  className="bg-brand-dark-elevated px-5 py-6 sm:px-6 sm:py-7"
                >
                  <Icon size={26} weight="regular" className="mb-4 text-primary" />
                  <h3 className="mb-2 text-base font-semibold leading-snug text-white sm:text-lg">
                    “{problem.title}”
                  </h3>
                  <p className="max-w-[32ch] text-sm leading-relaxed text-text-on-dark-muted">
                    {problem.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
