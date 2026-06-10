"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function FaqSection() {
  const faqs = [
    {
      question: "¿Cómo funciona una jornada oftalmológica en empresa?",
      answer: "Llevamos nuestros equipos a tus instalaciones. Agendamos bloques de atención para no afectar la productividad, evaluamos a tus colaboradores y les damos la opción de adquirir lentes si lo requieren."
    },
    {
      question: "¿Cuántos trabajadores pueden participar?",
      answer: "Podemos atender desde pequeños equipos hasta grandes dotaciones. Dependiendo del número de colaboradores, ajustamos la cantidad de días o de profesionales que asisten a tu empresa."
    },
    {
      question: "¿Se realiza dentro de la empresa?",
      answer: "Sí, es un servicio 100% en terreno. Solo necesitamos un espacio físico adecuado mínimo (sala de reuniones, oficina disponible, etc.) para instalar los equipos con privacidad."
    },
    {
      question: "¿Los trabajadores pueden comprar lentes?",
      answer: "Exactamente. Llevamos una muestra representativa de armazones para que puedan probarse y elegir. Además, asesoramos sobre el mejor tipo de cristal para cada caso."
    },
    {
      question: "¿Se agenda previamente?",
      answer: "Sí, coordinamos todo con anticipación junto al área de RRHH o Bienestar para asegurar que la jornada se realice sin contratiempos."
    },
    {
      question: "¿Atienden solo en Santiago?",
      answer: "Principalmente en Santiago Centro y la Región Metropolitana, pero podemos evaluar disponibilidad y factibilidad para otras zonas según requerimiento."
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">
              Preguntas Frecuentes
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 text-balance">
              Dudas comunes sobre nuestras jornadas
            </h3>
          </motion.div>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="border border-border rounded-2xl overflow-hidden bg-surface hover:border-primary transition-colors"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
              >
                <span className="text-lg font-semibold text-text-primary pr-8">{faq.question}</span>
                <ChevronDown 
                  className={`text-text-secondary shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180 text-primary" : ""
                  }`} 
                  size={24} 
                />
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-text-secondary leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
