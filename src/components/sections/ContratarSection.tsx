"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle, Phone, PaperPlaneTilt } from "@phosphor-icons/react";
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
      <div className="dot-grid-pattern pointer-events-none absolute left-0 top-0 h-40 w-40 opacity-30" aria-hidden />

      <div className="container-site relative z-10">
        <motion.div
          initial={reduce ? false : { opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className="mb-8 text-center sm:mb-10 lg:mb-12"
        >
          <h2 className="section-title section-title--caps mb-4">
            Contratar una{" "}
            <span className="hero-headline-serif normal-case text-primary">jornada</span>
          </h2>
          <p className="mx-auto max-w-[58ch] text-base leading-relaxed text-text-secondary sm:text-lg">
            Completa el formulario y coordinaremos la jornada oftalmológica en tu empresa. Sin compromiso, respuesta rápida.
          </p>
        </motion.div>

        <div className="relative">
          <div className="flyer-value-band mb-6 lg:mb-0 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flyer-icon-circle flyer-icon-circle--outline h-12 w-12 shrink-0">
                <PaperPlaneTilt size={22} weight="regular" />
              </div>
              <div>
                <p className="text-base font-extrabold uppercase text-white">Solicita tu jornada</p>
                <p className="text-xs text-white/80">Respuesta en 48 horas, sin compromiso.</p>
              </div>
            </div>
          </div>

          <div className="flyer-value-band mb-0 hidden lg:block" aria-hidden>
            <div className="flex items-center gap-4 pt-2">
              <div className="flyer-icon-circle flyer-icon-circle--outline h-14 w-14">
                <PaperPlaneTilt size={26} weight="regular" />
              </div>
              <div>
                <p className="text-xl font-extrabold uppercase text-white">Solicita tu jornada hoy</p>
                <p className="text-sm text-white/80">Respuesta en 48 horas hábiles, sin compromiso.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:-mt-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10 xl:gap-14">
            <motion.div
              initial={reduce ? false : { opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, ease: EASE }}
              className="order-1 lg:order-2"
            >
              <JornadaLeadForm />
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, ease: EASE }}
              className="flyer-value-card order-2 flex flex-col gap-5 p-4 sm:gap-6 sm:p-6 lg:order-1 lg:mt-8"
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
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand-dark/30 to-transparent" />
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

              <div className="hidden flex-col gap-3 rounded-xl border border-border bg-muted/40 p-5 sm:flex">
                <p className="text-sm font-semibold text-brand-dark">¿Prefieres hablar directamente?</p>
                <Button href="tel:+56900000000" variant="outline" size="md" icon={<Phone size={16} weight="bold" />} className="w-fit">
                  Llamar ahora
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: EASE }}
          className="mt-5 lg:hidden"
        >
          <Button href="tel:+56900000000" variant="outline" size="lg" className="w-full min-h-[48px]" icon={<Phone size={16} weight="bold" />}>
            Llamar ahora
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
