"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Buildings,
  CreditCard,
  CurrencyCircleDollar,
  Eye,
  Eyeglasses,
  Heart,
  Truck,
  UserCircle,
  UsersThree,
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
      {
        text: "Ahorro en horas laborales perdidas por traslados. Nosotros vamos a la empresa.",
        icon: Truck,
      },
      {
        text: "Es gratis: no pagas nada.",
        icon: CurrencyCircleDollar,
      },
      {
        text: "Posibilidad de crédito directo a la empresa, para que sus trabajadores paguen en cuotas.",
        icon: CreditCard,
      },
      {
        text: "Mejora tangible en el clima laboral de su empresa.",
        icon: UsersThree,
      },
    ],
    reverse: false,
  },
  {
    id: "trabajadores",
    icon: UserCircle,
    tag: "Para los trabajadores",
    title: "Bienestar sin salir del trabajo",
    image: "/images/hero-corporate.png",
    imageAlt: "Colaborador recibiendo atención visual en empresa",
    items: [
      {
        text: "Chequeo visual gratuito.",
        icon: Eye,
      },
      {
        text: "Atención en el lugar de trabajo, sin traslados.",
        icon: Buildings,
      },
      {
        text: "Asesoría experta para adquirir lentes que se adapten a tu estilo.",
        icon: Eyeglasses,
      },
      {
        text: "Mejora inmediata en calidad de vida y bienestar.",
        icon: Heart,
      },
    ],
    reverse: true,
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
          <h2 className="section-title mb-4">
            No te preocupes,{" "}
            <span className="hero-headline-serif text-primary">te ayudamos</span>
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
                    <Icon size={16} weight="regular" />
                    {block.tag}
                  </div>
                  <h3 className="mb-4 text-xl font-extrabold uppercase tracking-tight text-brand-dark sm:mb-5 sm:text-2xl lg:text-3xl">
                    {block.title}
                  </h3>
                  <ul className="space-y-3.5">
                    {block.items.map((item, i) => {
                      const ItemIcon = item.icon;
                      return (
                        <motion.li
                          key={item.text}
                          initial={reduce ? false : { opacity: 0, x: -12 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: EASE }}
                          className="flex items-start gap-3"
                        >
                          <ItemIcon
                            size={22}
                            weight="regular"
                            className="mt-0.5 shrink-0 text-primary"
                          />
                          <span className="text-sm leading-relaxed text-text-primary sm:text-base">
                            {item.text}
                          </span>
                        </motion.li>
                      );
                    })}
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
