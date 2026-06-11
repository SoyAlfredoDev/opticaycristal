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
      <div className="border-t border-border">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-4 py-6 text-left group cursor-pointer"
          aria-expanded={isOpen}
        >
          <h3 className="text-base lg:text-lg font-semibold text-text-primary tracking-tight group-hover:text-primary transition-colors duration-300">
            {faq.question}
          </h3>
          <span className="shrink-0 w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:text-white">
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
              <p className="text-text-secondary text-sm leading-relaxed pb-6 max-w-[65ch]">
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
    <section id="faq" className="relative py-28 lg:py-36 bg-white overflow-hidden">
      {/* ── Decorative circle ── */}
      <div className="circle-decoration circle-decoration--muted absolute top-20 -right-16 w-[280px] h-[280px]" />

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Reveal className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-text-primary tracking-tight mb-5 text-balance leading-[1.12]">
            Preguntas frecuentes
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed max-w-[55ch] mx-auto">
            Respuestas claras sobre cómo organizamos las jornadas oftalmológicas en tu empresa.
          </p>
        </Reveal>

        <div>
          {faqs.map((faq, index) => (
            <FaqItem key={faq.question} faq={faq} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
