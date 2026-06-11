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

const contactItems = [
  { icon: MapPin, label: "Huérfanos 713, local 18, Santiago Centro", href: undefined },
  { icon: Phone, label: "+56 9 0000 0000", href: "tel:+56900000000" },
  { icon: EnvelopeSimple, label: "contacto@opticaycristal.cl", href: "mailto:contacto@opticaycristal.cl" },
];

export default function Footer() {
  return (
    <footer className="section-dark border-t border-border-dark pt-14 pb-8 sm:pt-16">
      <div className="container-site">
        <div className="mb-10 rounded-xl bg-primary px-6 py-8 text-center shadow-brand-lg sm:px-10 sm:py-10">
          <h3 className="mb-3 text-2xl font-extrabold uppercase text-white sm:text-3xl">
            ¿Listo para cuidar la visión de tu equipo?
          </h3>
          <p className="mx-auto mb-6 max-w-md text-sm text-white/85 sm:text-base">
            Solicita una jornada oftalmológica <span className="font-bold">sin costo</span> para tu empresa.
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
                className="h-9 w-auto rounded-lg bg-white px-2 py-1 object-contain"
              />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-text-on-dark-muted">
              Especialistas en salud visual laboral. Jornadas oftalmológicas corporativas en Santiago y Región Metropolitana.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Navegación</h4>
            <ul className="space-y-2.5 text-sm">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-text-on-dark-muted transition-colors hover:text-primary">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Contacto</h4>
            <ul className="space-y-3 text-sm text-text-on-dark-muted">
              {contactItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} className="flex items-start gap-3">
                    <span className="flyer-icon-circle mt-0.5 h-8 w-8 shrink-0">
                      <Icon size={14} weight="regular" />
                    </span>
                    {item.href ? (
                      <a href={item.href} className="hover:text-primary">{item.label}</a>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </li>
                );
              })}
              <li className="flex items-start gap-3">
                <span className="flyer-icon-circle mt-0.5 h-8 w-8 shrink-0">
                  <Clock size={14} weight="regular" />
                </span>
                <div>
                  <p className="font-medium text-white">Horario local</p>
                  <p>Lun-Vie: 10:00-19:00</p>
                  <p>Sáb: 10:00-14:00</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="section-separator mb-6" />
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-text-on-dark-muted sm:flex-row sm:text-sm">
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
