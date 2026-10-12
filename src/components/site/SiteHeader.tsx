"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { brand, siteNavigation, whatsappUrl } from "./content";
import { LinkButton } from "./LinkButton";
import styles from "./Site.module.css";

export function SiteHeader({ active = "Inicio" }: { active?: string }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - lastY;
        if (y < 48) setHidden(false);
        else if (delta > 6) {
          setHidden(true);
          setOpen(false);
        } else if (delta < -6) setHidden(false);
        lastY = y;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    function onOutside(event: globalThis.PointerEvent) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    const desktop = window.matchMedia("(min-width: 900px)");
    const onResize = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <header ref={headerRef} className={`${styles.header}${hidden ? ` ${styles.headerHidden}` : ""}`}>
      <div className={styles.utility}>
        <div className={styles.container}>
          <span>Tu mirada, nuestra prioridad</span>
          <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            <span>WhatsApp {brand.phone}</span>
          </a>
        </div>
      </div>
      <div className={`${styles.container} ${styles.navbar}`}>
        <Link href="/" aria-label={`${brand.name}, inicio`} className={styles.logo}>
          <Image src={brand.logo} alt={brand.name} width={186} height={94} loading="eager" />
        </Link>
        <nav className={styles.desktopNav} aria-label="Navegación principal">
          {siteNavigation.map((item) => (
            <Link key={item.label} href={item.href} aria-current={item.label === active ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.navActions}>
          <LinkButton href={whatsappUrl()} variant="outline" target="_blank" rel="noopener noreferrer">
            Hablemos
          </LinkButton>
          <button ref={toggleRef} type="button" className={styles.menuToggle}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open} aria-controls="home-mobile-nav" onClick={() => setOpen(!open)}>
            {open ? <X aria-hidden="true" size={23} /> : <Menu aria-hidden="true" size={23} />}
          </button>
        </div>
      </div>
      <nav id="home-mobile-nav" aria-label="Navegación móvil" hidden={!open} className={styles.mobileNav}>
        {siteNavigation.map((item) => (
          <Link key={item.label} href={item.href} onClick={() => setOpen(false)}
            aria-current={item.label === active ? "page" : undefined}>{item.label}</Link>
        ))}
      </nav>
    </header>
  );
}
