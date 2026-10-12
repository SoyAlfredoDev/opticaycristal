"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { useJornadaModal } from "@/components/forms/JornadaModalProvider";

export default function MobileBottomCta() {
  const { open } = useJornadaModal();

  return (
    <div className="mobile-bottom-cta fixed inset-x-0 bottom-0 z-[var(--z-bottom-cta)] border-t border-border/80 bg-white/95 backdrop-blur-lg lg:hidden">
      <div className="container-site py-3">
        <button
          type="button"
          onClick={open}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white shadow-brand transition-transform active:scale-[0.98]"
        >
          Solicitar jornada
          <ArrowRight size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
