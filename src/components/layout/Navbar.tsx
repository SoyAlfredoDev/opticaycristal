"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X, Glasses } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Beneficios", href: "#beneficios" },
    { name: "Cómo funciona", href: "#como-funciona" },
    { name: "FAQ", href: "#faq" },
  ];

  return (
    <motion.header
      className={`fixed top-0 w-full z-50 transition-colors duration-300 ${
        isScrolled ? "bg-surface/90 backdrop-blur-md shadow-sm" : "bg-transparent"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:py-5">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-primary text-surface`}>
              <Glasses size={24} />
            </div>
            <span className={`text-xl font-bold tracking-tight text-text-primary`}>
              Óptica y Cristal
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
              >
                {link.name}
              </a>
            ))}
            <Button href="#contacto" variant="primary" size="sm">
              Cotizar servicio
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-text-secondary"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <motion.div
          className="md:hidden bg-surface px-4 pt-2 pb-6 shadow-xl border-t border-border"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-medium text-text-secondary hover:text-primary py-2 border-b border-border"
              >
                {link.name}
              </a>
            ))}
            <Button href="#contacto" variant="primary" className="w-full mt-2" onClick={() => setIsMobileMenuOpen(false)}>
              Cotizar servicio inmediato
            </Button>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
