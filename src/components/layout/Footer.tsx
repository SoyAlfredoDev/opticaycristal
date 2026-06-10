"use client";

import Image from "next/image";
import { MapPin, Phone, EnvelopeSimple, Clock } from "@phosphor-icons/react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-white pt-16 pb-10">
      <div className="container-site">
        <div className="mb-14 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-16">
          <div className="space-y-5 lg:col-span-1">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-optica-y-cristal.png"
                alt="Óptica y Cristal"
                width={140}
                height={40}
                className="h-9 w-auto object-contain"
              />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
              Especialistas en salud visual laboral. Llevamos atención óptica integral directamente a tu empresa en Santiago Centro.
            </p>
          </div>

          <div>
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-text-primary">
              Navegación
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="/jornadas" className="text-text-secondary transition-colors duration-300 hover:text-primary">
                  Solicitar jornada
                </a>
              </li>
              <li>
                <a href="/#problema" className="text-text-secondary transition-colors duration-300 hover:text-primary">
                  El problema
                </a>
              </li>
              <li>
                <a href="/#solucion" className="text-text-secondary transition-colors duration-300 hover:text-primary">
                  Nuestra solución
                </a>
              </li>
              <li>
                <a href="/#beneficios" className="text-text-secondary transition-colors duration-300 hover:text-primary">
                  Beneficios
                </a>
              </li>
              <li>
                <a href="/#como-funciona" className="text-text-secondary transition-colors duration-300 hover:text-primary">
                  Cómo funciona
                </a>
              </li>
              <li>
                <a href="/#faq" className="text-text-secondary transition-colors duration-300 hover:text-primary">
                  Preguntas frecuentes
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-text-primary">
              Contacto
            </h4>
            <ul className="space-y-3.5 text-sm text-text-secondary">
              <li className="flex items-start gap-3">
                <MapPin size={18} weight="regular" className="mt-0.5 shrink-0 text-primary" />
                <span>
                  Huérfanos 713, local 18,
                  <br />
                  Santiago Centro, Chile
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} weight="regular" className="shrink-0 text-primary" />
                <a href="tel:+56900000000" className="transition-colors duration-300 hover:text-primary">
                  +56 9 0000 0000
                </a>
              </li>
              <li className="flex items-center gap-3">
                <EnvelopeSimple size={18} weight="regular" className="shrink-0 text-primary" />
                <a href="mailto:contacto@opticaycristal.cl" className="transition-colors duration-300 hover:text-primary">
                  contacto@opticaycristal.cl
                </a>
              </li>
              <li className="flex items-start gap-3 pt-2">
                <Clock size={18} weight="regular" className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="mb-0.5 font-medium text-text-primary">Local Santiago Centro</p>
                  <p>Lunes a Viernes: 10:00 - 19:00</p>
                  <p>Sábados: 10:00 - 14:00</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="section-separator mb-8" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-text-secondary md:flex-row">
          <p>© {new Date().getFullYear()} Óptica y Cristal Chile. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors duration-300 hover:text-primary">
              Política de privacidad
            </a>
            <a href="#" className="transition-colors duration-300 hover:text-primary">
              Términos de servicio
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
