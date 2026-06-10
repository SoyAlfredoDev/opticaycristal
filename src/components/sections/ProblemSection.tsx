"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Clock, Activity, BatteryWarning, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function ProblemSection() {
  const problems = [
    {
      icon: <BatteryWarning className="text-primary" size={28} />,
      title: "Fatiga visual en el equipo",
      description: "Hogar y oficina llenos de pantallas provocan cansancio ocular, dolores de cabeza y reducción de concentración en los trabajadores."
    },
    {
      icon: <Clock className="text-secondary-500" size={28} />,
      title: "Pérdida de tiempo laboral",
      description: "Salir al oftalmólogo u óptica significa pedir permisos, ausentarse horas o lidiar con trayectos que interrumpen la productividad."
    },
    {
      icon: <TrendingDown className="text-primary-hover" size={28} />,
      title: "Baja prevención en salud",
      description: "La falta de tiempo hace que los colaboradores posterguen sus chequeos visuales, agravando problemas que eran fáciles de corregir."
    },
    {
      icon: <AlertTriangle className="text-primary" size={28} />,
      title: "Falta de beneficios prácticos",
      description: "Muchas empresas ofrecen beneficios que no se usan. La salud visual es una necesidad real y transversal que a menudo se ignora."
    }
  ];

  const containerVariant = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section id="problema" className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">
              El Desafío Actual
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 text-balance">
              La salud visual de tu equipo está afectando su día a día
            </h3>
            <p className="text-lg text-text-secondary text-balance">
              El ritmo actual de trabajo y la exposición a pantallas han convertido los problemas visuales en uno de los principales dolores silenciosos dentro de las empresas.
            </p>
          </motion.div>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {problems.map((problem, index) => (
            <motion.div key={index} variants={itemVariant}>
              <Card hoverEffect className="h-full bg-background border-border">
                <div className="w-14 h-14 bg-surface rounded-xl shadow-sm flex items-center justify-center mb-6">
                  {problem.icon}
                </div>
                <h4 className="text-xl font-bold text-text-primary mb-3">{problem.title}</h4>
                <p className="text-text-secondary leading-relaxed text-sm">
                  {problem.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
