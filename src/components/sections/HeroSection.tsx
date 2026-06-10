"use client";

import { motion } from "framer-motion";
import { ArrowRight, Building2, CheckCircle2, Glasses } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HeroSection() {
  return (
    <section className="relative bg-background pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 opacity-50 hidden lg:block">
        <div className="w-[800px] h-[800px] bg-primary-soft rounded-full blur-3xl mix-blend-multiply" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          
          <motion.div 
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-soft text-primary text-sm font-semibold mb-6">
              <Building2 size={16} />
              <span>Servicio B2B exclusivo para empresas</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-text-primary leading-tight mb-6 text-balance">
              Llevamos la Salud Visual <span className="text-primary block">directo a tu empresa</span>
            </h1>
            
            <p className="text-lg md:text-xl text-text-secondary mb-8 max-w-2xl mx-auto lg:mx-0 text-balance leading-relaxed">
              Jornadas oftalmológicas en terreno. Cuidamos la vista de tus colaboradores dentro del horario laboral, aumentando su bienestar, comodidad y productividad sin salir de la oficina.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
              <Button href="#contacto" size="lg" className="w-full sm:w-auto gap-2">
                Agendar jornada
                <ArrowRight size={20} />
              </Button>
              <Button href="#como-funciona" variant="outline" size="lg" className="w-full sm:w-auto border-border text-text-secondary hover:bg-surface hover:border-border hover:text-text-primary shadow-sm bg-surface">
                Conocer el proceso
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-text-secondary justify-center lg:justify-start">
              <div className="flex items-center gap-1">
                <CheckCircle2 size={16} className="text-primary" />
                <span>Atención con tecnólogos médicos</span>
              </div>
              <div className="hidden sm:block text-border">•</div>
              <div className="flex items-center gap-1">
                <CheckCircle2 size={16} className="text-primary" />
                <span>Venta de lentes ópticos</span>
              </div>
              <div className="hidden sm:block text-border">•</div>
              <div className="flex items-center gap-1">
                <CheckCircle2 size={16} className="text-primary" />
                <span>Costo $0 para la empresa</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="flex-1 w-full max-w-lg lg:max-w-none relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Image Placeholder using a modern composite layout */}
            <div className="aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative border-8 border-surface bg-background flex items-center justify-center">
              <img 
                src="https://images.unsplash.com/photo-1574482620826-40685ca5ebe2?auto=format&fit=crop&q=80&w=1200" 
                alt="Chequeo visual en empresa" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent mix-blend-multiply" />
              
              {/* Floating badge */}
              <motion.div 
                className="absolute bottom-6 left-6 bg-surface p-4 rounded-2xl shadow-xl flex items-center gap-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <div className="w-12 h-12 bg-primary-soft text-primary rounded-full flex items-center justify-center">
                  <Glasses size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">Salud Visual</p>
                  <p className="text-xs text-text-secondary">Beneficio valorado</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
