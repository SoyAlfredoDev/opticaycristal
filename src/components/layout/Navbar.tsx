"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { List, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

const navLinks = [
  { name: "El problema", href: "/#problema" },
  { name: "Beneficios", href: "/#beneficios" },
  { name: "Nuestra óptica", href: "/#optica" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <motion.header
        className={`site-header fixed inset-x-0 top-0 z-[var(--z-nav)] transition-[background,box-shadow,border-color] duration-400 ease-premium ${
          scrolled ? "site-header--scrolled" : "site-header--top"
        }`}
        initial={reduce ? false : { y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="container-site flex h-[3.75rem] items-center gap-4 sm:h-16">
          <a href="/" className="group flex min-w-0 shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/[0.05] transition-shadow group-hover:shadow-brand sm:h-11 sm:w-11">
              <Image
                src="/logo-optica-y-cristal.png"
                alt=""
                width={40}
                height={40}
                className="h-7 w-7 object-contain sm:h-8 sm:w-8"
                priority
              />
            </span>
            <span className="hidden flex-col sm:flex">
              <span className="text-sm font-bold leading-tight tracking-tight text-text-primary">
                Óptica y Cristal
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Salud visual corporativa
              </span>
            </span>
          </a>

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Principal">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className="site-header__link">
                {link.name}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button
              href="/#contratar"
              size="sm"
              className="hidden min-h-[42px] rounded-full px-5 sm:inline-flex"
            >
              Solicitar jornada
            </Button>
            <Button href="/#contratar" size="sm" className="min-h-[40px] rounded-full px-4 text-xs sm:hidden">
              Solicitar
            </Button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-muted hover:text-primary lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-[var(--z-overlay)] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-text-primary/20 backdrop-blur-[2px]"
              aria-label="Cerrar menú"
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              className="absolute inset-x-4 top-[4.25rem] overflow-hidden rounded-2xl border border-border bg-white shadow-brand-lg"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              aria-label="Menú móvil"
            >
              <div className="border-b border-border/60 bg-muted/40 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Navegación</p>
              </div>
              <ul className="p-2">
                {navLinks.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-xl px-4 py-3.5 text-base font-medium text-text-primary transition-colors hover:bg-muted"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border/60 p-3">
                <Button href="/#contratar" className="w-full min-h-[48px]" onClick={() => setMenuOpen(false)}>
                  Solicitar jornada
                </Button>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
