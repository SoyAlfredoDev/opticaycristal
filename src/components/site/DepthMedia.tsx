"use client";

import { useRef, type ReactNode, type PointerEvent } from "react";
import styles from "./Site.module.css";

type Props = { children: ReactNode; className?: string; intensity?: number };

/** Pointer-only enhancement: no animation loop, React renders, or touch interception. */
export function DepthMedia({ children, className = "", intensity = 5 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function reset() {
    ref.current?.style.removeProperty("--tilt-x");
    ref.current?.style.removeProperty("--tilt-y");
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element || event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reset();
      return;
    }
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(-0.5, Math.min(0.5, (event.clientX - rect.left) / rect.width - 0.5));
    const y = Math.max(-0.5, Math.min(0.5, (event.clientY - rect.top) / rect.height - 0.5));
    element.style.setProperty("--tilt-x", `${-y * intensity}deg`);
    element.style.setProperty("--tilt-y", `${x * intensity}deg`);
  }

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}
      className={`${styles.depth} ${className}`}>
      {children}
    </div>
  );
}
