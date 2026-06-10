"use client";

import {
  BatteryWarning,
  Clock,
  TrendDown,
  Warning,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";

const problems = [
  {
    icon: BatteryWarning,
    title: "Fatiga visual en el equipo",
    description:
      "Pantallas prolongadas provocan cansancio ocular, dolores de cabeza y menor concentración en el trabajo diario.",
    span: "lg:col-span-2",
  },
  {
    icon: Clock,
    title: "Pérdida de tiempo laboral",
    description:
      "Ir al oftalmólogo implica permisos, traslados y horas fuera de la oficina que interrumpen la productividad.",
    span: "lg:col-span-1",
  },
  {
    icon: TrendDown,
    title: "Baja prevención en salud",
    description:
      "La falta de tiempo hace postergar chequeos visuales, agravando problemas que eran fáciles de corregir.",
    span: "lg:col-span-1",
  },
  {
    icon: Warning,
    title: "Beneficios poco utilizados",
    description:
      "Muchas empresas ofrecen beneficios que no se usan. La salud visual es una necesidad real y transversal.",
    span: "lg:col-span-2",
  },
];

export default function ProblemSection() {
  return (
    <section id="problema" className="py-24 lg:py-32 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight mb-4 text-balance">
            La salud visual de tu equipo afecta su día a día
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed max-w-[65ch]">
            El ritmo de trabajo y la exposición a pantallas han convertido los problemas visuales en uno de los dolores silenciosos dentro de las empresas chilenas.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <Reveal key={problem.title} delay={index * 0.08} className={problem.span}>
                <Card hoverEffect className="h-full">
                  <div className="w-12 h-12 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mb-5">
                    <Icon size={24} weight="regular" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2 tracking-tight">
                    {problem.title}
                  </h3>
                  <p className="text-text-secondary leading-relaxed text-sm">
                    {problem.description}
                  </p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
