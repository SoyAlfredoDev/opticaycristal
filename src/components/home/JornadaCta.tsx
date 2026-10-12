"use client";

import { useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { useJornadaModal } from "@/components/forms/JornadaModalProvider";
import styles from "@/components/site/Site.module.css";

export function JornadaCta() {
  const { open } = useJornadaModal();

  useEffect(() => {
    // Preserve historical /#contratar links while /jornadas has its own page.
    const openDeepLink = () => { if (window.location.hash === "#contratar") open(); };
    openDeepLink();
    window.addEventListener("hashchange", openDeepLink);
    return () => window.removeEventListener("hashchange", openDeepLink);
  }, [open]);

  return (
    <button type="button" className={`${styles.button} ${styles.text}`} onClick={open}>
      <span>Coordinar una jornada</span><ArrowUpRight size={18} strokeWidth={1.6} aria-hidden="true" />
    </button>
  );
}
