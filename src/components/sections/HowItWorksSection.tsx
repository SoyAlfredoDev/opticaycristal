"use client";

import { motion } from "framer-motion";
import { MessageSquare, Calendar, Truck, Eye, Glasses } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HowItWorksSection() {
  const steps = [
    {
      icon: <MessageSquare size={24} />,
      title: "Solicitas información",
      description: "Contáctanos para evaluar el tamaño de tu equipo y enviarte una propuesta preliminar."
    },
    {
      icon: <Calendar size={24} />,
      title: "Coordinamos fecha",
      description: "Agendamos el día y los bloques de atención, comunicándolo a tus colaboradores."
    },
    {
      icon: <Truck size={24} />,
      title: "Acudimos a la empresa",
      description: "Instalamos nuestro equipo óptimo en un espacio habilitado dentro de tus oficinas."
    },
    {
      icon: <Eye size={24} />,
      title: "Realizamos chequeos",
      description: "Tecnólogos médicos evalúan a cada trabajador, detectando problemas visuales."
    },
    {
      icon: <Glasses size={24} />,
      title: "Asesoría y lentes",
      description: "Orientamos sobre salud visual y ofrecemos lentes ópticos a quienes los necesiten."
    }
  ];

  return (
    <section id="como-funciona" className="py-24 bg-surface relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">
              Proceso Simple
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 text-balance">
              ¿Cómo funciona una Jornada Oftalmológica?
            </h3>
            <p className="text-lg text-text-secondary text-balance">
              Nos encargamos de todo el proceso para que la experiencia sea fluida, rápida y sin dolores de cabeza para la administración.
            </p>
          </motion.div>
        </div>

        <div className="relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative flex flex-col items-center text-center group"
              >
                <div className="w-16 h-16 bg-surface border-2 border-primary-soft rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-surface group-hover:border-primary transition-all shadow-xl shadow-primary/10 z-10 relative">
                  {step.icon}
                  {/* Step number badge */}
                  <div className="absolute -top-3 -right-3 w-7 h-7 bg-text-primary text-surface rounded-full flex items-center justify-center text-xs font-bold border-2 border-surface">
                    {index + 1}
                  </div>
                </div>
                
                <h4 className="text-lg font-bold text-text-primary mb-3 group-hover:text-primary transition-colors">
                  {step.title}
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed max-w-xs md:max-w-none">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
        
        <motion.div 
          className="mt-20 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <Button href="#contacto" size="lg" className="bg-text-primary text-surface hover:bg-text-secondary border-none">
            Comenzar el proceso
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
