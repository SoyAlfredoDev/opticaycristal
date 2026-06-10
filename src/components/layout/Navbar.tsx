"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { List, X, Eyeglasses } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

const navLinks = [
  { name: "Beneficios", href: "/#beneficios" },
  { name: "Cómo funciona", href: "/#como-funciona" },
  { name: "FAQ", href: "/#faq" },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-[var(--z-nav)] px-4 pt-5 md:px-6"
        initial={reduce ? false : { y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full border border-border/60 bg-surface/80 px-4 py-2.5 shadow-brand backdrop-blur-xl md:px-6">
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-surface">
              <Eyeglasses size={20} weight="fill" />
            </div>
            <span className="text-base font-bold tracking-tight text-text-primary hidden sm:block">
              Óptica y Cristal
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-text-secondary transition-colors duration-300 hover:text-primary"
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button href="/jornadas" variant="primary" size="sm" className="hidden md:inline-flex">
              Cotizar servicio
            </Button>

            <button
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-full text-text-secondary hover:bg-muted transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMobileMenuOpen}
            >
              <div className="relative h-5 w-5">
                <List
                  size={20}
                  className={`absolute inset-0 transition-all duration-300 ${isMobileMenuOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`}
                />
                <X
                  size={20}
                  className={`absolute inset-0 transition-all duration-300 ${isMobileMenuOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`}
                />
              </div>
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-[var(--z-overlay)] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="absolute inset-0 bg-text-primary/40 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.nav
              className="absolute top-20 left-4 right-4 rounded-[var(--radius-shell)] border border-border bg-surface/95 p-6 shadow-brand-lg backdrop-blur-xl"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link, i) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.05, duration: 0.3 }}
                    className="rounded-xl px-4 py-3 text-base font-medium text-text-secondary hover:bg-muted hover:text-primary transition-colors"
                  >
                    {link.name}
                  </motion.a>
                ))}
                <Button
                  href="/jornadas"
                  variant="primary"
                  className="w-full mt-3"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Cotizar servicio
                </Button>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
