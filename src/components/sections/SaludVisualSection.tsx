"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DesktopTower, SteeringWheel } from "@phosphor-icons/react";
import VisionCompareSlider from "@/components/salud-visual/VisionCompareSlider";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function SaludVisualSection() {
  const reduce = useReducedMotion();
  const [correctedWork, setCorrectedWork] = useState(false);

  return (
    <section
      id="salud-visual"
      className="section-y relative scroll-mt-[calc(var(--nav-height)+0.75rem)] overflow-hidden bg-warm"
    >
      <div className="dot-grid-pattern pointer-events-none absolute left-0 top-0 h-40 w-[45%] opacity-50" aria-hidden />

      <div className="container-site relative z-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="mb-8 max-w-[38rem] sm:mb-12"
        >
          <h2 className="section-title mb-4 max-w-[16rem] sm:max-w-[28rem] lg:max-w-[34rem]">
            ¿Sabías cómo ve una persona que{" "}
            <span className="hero-headline-serif text-primary">necesita lentes?</span>
          </h2>
          <p className="text-[15px] leading-relaxed text-text-secondary sm:text-lg">
            Muchas personas pueden necesitar corrección visual sin darse cuenta.
            No usar lentes cuando hacen falta puede afectar actividades cotidianas,
            el trabajo y la seguridad.
          </p>
        </motion.div>

        <div className="space-y-10 lg:space-y-14">
          <motion.article
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <SteeringWheel size={20} weight="regular" className="text-primary" />
              <p className="text-sm font-semibold text-brand-dark sm:text-[15px]">
                Visión de lejos al conducir
              </p>
            </div>

            <div className="image-frame mx-auto w-full max-w-[36rem] lg:max-w-[42rem]">
              <VisionCompareSlider
                src="/images/salud-visual-conduccion-hd.png"
                alt="Vista nítida en primera persona desde el asiento del conductor, con las manos en el volante, el interior del auto y la calle con vehículos y señalización al frente"
              />
            </div>

            <p className="mt-3 text-center text-[11px] font-medium tracking-wide text-text-tertiary sm:mt-4 sm:text-xs">
              Arrastra el control para comparar
            </p>
            <p className="mx-auto mt-3 max-w-[52ch] text-sm leading-relaxed text-text-secondary sm:text-[15px]">
              No ver correctamente a distancia puede dificultar reconocer señales,
              vehículos, peatones y otros elementos importantes al conducir.
            </p>
          </motion.article>

          <motion.article
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: 0.06, ease: EASE }}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <DesktopTower size={20} weight="regular" className="text-primary" />
                <p className="text-sm font-semibold text-brand-dark sm:text-[15px]">
                  En el entorno de trabajo
                </p>
              </div>

              <div
                className="inline-flex w-full rounded-full border border-border bg-white p-1 sm:w-auto"
                role="group"
                aria-label="Comparar postura de trabajo"
              >
                <button
                  type="button"
                  onClick={() => setCorrectedWork(false)}
                  aria-pressed={!correctedWork}
                  className={`min-h-11 flex-1 rounded-full px-4 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors duration-300 sm:flex-none sm:text-xs ${
                    !correctedWork
                      ? "bg-primary text-white"
                      : "text-text-secondary hover:text-brand-dark"
                  }`}
                >
                  Sin corrección
                </button>
                <button
                  type="button"
                  onClick={() => setCorrectedWork(true)}
                  aria-pressed={correctedWork}
                  className={`min-h-11 flex-1 rounded-full px-4 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors duration-300 sm:flex-none sm:text-xs ${
                    correctedWork
                      ? "bg-primary text-white"
                      : "text-text-secondary hover:text-brand-dark"
                  }`}
                >
                  Con corrección
                </button>
              </div>
            </div>

            <div className="image-frame relative mx-auto aspect-[16/10] w-full max-w-[36rem] overflow-hidden sm:aspect-[16/9] lg:max-w-[42rem]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={correctedWork ? "con" : "sin"}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                  className="absolute inset-0"
                >
                  <Image
                    src={
                      correctedWork
                        ? "/images/salud-visual-trabajo-con-hd.png"
                        : "/images/salud-visual-trabajo-sin-hd.png"
                    }
                    alt={
                      correctedWork
                        ? "Profesional sonriente trabajando a una distancia cómoda del computador, con lentes y una postura relajada"
                        : "Profesional con el rostro muy cerca de la pantalla, entrecerrando los ojos y con un gesto de cansancio al intentar leer"
                    }
                    fill
                    className="object-cover object-[center_25%]"
                    sizes="(max-width: 768px) 100vw, 672px"
                    quality={90}
                  />
                </motion.div>
              </AnimatePresence>

              <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-brand-dark/72 px-2.5 py-1.5 text-white backdrop-blur-[2px] sm:bottom-4 sm:left-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/70 sm:text-[10px]">
                  {correctedWork ? "Con corrección" : "Sin corrección"}
                </p>
                <p className="text-xs font-semibold sm:text-sm">
                  {correctedWork ? "Distancia y postura más cómodas" : "Esfuerzo frente a la pantalla"}
                </p>
              </div>
            </div>

            <p className="mx-auto mt-4 max-w-[52ch] text-sm leading-relaxed text-text-secondary sm:text-[15px]">
              Acercarse a la pantalla suele ser una forma de compensar. Con una
              corrección adecuada, la distancia de trabajo y la postura suelen
              volver a un punto más cómodo.
            </p>
          </motion.article>
        </div>

        <p className="mt-8 max-w-[48ch] text-[11px] leading-relaxed text-text-tertiary sm:mt-10 sm:text-xs">
          Contenido educativo de concientización. No reemplaza una evaluación
          visual profesional ni describe un diagnóstico.
        </p>
      </div>
    </section>
  );
}
