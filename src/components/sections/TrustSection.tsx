"use client";

import { motion } from "framer-motion";
import { ShieldCheck, MapPin, Award, HeartHandshake } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function TrustSection() {
  const trustPillars = [
    {
      icon: <MapPin size={32} />,
      title: "Ubicación Real",
      description: "Local establecido en Huérfanos 713, local 18, Santiago Centro. Una óptica física que respalda cada jornada."
    },
    {
      icon: <Award size={32} />,
      title: "Experiencia Profesional",
      description: "Atención exclusiva por tecnólogos médicos en oftalmología, garantizando un diagnóstico certero."
    },
    {
      icon: <ShieldCheck size={32} />,
      title: "Garantía de Calidad",
      description: "Todos nuestros lentes y cristales cuentan con respaldo y procesos de calidad rigurosos."
    },
    {
      icon: <HeartHandshake size={32} />,
      title: "Servicio Personalizado",
      description: "No somos una óptica masiva. Entregamos un trato cercano, humano y adaptado a las necesidades de cada empresa."
    }
  ];

  return (
    <section className="py-24 bg-text-primary text-surface relative overflow-hidden">
      {/* Texture background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-primary-soft font-semibold tracking-wide uppercase text-sm mb-3">
              Respaldo y Confianza
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold mb-6 text-balance text-surface">
              Más que un operativo, somos tu óptica de confianza
            </h3>
            <p className="text-lg text-surface/70 text-balance">
              Llevar salud a tu empresa requiere seriedad. Contamos con estructura real, profesionales certificados y procesos claros para garantizar tranquilidad total.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustPillars.map((pillar, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="h-full bg-surface/5 backdrop-blur border-surface/10 hover:border-primary-soft transition-colors text-center text-surface p-8">
                <div className="mx-auto w-16 h-16 bg-surface/10 text-primary-soft rounded-2xl flex items-center justify-center mb-6">
                  {pillar.icon}
                </div>
                <h4 className="text-xl font-bold text-surface mb-3">{pillar.title}</h4>
                <p className="text-surface/70 text-sm leading-relaxed">
                  {pillar.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
