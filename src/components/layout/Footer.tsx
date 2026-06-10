import { Glasses, MapPin, Phone, Mail, Clock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-text-primary pt-16 pb-8 text-surface/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-surface">
              <div className="p-2 bg-primary rounded-lg">
                <Glasses size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Óptica y Cristal
              </span>
            </div>
            <p className="text-surface/60 text-sm leading-relaxed max-w-xs">
              Especialistas en salud visual laboral. Llevamos atención óptica integral directamente a tu empresa, facilitando el bienestar y rendimiento de tus colaboradores.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-surface font-semibold mb-4">Navegación</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#problema" className="hover:text-primary-soft transition-colors">El problema</a></li>
              <li><a href="#solucion" className="hover:text-primary-soft transition-colors">Nuestra solución</a></li>
              <li><a href="#beneficios" className="hover:text-primary-soft transition-colors">Beneficios</a></li>
              <li><a href="#como-funciona" className="hover:text-primary-soft transition-colors">Cómo funciona</a></li>
              <li><a href="#faq" className="hover:text-primary-soft transition-colors">Preguntas frecuentes</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-surface font-semibold mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-primary shrink-0 mt-0.5" />
                <span>Huérfanos 713, local 18, <br />Santiago Centro, Chile</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-primary shrink-0" />
                <a href="tel:+56900000000" className="hover:text-surface transition-colors">+56 9 0000 0000</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-primary shrink-0" />
                <a href="mailto:contacto@opticaycristal.cl" className="hover:text-surface transition-colors">contacto@opticaycristal.cl</a>
              </li>
            </ul>
          </div>

          {/* Horario */}
          <div>
            <h4 className="text-surface font-semibold mb-4">Horario de Atención</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Clock size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-surface mb-1">Local Santiago Centro:</p>
                  <p className="text-surface/60">Lunes a Viernes: 10:00 - 19:00</p>
                  <p className="text-surface/60">Sábados: 10:00 - 14:00</p>
                </div>
              </li>
              <li className="mt-4 pt-4 border-t border-surface/10">
                <p className="text-surface/60 italic">Jornadas en empresas sujetas a coordinación previa.</p>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-surface/10 text-sm text-surface/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Óptica y Cristal Chile. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-surface transition-colors">Políticas de Privacidad</a>
            <a href="#" className="hover:text-surface transition-colors">Términos de Servicio</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
