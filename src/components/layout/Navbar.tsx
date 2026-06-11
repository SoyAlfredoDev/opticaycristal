"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  List,
  X,
  WarningCircle,
  Sparkle,
  Buildings,
  ArrowRight,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

const navLinks = [
  { name: "El problema", href: "/#problema", icon: WarningCircle },
  { name: "Beneficios", href: "/#beneficios", icon: Sparkle },
  { name: "Nuestra óptica", href: "/#optica", icon: Buildings },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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
        className={`site-header fixed inset-x-0 top-0 z-[var(--z-nav)] transition-[background,box-shadow,border-color] duration-300 ease-premium ${
          scrolled || menuOpen ? "site-header--scrolled" : "site-header--top"
        }`}
        initial={reduce ? false : { y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div className="site-header__inner container-site flex items-center justify-between gap-3">
          <a href="/" className="group flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/[0.05] sm:h-10 sm:w-10">
              <Image
                src="/logo-optica-y-cristal.png"
                alt=""
                width={36}
                height={36}
                className="h-6 w-6 object-contain sm:h-7 sm:w-7"
                priority
              />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-extrabold leading-tight tracking-tight text-brand-dark sm:text-sm">
                Óptica y Cristal
              </span>
              <span className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-primary sm:text-[10px]">
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

          <div className="flex shrink-0 items-center gap-2">
            <Button
              href="/#contratar"
              size="sm"
              className="hidden min-h-[42px] rounded-full px-5 lg:inline-flex"
            >
              Solicitar jornada
            </Button>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-dark text-white transition-colors active:scale-95 lg:hidden"
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
            transition={{ duration: 0.25 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
              aria-label="Cerrar menú"
              onClick={() => setMenuOpen(false)}
            />

            <motion.nav
              className="mobile-menu-sheet absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-brand-lg"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: EASE }}
              aria-label="Menú móvil"
            >
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Menú</p>
                  <p className="text-sm font-semibold text-brand-dark">Óptica y Cristal</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-text-secondary"
                  aria-label="Cerrar menú"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              <ul className="flex-1 overflow-y-auto px-3 py-2">
                {navLinks.map((link, i) => {
                  const Icon = link.icon;
                  return (
                    <motion.li
                      key={link.name}
                      initial={reduce ? false : { opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.05, duration: 0.3, ease: EASE }}
                    >
                      <a
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className="mobile-menu-link flex min-h-[52px] items-center gap-4 rounded-xl px-4 py-3 transition-colors active:bg-muted"
                      >
                        <span className="flyer-icon-circle h-10 w-10 shrink-0">
                          <Icon size={18} weight="regular" />
                        </span>
                        <span className="flex-1 text-base font-semibold text-brand-dark">{link.name}</span>
                        <ArrowRight size={16} className="text-text-tertiary" weight="bold" />
                      </a>
                    </motion.li>
                  );
                })}
              </ul>

              <div className="border-t border-border/60 p-4">
                <Button
                  href="/#contratar"
                  className="w-full min-h-[52px] text-base"
                  onClick={() => setMenuOpen(false)}
                >
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
