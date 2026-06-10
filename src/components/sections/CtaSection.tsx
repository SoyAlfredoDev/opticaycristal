"use client";

import { motion } from "framer-motion";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function CtaSection() {
  return (
    <section id="contacto" className="py-24 bg-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <motion.div 
          className="bg-primary rounded-3xl p-8 md:p-16 lg:p-20 text-center relative overflow-hidden shadow-2xl"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          {/* Decorative abstract shapes */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-hover rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 opacity-50" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-soft rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 opacity-20" />

          <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-surface mb-6 text-balance leading-tight">
              Lleva bienestar visual a tu equipo hoy mismo
            </h2>
            <p className="text-xl text-surface/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              Solicita una cotización o agenda una reunión. Nosotros nos encargamos de organizar la mejor experiencia oftalmológica dentro de tus instalaciones.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                href="mailto:contacto@opticaycristal.cl?subject=Cotización%20Jornada%20Empresa" 
                size="lg"
                className="w-full sm:w-auto bg-surface text-primary hover:bg-surface/90 shadow-xl gap-2 group border-none"
              >
                Solicitar cotización
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                href="tel:+56900000000" 
                variant="outline"
                size="lg"
                className="w-full sm:w-auto bg-primary-hover/50 hover:bg-primary-hover backdrop-blur border-surface/20 text-surface gap-2 hover:text-surface"
              >
                <Mail size={20} />
                Hablemos por correo
              </Button>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
