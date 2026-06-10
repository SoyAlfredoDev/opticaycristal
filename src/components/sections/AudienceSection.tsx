"use client";

import { motion } from "framer-motion";
import { Briefcase, Building2, Store, Package, Computer, Truck } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function AudienceSection() {
  const categories = [
    { icon: <Briefcase size={28} />, name: "Oficinas y Corporativos" },
    { icon: <Store size={28} />, name: "Retail y Sucursales" },
    { icon: <Computer size={28} />, name: "Centros de Atención" },
    { icon: <Building2 size={28} />, name: "Empresas Administrativas" },
    { icon: <Package size={28} />, name: "Bodegas y Logística" },
    { icon: <Truck size={28} />, name: "Equipos Operativos" },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
          
          <motion.div 
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">
              Para Quién Es
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 text-balance">
              Nos adaptamos a la realidad de cualquier empresa
            </h3>
            <p className="text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto lg:mx-0">
              No importa si tu equipo trabaja en un edificio corporativo, en un piso de ventas o en un centro de distribución. Nuestro formato es 100% móvil y se ajusta a tus instalaciones para brindar exactamente el mismo estándar de calidad clínica.
            </p>
          </motion.div>

          <div className="flex-1 w-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
              {categories.map((cat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <Card hoverEffect className="flex flex-col items-center justify-center text-center gap-3 p-6 group cursor-default">
                    <div className="text-primary group-hover:scale-110 transition-transform duration-300">
                      {cat.icon}
                    </div>
                    <span className="font-semibold text-text-primary text-sm">{cat.name}</span>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
