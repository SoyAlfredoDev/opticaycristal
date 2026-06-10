"use client";

import { ArrowRight, Phone } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export default function CtaSection() {
  return (
    <section id="contacto" className="py-24 lg:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative rounded-[var(--radius-shell)] p-1.5 ring-1 ring-primary/15 shadow-brand-lg overflow-hidden">
            <div className="relative rounded-[var(--radius-inner)] bg-primary px-8 py-14 md:px-16 md:py-20 text-center overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary-hover/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-soft/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

              <div className="max-w-2xl mx-auto relative z-10">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-surface tracking-tight mb-5 text-balance leading-[1.1]">
                  Lleva bienestar visual a tu equipo
                </h2>
                <p className="text-lg text-surface/80 mb-10 max-w-[65ch] mx-auto leading-relaxed">
                  Solicita una cotización. Nos encargamos de organizar la mejor experiencia oftalmológica dentro de tus instalaciones.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    href="/jornadas"
                    size="lg"
                    className="w-full sm:w-auto bg-surface text-primary hover:bg-surface/90 border-none shadow-brand-lg"
                    icon={<ArrowRight size={16} weight="bold" />}
                  >
                    Cotizar servicio
                  </Button>
                  <Button
                    href="tel:+56900000000"
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto bg-transparent border-surface/25 text-surface hover:bg-surface/10 hover:text-surface hover:border-surface/40"
                    icon={<Phone size={16} weight="bold" />}
                  >
                    Llamar ahora
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
