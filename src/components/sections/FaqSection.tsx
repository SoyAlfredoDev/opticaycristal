"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";

const faqs = [
  {
    question: "¿Cómo funciona una jornada oftalmológica en empresa?",
    answer:
      "Llevamos nuestros equipos a tus instalaciones. Agendamos bloques de atención, evaluamos a tus colaboradores y les damos la opción de adquirir lentes si lo requieren.",
  },
  {
    question: "¿Cuántos trabajadores pueden participar?",
    answer:
      "Podemos atender desde pequeños equipos hasta grandes dotaciones. Ajustamos la cantidad de días o profesionales según el número de colaboradores.",
  },
  {
    question: "¿Se realiza dentro de la empresa?",
    answer:
      "Sí, es un servicio 100% en terreno. Solo necesitamos un espacio adecuado, como una sala de reuniones u oficina disponible, para instalar los equipos con privacidad.",
  },
  {
    question: "¿Los trabajadores pueden comprar lentes?",
    answer:
      "Sí. Llevamos una muestra de armazones para probarse y elegir, con asesoría sobre el mejor tipo de cristal para cada caso.",
  },
  {
    question: "¿Se agenda previamente?",
    answer:
      "Sí, coordinamos todo con anticipación junto al área de RRHH o Bienestar para asegurar que la jornada se realice sin contratiempos.",
  },
  {
    question: "¿Atienden solo en Santiago?",
    answer:
      "Principalmente en Santiago Centro y la Región Metropolitana. Podemos evaluar disponibilidad para otras zonas según requerimiento.",
  },
];

function FaqItem({ faq, index }: { faq: typeof faqs[number]; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Reveal delay={index * 0.05}>
      <div className="overflow-hidden rounded-[var(--radius-inner)] bg-white shadow-card ring-1 ring-black/[0.04]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left"
          aria-expanded={isOpen}
        >
          <h3 className="text-base font-semibold tracking-tight text-text-primary transition-colors duration-300 group-hover:text-primary lg:text-lg">
            {faq.question}
          </h3>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white">
            {isOpen ? <Minus size={16} weight="bold" /> : <Plus size={16} weight="bold" />}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <p className="max-w-[65ch] px-6 pb-5 text-sm leading-relaxed text-text-secondary">
                {faq.answer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

export default function FaqSection() {
  return (
    <section id="faq" className="section-y relative overflow-hidden bg-white">
      <div className="circle-decoration circle-decoration--fill absolute -right-16 top-20 h-[280px] w-[280px]" />

      <div className="container-site relative z-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="mb-5 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-text-primary md:text-4xl lg:text-[2.75rem]">
              Preguntas frecuentes
            </h2>
            <p className="max-w-[55ch] text-lg leading-relaxed text-text-secondary">
              Respuestas claras sobre cómo organizamos las jornadas oftalmológicas en tu empresa.
            </p>
          </Reveal>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <FaqItem key={faq.question} faq={faq} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
