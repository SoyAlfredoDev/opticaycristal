"use client";

import { Eyeglasses, MapPin, Phone, EnvelopeSimple, Clock } from "@phosphor-icons/react";

export default function Footer() {
  return (
    <footer className="bg-muted pt-16 pb-8 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-surface">
                <Eyeglasses size={20} weight="fill" />
              </div>
              <span className="text-lg font-bold tracking-tight text-text-primary">
                Óptica y Cristal
              </span>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
              Especialistas en salud visual laboral. Llevamos atención óptica integral directamente a tu empresa en Santiago Centro.
            </p>
          </div>

          <div>
            <h4 className="text-text-primary font-semibold mb-4 text-sm">Navegación</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="/jornadas" className="text-text-secondary hover:text-primary transition-colors">
                  Solicitar jornada
                </a>
              </li>
              <li>
                <a href="/#problema" className="text-text-secondary hover:text-primary transition-colors">
                  El problema
                </a>
              </li>
              <li>
                <a href="/#solucion" className="text-text-secondary hover:text-primary transition-colors">
                  Nuestra solución
                </a>
              </li>
              <li>
                <a href="/#beneficios" className="text-text-secondary hover:text-primary transition-colors">
                  Beneficios
                </a>
              </li>
              <li>
                <a href="/#como-funciona" className="text-text-secondary hover:text-primary transition-colors">
                  Cómo funciona
                </a>
              </li>
              <li>
                <a href="/#faq" className="text-text-secondary hover:text-primary transition-colors">
                  Preguntas frecuentes
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-text-primary font-semibold mb-4 text-sm">Contacto</h4>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex items-start gap-3">
                <MapPin size={18} weight="regular" className="text-primary shrink-0 mt-0.5" />
                <span>
                  Huérfanos 713, local 18,
                  <br />
                  Santiago Centro, Chile
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} weight="regular" className="text-primary shrink-0" />
                <a href="tel:+56900000000" className="hover:text-primary transition-colors">
                  +56 9 0000 0000
                </a>
              </li>
              <li className="flex items-center gap-3">
                <EnvelopeSimple size={18} weight="regular" className="text-primary shrink-0" />
                <a href="mailto:contacto@opticaycristal.cl" className="hover:text-primary transition-colors">
                  contacto@opticaycristal.cl
                </a>
              </li>
              <li className="flex items-start gap-3 pt-2">
                <Clock size={18} weight="regular" className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-text-primary mb-0.5">Local Santiago Centro</p>
                  <p>Lunes a Viernes: 10:00 - 19:00</p>
                  <p>Sábados: 10:00 - 14:00</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-sm text-text-secondary flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Óptica y Cristal Chile. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">
              Política de privacidad
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Términos de servicio
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
