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
    accent: "bg-primary-mist",
  },
  {
    icon: Brain,
    title: "Dolor de cabeza",
    description: "La tensión visual se traduce en dolores recurrentes durante la jornada laboral.",
    accent: "bg-white",
  },
  {
    icon: TrendDown,
    title: "Menor productividad",
    description: "Equipos con visión deficiente rinden menos y cometen más errores.",
    accent: "bg-white",
  },
  {
    icon: WarningCircle,
    title: "Problemas no detectados",
    description: "Muchos colaboradores desconocen alteraciones visuales que podrían corregirse a tiempo.",
    accent: "bg-primary-mist",
  },
];

export default function ProblemSection() {
  const reduce = useReducedMotion();

  return (
    <section id="problema" className="section-y relative overflow-hidden bg-muted">
      <div className="circle-decoration circle-decoration--fill absolute -left-24 bottom-0 h-[300px] w-[300px]" />

      <div className="container-site relative z-10">
        <div className="mb-10 grid grid-cols-1 gap-10 lg:mb-14 lg:grid-cols-[1fr_1.1fr] lg:items-end lg:gap-16">
          <motion.div
            initial={reduce ? false : { opacity: 1, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <span className="section-eyebrow mb-4">El problema</span>
            <h2 className="section-title mb-4">
              El problema que enfrentan{" "}
              <span className="hero-headline-serif text-primary">tus colaboradores</span>
            </h2>
            <p className="max-w-[55ch] text-base leading-relaxed text-text-secondary sm:text-lg">
              La exposición constante a pantallas convirtió la salud visual en un dolor silencioso dentro de las empresas chilenas.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45, ease: EASE }}
                className="card-premium px-4 py-4 sm:py-5"
              >
                <p className="stat-value mb-1 text-2xl font-bold text-primary sm:text-3xl">{stat.value}</p>
                <p className="text-xs leading-snug text-text-secondary sm:text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
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
              <div className="absolute inset-0 bg-gradient-to-t from-text-primary/50 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-lg font-semibold text-white">¿Te resulta familiar?</p>
                <p className="text-sm text-white/85">Tu equipo merece una solución en terreno.</p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7 lg:gap-5">
            {problems.map((problem, i) => {
              const Icon = problem.icon;
              return (
                <motion.div
                  key={problem.title}
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: i * 0.07, duration: 0.5, ease: EASE }}
                  whileHover={reduce ? undefined : { y: -3 }}
                  className={`card-premium ${problem.accent} p-5 sm:p-6`}
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon size={22} weight="regular" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-text-primary">{problem.title}</h3>
                  <p className="text-sm leading-relaxed text-text-secondary">{problem.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
