"use client";

import Image from "next/image";
import { MapPin, Phone, EnvelopeSimple, Clock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

const navLinks = [
  { name: "El problema", href: "/#problema" },
  { name: "Beneficios", href: "/#beneficios" },
  { name: "Nuestra óptica", href: "/#optica" },
  { name: "Contratar jornada", href: "/#contratar" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted pt-14 pb-8 sm:pt-16">
      <div className="container-site">
        <div className="mb-10 rounded-[1.75rem] bg-primary px-6 py-8 text-center shadow-brand-lg sm:px-10 sm:py-10">
          <h3 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
            ¿Listo para cuidar la visión de tu equipo?
          </h3>
          <p className="mx-auto mb-6 max-w-md text-sm text-white/85 sm:text-base">
            Solicita una jornada oftalmológica sin costo para tu empresa.
          </p>
          <Button href="/#contratar" size="lg" className="min-h-[52px] bg-white text-primary hover:bg-white/90">
            Solicitar jornada
          </Button>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-optica-y-cristal.png"
                alt="Óptica y Cristal"
                width={130}
                height={40}
                className="h-9 w-auto rounded-lg bg-white px-2 py-1 object-contain ring-1 ring-black/[0.04]"
              />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-text-secondary">
              Especialistas en salud visual laboral. Jornadas oftalmológicas corporativas en Santiago y Región Metropolitana.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-primary">Navegación</h4>
            <ul className="space-y-2.5 text-sm">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-text-secondary transition-colors hover:text-primary">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-primary">Contacto</h4>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
                <span>Huérfanos 713, local 18, Santiago Centro</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="shrink-0 text-primary" />
                <a href="tel:+56900000000" className="hover:text-primary">+56 9 0000 0000</a>
              </li>
              <li className="flex items-center gap-3">
                <EnvelopeSimple size={18} className="shrink-0 text-primary" />
                <a href="mailto:contacto@opticaycristal.cl" className="hover:text-primary">contacto@opticaycristal.cl</a>
              </li>
              <li className="flex items-start gap-3">
                <Clock size={18} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-text-primary">Horario local</p>
                  <p>Lun-Vie: 10:00-19:00</p>
                  <p>Sáb: 10:00-14:00</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="section-separator mb-6" />
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-text-secondary sm:flex-row sm:text-sm">
          <p>© {new Date().getFullYear()} Óptica y Cristal Chile. Todos los derechos reservados.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-primary">Política de privacidad</a>
            <a href="#" className="hover:text-primary">Términos de servicio</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
