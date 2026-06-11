"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle, Phone } from "@phosphor-icons/react";
import JornadaLeadForm from "@/components/forms/JornadaLeadForm";
import { Button } from "@/components/ui/Button";

const EASE = [0.16, 1, 0.3, 1] as const;

const highlights = [
  "Sin costo para la empresa",
  "Atención con tecnólogos médicos",
  "Respuesta en 48 horas hábiles",
  "Coordinación completa en terreno",
];

export default function ContratarSection() {
  const reduce = useReducedMotion();

  return (
    <section id="contratar" className="section-y relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-b from-primary-mist/40 via-white to-muted/30 pointer-events-none" />
      <div className="circle-decoration circle-decoration--ring absolute -left-20 bottom-20 h-[260px] w-[260px] opacity-40" />

      <div className="container-site relative z-10">
        <motion.div
          initial={reduce ? false : { opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className="mb-8 text-center sm:mb-10 lg:mb-12"
        >
          <div className="mb-4 flex justify-center">
            <span className="section-eyebrow">Conversión</span>
          </div>
          <h2 className="section-title mb-4">
            Contratar una{" "}
            <span className="hero-headline-serif text-primary">jornada</span>
          </h2>
          <p className="mx-auto max-w-[58ch] text-base leading-relaxed text-text-secondary sm:text-lg">
            Completa el formulario y coordinaremos la jornada oftalmológica en tu empresa. Sin compromiso, respuesta rápida.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-10 xl:gap-14">
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: EASE }}
            className="flex flex-col gap-6"
          >
            <div className="image-frame relative">
              <div className="relative aspect-[16/10] min-h-[200px]">
                <Image
                  src="/images/hero-corporate.png"
                  alt="Jornada oftalmológica en empresa"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/25 to-transparent" />
              </div>
            </div>

            <ul className="space-y-3.5">
              {highlights.map((item, i) => (
                <motion.li
                  key={item}
                  initial={reduce ? false : { opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4, ease: EASE }}
                  className="flex items-center gap-3 text-sm text-text-primary sm:text-base"
                >
                  <CheckCircle size={20} weight="fill" className="shrink-0 text-primary" />
                  {item}
                </motion.li>
              ))}
            </ul>

            <div className="card-premium hidden flex-col gap-3 bg-muted/50 p-5 sm:flex sm:p-6">
              <p className="text-sm font-semibold text-text-primary">¿Prefieres hablar directamente?</p>
              <Button href="tel:+56900000000" variant="outline" size="md" icon={<Phone size={16} weight="bold" />} className="w-fit">
                Llamar ahora
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.08, ease: EASE }}
          >
            <JornadaLeadForm />
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: EASE }}
          className="mt-6 sm:hidden"
        >
          <Button href="tel:+56900000000" variant="outline" size="lg" className="w-full min-h-[52px]" icon={<Phone size={16} weight="bold" />}>
            Llamar ahora
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
