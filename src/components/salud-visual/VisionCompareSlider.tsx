"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

type VisionCompareSliderProps = {
  src: string;
  alt: string;
};

export default function VisionCompareSlider({ src, alt }: VisionCompareSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(52);
  const draggingRef = useRef(false);

  const moveTo = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(96, Math.max(4, next)));
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some environments reject capture; dragging still works via move/up on the track.
    }
    moveTo(event.clientX);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    moveTo(event.clientX);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore capture release failures.
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPosition((value) => Math.max(4, value - 4));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setPosition((value) => Math.min(96, value + 4));
    }
  };

  return (
    <div
      ref={trackRef}
      className="vision-compare relative isolate aspect-[16/10] w-full cursor-ew-resize overflow-hidden select-none touch-none sm:aspect-[16/9]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="slider"
      tabIndex={0}
      aria-label="Comparar visión de lejos sin corrección y con corrección"
      aria-valuemin={4}
      aria-valuemax={96}
      aria-valuenow={Math.round(position)}
      aria-valuetext={`${Math.round(position)} por ciento con corrección visual`}
      onKeyDown={onKeyDown}
    >
      <div className="absolute inset-0">
        <Image
          src={src}
          alt={alt}
          fill
          className="pointer-events-none object-cover"
          draggable={false}
          sizes="(max-width: 768px) 100vw, 672px"
          quality={90}
        />
      </div>

      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        aria-hidden
      >
        <div className="absolute inset-0 origin-center scale-[1.03]">
          <Image
            src={src}
            alt=""
            fill
            className="pointer-events-none object-cover blur-[8px] saturate-[0.85] contrast-[0.92] sm:blur-[10px]"
            draggable={false}
            sizes="(max-width: 768px) 100vw, 672px"
          />
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white"
        style={{ left: `${position}%` }}
        aria-hidden
      >
        <span className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-primary shadow-brand-lg ring-2 ring-primary">
          <CaretLeft size={14} weight="bold" />
          <CaretRight size={14} weight="bold" className="-ml-0.5" />
        </span>
      </div>

      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[46%] rounded-lg bg-brand-dark/72 px-2.5 py-1.5 text-white backdrop-blur-[2px] sm:left-4 sm:top-4 sm:px-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/70 sm:text-[10px]">
          Sin corrección visual
        </p>
        <p className="text-xs font-semibold sm:text-sm">Miopía</p>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-10 max-w-[46%] rounded-lg bg-white/88 px-2.5 py-1.5 text-right text-brand-dark backdrop-blur-[2px] sm:right-4 sm:top-4 sm:px-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-tertiary sm:text-[10px]">
          Con corrección visual
        </p>
        <p className="text-xs font-semibold text-primary sm:text-sm">Visión corregida</p>
      </div>
    </div>
  );
}
