"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Buildings,
  UsersThree,
  UserCircle,
  Check,
} from "@phosphor-icons/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const audiences = [
  {
    id: "empresa",
    icon: Buildings,
    tag: "Para la empresa",
    title: "Productividad y ahorro operacional",
    image: "/images/audience-workers.png",
    imageAlt: "Equipo corporativo en oficina",
    items: [
      "Ahorro en horas laborales perdidas por traslados.",
      "Coordinación simple y sin costo para la empresa.",
      "Mayor productividad y concentración del equipo.",
      "Mejora en retención con un beneficio muy valorado.",
    ],
    reverse: false,
  },
  {
    id: "rrhh",
    icon: UsersThree,
    tag: "Para Recursos Humanos",
    title: "Implementación sin fricción",
    image: "/images/solution-corporate.png",
    imageAlt: "Profesional realizando evaluación visual",
    items: [
      "Coordinación ágil con un solo punto de contacto.",
      "Sin carga administrativa compleja ni logística extra.",
      "Beneficio tangible que mejora el clima laboral.",
      "Respuesta y seguimiento en plazos definidos.",
    ],
    reverse: true,
  },
  {
    id: "trabajadores",
    icon: UserCircle,
    tag: "Para los trabajadores",
    title: "Bienestar sin salir del trabajo",
    image: "/images/hero-corporate.png",
    imageAlt: "Colaborador recibiendo atención visual en empresa",
    items: [
      "Atención en el lugar de trabajo, sin traslados.",
      "Sin salas de espera ni permisos complicados.",
      "Asesoría experta para adquirir lentes ópticos.",
      "Mejora inmediata en calidad de vida y bienestar.",
    ],
    reverse: false,
  },
];

export default function BenefitsSection() {
  const reduce = useReducedMotion();

  return (
    <section id="beneficios" className="section-y relative overflow-hidden bg-white">
      <div className="dot-grid-pattern pointer-events-none absolute right-0 top-0 h-48 w-48 opacity-40" aria-hidden />

      <div className="container-site relative z-10">
        <motion.div
          initial={reduce ? false : { opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className="mb-10 max-w-2xl sm:mb-14"
        >
          <h2 className="section-title section-title--caps mb-4">
            Beneficios de las{" "}
            <span className="hero-headline-serif normal-case text-primary">jornadas oftalmológicas</span>
          </h2>
          <p className="text-base leading-relaxed text-text-secondary sm:text-lg">
            Un servicio pensado para generar impacto en la empresa, simplificar la gestión de RRHH y mejorar la vida de cada colaborador.
          </p>
        </motion.div>

        <div className="space-y-8 sm:space-y-12 lg:space-y-16">
          {audiences.map((block, blockIndex) => {
            const Icon = block.icon;
            return (
              <motion.div
                key={block.id}
                initial={reduce ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: blockIndex * 0.05, ease: EASE }}
                className={`grid grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16 ${
                  block.reverse ? "lg:[direction:rtl]" : ""
                }`}
              >
                <div className={`order-2 lg:order-none ${block.reverse ? "lg:[direction:ltr]" : ""}`}>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary-mist px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                    <Icon size={16} weight="bold" />
                    {block.tag}
                  </div>
                  <h3 className="mb-4 text-xl font-extrabold uppercase tracking-tight text-brand-dark sm:mb-5 sm:text-2xl lg:text-3xl">
                    {block.title}
                  </h3>
                  <ul className="space-y-3.5">
                    {block.items.map((item, i) => (
                      <motion.li
                        key={item}
                        initial={reduce ? false : { opacity: 0, x: -12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: EASE }}
                        className="flex items-start gap-3"
                      >
                        <span className="flyer-icon-circle mt-0.5 h-6 w-6">
                          <Check size={12} weight="bold" />
                        </span>
                        <span className="text-sm leading-relaxed text-text-primary sm:text-base">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div className={`relative order-1 lg:order-none ${block.reverse ? "lg:[direction:ltr]" : ""}`}>
                  <div className="image-frame relative ring-2 ring-brand-dark/5">
                    <div className="relative aspect-[16/11] sm:aspect-[16/10]">
                      <Image
                        src={block.image}
                        alt={block.imageAlt}
                        fill
                        className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-brand-dark/20 via-transparent to-transparent" />
                    </div>
                  </div>
                  <div
                    className={`absolute -bottom-4 hidden h-16 w-16 rounded-full sm:block ${
                      block.reverse ? "-left-4 bg-primary/15" : "-right-4 bg-brand-dark/8"
                    }`}
                    aria-hidden
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
