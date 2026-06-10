"use client";

import { motion } from "framer-motion";
import { Stethoscope, Glasses, CalendarCheck, ShieldCheck } from "lucide-react";

export default function SolutionSection() {
  const features = [
    {
      icon: <Stethoscope size={24} />,
      title: "Evaluación profesional en terreno",
      description: "Llevamos nuestros equipos oftalmológicos directamente a tu empresa. Atendemos a tus colaboradores en sus propias instalaciones."
    },
    {
      icon: <Glasses size={24} />,
      title: "Venta de lentes ópticos",
      description: "Contamos con un amplio catálogo de armazones y cristales. Los trabajadores pueden probarse y adquirir sus lentes inmediatamente."
    },
    {
      icon: <CalendarCheck size={24} />,
      title: "Coordinación rápida y simple",
      description: "Nos encargamos de toda la logística. Agendamos los bloques de atención para no interrumpir la operatividad normal de tu empresa."
    },
    {
      icon: <ShieldCheck size={24} />,
      title: "Garantía y respaldo",
      description: "Somos una óptica establecida en Santiago Centro. Entregamos un servicio confiable con garantía real en todos nuestros productos."
    }
  ];

  return (
    <section id="solucion" className="py-24 bg-text-primary text-surface relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-hover/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-primary-soft font-semibold tracking-wide uppercase text-sm mb-3">
              Nuestra Solución
            </h2>
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-balance leading-tight text-surface">
              La óptica va a tu oficina, para que tu equipo no deba salir de ella
            </h3>
            <p className="text-lg text-surface/80 mb-8 leading-relaxed max-w-xl">
              Transformamos cualquier espacio de tu empresa en un completo box de atención visual. Minimizamos los tiempos de desplazamiento y entregamos un servicio de excelencia y comodidad absoluta para todos tus trabajadores.
            </p>

            <ul className="space-y-6">
              {features.map((feature, index) => (
                <motion.li 
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                  className="flex gap-4"
                >
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-surface/5 border border-surface/10 flex items-center justify-center text-primary-soft">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-surface mb-1">{feature.title}</h4>
                    <p className="text-surface/70 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
             {/* Modern image layout or video placeholder */}
             <div className="aspect-[4/5] rounded-3xl overflow-hidden border border-surface/10 bg-surface/5 shadow-2xl relative">
                <img 
                  src="https://images.unsplash.com/photo-1589828135870-138318b76fc1?auto=format&fit=crop&q=80&w=1000" 
                  alt="Chequeo oftalmológico corporativo" 
                  className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-text-primary via-text-primary/20 to-transparent" />
                
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="bg-surface/10 backdrop-blur-md border border-surface/20 rounded-2xl p-6">
                    <p className="text-2xl font-bold text-surface mb-2">100% Práctico</p>
                    <p className="text-surface/80 text-sm">
                      Tus colaboradores resuelven su necesidad visual en menos de 30 minutos, volviendo rápidamente a sus labores.
                    </p>
                  </div>
                </div>
             </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
