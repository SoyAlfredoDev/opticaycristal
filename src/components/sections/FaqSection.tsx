"use client";

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

export default function FaqSection() {
  return (
    <section id="faq" className="py-24 lg:py-32 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight mb-4 text-balance">
            Preguntas frecuentes
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed max-w-[65ch]">
            Respuestas claras sobre cómo organizamos las jornadas oftalmológicas en tu empresa.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
          {faqs.map((faq, index) => (
            <Reveal key={faq.question} delay={index * 0.05}>
              <div className="border-t border-border pt-6">
                <h3 className="text-base font-semibold text-text-primary mb-2 tracking-tight">
                  {faq.question}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
