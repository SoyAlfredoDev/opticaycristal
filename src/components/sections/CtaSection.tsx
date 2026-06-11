"use client";

import { ArrowRight, Phone } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export default function CtaSection() {
  return (
    <section id="contacto" className="py-28 lg:py-36 bg-muted">
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative rounded-[var(--radius-shell)] p-1.5 ring-1 ring-primary/15 shadow-brand-lg overflow-hidden bg-white">
            <div className="relative rounded-[var(--radius-inner)] bg-gradient-to-br from-primary via-primary to-primary-hover px-8 py-16 md:px-16 md:py-24 text-center overflow-hidden">
              {/* ── Decorative circles ── */}
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full border border-white/10 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              <div className="absolute top-0 right-0 w-60 h-60 rounded-full border border-white/5 -translate-y-1/3 translate-x-1/4 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full border border-white/8 translate-y-1/2 -translate-x-1/3 pointer-events-none" />

              {/* ── Soft gradient overlay ── */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

              <div className="max-w-2xl mx-auto relative z-10">
                <p className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-4">Comienza ahora</p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6 text-balance leading-[1.1]">
                  Lleva bienestar visual a tu equipo
                </h2>
                <p className="text-lg text-white/80 mb-12 max-w-[55ch] mx-auto leading-relaxed">
                  Solicita una cotización. Nos encargamos de organizar la mejor experiencia oftalmológica dentro de tus instalaciones.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    href="/jornadas"
                    size="lg"
                    className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 border-none shadow-brand-lg hover:shadow-brand-hover"
                    icon={<ArrowRight size={16} weight="bold" />}
                  >
                    Solicitar jornada
                  </Button>
                  <Button
                    href="tel:+56900000000"
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto bg-transparent border-2 border-white/25 text-white hover:bg-white/10 hover:text-white hover:border-white/40"
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
