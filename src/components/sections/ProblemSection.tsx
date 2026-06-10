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
    tint: "bg-white",
  },
  {
    icon: Clock,
    title: "Pérdida de tiempo laboral",
    description:
      "Ir al oftalmólogo implica permisos, traslados y horas fuera de la oficina que interrumpen la productividad.",
    span: "lg:col-span-1",
    tint: "bg-primary-mist/60",
  },
  {
    icon: TrendDown,
    title: "Baja prevención en salud",
    description:
      "La falta de tiempo hace postergar chequeos visuales, agravando problemas que eran fáciles de corregir.",
    span: "lg:col-span-1",
    tint: "bg-primary-mist/60",
  },
  {
    icon: Warning,
    title: "Beneficios poco utilizados",
    description:
      "Muchas empresas ofrecen beneficios que no se usan. La salud visual es una necesidad real y transversal.",
    span: "lg:col-span-2",
    tint: "bg-white",
  },
];

export default function ProblemSection() {
  return (
    <section id="problema" className="section-y relative overflow-hidden bg-muted">
      <div className="circle-decoration circle-decoration--ring absolute -right-20 -top-20 h-[280px] w-[280px] opacity-40" />
      <div className="organic-blob organic-blob--soft absolute bottom-0 left-0 h-[300px] w-[300px] opacity-50" />

      <div className="container-site relative z-10">
        <Reveal className="mb-14 max-w-2xl lg:mb-16">
          <h2 className="mb-5 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-text-primary md:text-4xl lg:text-[2.75rem]">
            La salud visual de tu equipo afecta su día a día
          </h2>
          <p className="max-w-[60ch] text-lg leading-relaxed text-text-secondary">
            El ritmo de trabajo y la exposición a pantallas han convertido los problemas visuales en uno de los dolores silenciosos dentro de las empresas chilenas.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <Reveal key={problem.title} delay={index * 0.08} className={problem.span}>
                <Card hoverEffect className={`h-full ${problem.tint}`}>
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Icon size={24} weight="regular" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold tracking-tight text-text-primary">
                    {problem.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary">
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
