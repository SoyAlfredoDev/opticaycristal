"use client";

import { ArrowRight, Phone } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export default function CtaSection() {
  return (
    <section id="contacto" className="section-y bg-muted">
      <div className="container-site">
        <Reveal>
          <div className="relative overflow-hidden rounded-[var(--radius-shell)] bg-white p-8 shadow-brand-lg ring-1 ring-black/[0.04] md:p-12 lg:p-16">
            <div className="circle-decoration circle-decoration--ring absolute -right-20 -top-20 h-[280px] w-[280px]" />
            <div className="circle-decoration circle-decoration--fill absolute -bottom-16 -left-16 h-[240px] w-[240px]" />
            <div className="organic-blob organic-blob--soft absolute right-0 top-0 h-[320px] w-[320px] opacity-60" />

            <div className="relative z-10 mx-auto max-w-2xl text-center">
              <h2 className="mb-5 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-text-primary md:text-4xl lg:text-5xl">
                Lleva bienestar visual a tu equipo
              </h2>
              <p className="mx-auto mb-10 max-w-[55ch] text-lg leading-relaxed text-text-secondary">
                Solicita una cotización. Nos encargamos de organizar la mejor experiencia oftalmológica dentro de tus instalaciones.
              </p>

              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  href="/jornadas"
                  size="lg"
                  icon={<ArrowRight size={16} weight="bold" />}
                >
                  Solicitar jornada
                </Button>
                <Button
                  href="tel:+56900000000"
                  variant="outline"
                  size="lg"
                  icon={<Phone size={16} weight="bold" />}
                >
                  Llamar ahora
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
