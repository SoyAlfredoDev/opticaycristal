"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Site.module.css";

type Props = { children: ReactNode; className?: string };

/** Replay entrances after leaving the viewport; keep content readable without JS. */
export function SectionReveal({ children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reveal = () => {
      element.dataset.reveal = "visible";
    };
    const bounds = element.getBoundingClientRect();
    if (!preference.matches && (bounds.top > window.innerHeight || bounds.bottom < 0)) {
      element.dataset.reveal = "pending";
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          element.dataset.reveal = preference.matches || entry.isIntersecting ? "visible" : "pending";
        }
      },
      // Reset outside a buffer larger than the entrance translation. This avoids
      // hiding partially visible content or retriggering at a transformed edge.
      { threshold: 0, rootMargin: "64px 0px 64px 0px" },
    );
    if (!preference.matches) observer.observe(element);
    const onPreferenceChange = () => {
      if (preference.matches) {
        reveal();
        observer.disconnect();
      } else {
        observer.observe(element);
      }
    };
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return <div ref={ref} className={`${styles.reveal} ${className}`}>{children}</div>;
}
