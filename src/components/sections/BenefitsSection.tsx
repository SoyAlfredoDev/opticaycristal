"use client";

import { motion } from "framer-motion";
import { Building, Users, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function BenefitsSection() {
  const companyBenefits = [
    "Ahorro significativo en horas laborales perdidas.",
    "Proceso de coordinación simple y sin costo.",
    "Aumento en la productividad y concentración del equipo.",
    "Mejora en la retención entregando un beneficio muy valorado."
  ];

  const employeeBenefits = [
    "Comodidad total al recibir atención en el lugar de trabajo.",
    "Ahorro de tiempo en traslados y salas de espera.",
    "Facilidad para adquirir lentes ópticos con asesoría experta.",
    "Mejora inmediata en su calidad de vida y bienestar diario."
  ];

  return (
    <section id="beneficios" className="py-24 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">
              Múltiples Beneficios
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 text-balance">
              Un ganar-ganar para tu empresa y tus colaboradores
            </h3>
            <p className="text-lg text-text-secondary text-balance">
              Nuestro servicio está diseñado para generar impacto positivo desde el primer momento, optimizando el tiempo empresarial y mejorando la calidad de vida laboral.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Beneficios Empresa */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <Card className="h-full relative overflow-hidden group border-border">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-soft rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform duration-500" />
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-primary-soft text-primary rounded-2xl flex items-center justify-center">
                  <Building size={28} />
                </div>
                <h4 className="text-2xl font-bold text-text-primary">Para la Empresa</h4>
              </div>
              
              <ul className="space-y-5">
                {companyBenefits.map((benefit, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i, duration: 0.4 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle className="text-primary shrink-0 mt-0.5" size={20} />
                    <span className="text-text-secondary leading-relaxed">{benefit}</span>
                  </motion.li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {/* Beneficios Colaborador */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="h-full bg-text-primary border-transparent text-surface relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-surface/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform duration-500" />
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-surface/10 text-primary-soft rounded-2xl flex items-center justify-center">
                  <Users size={28} />
                </div>
                <h4 className="text-2xl font-bold text-surface">Para los Trabajadores</h4>
              </div>
              
              <ul className="space-y-5">
                {employeeBenefits.map((benefit, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i, duration: 0.4 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle className="text-primary-soft shrink-0 mt-0.5" size={20} />
                    <span className="text-surface/80 leading-relaxed">{benefit}</span>
                  </motion.li>
                ))}
              </ul>
            </Card>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
