export const HERO_INTERVAL_MS = 5200;
export const heroPortraits = [
  { id: "young", label: "Joven", src: "/images/home/hero-young-clean-v6.png", alt: "Joven riendo con lentes de sol y suéter blanco", width: 1254, height: 1254 },
  { id: "professional", label: "Pareja", src: "/images/home/hero-couple-clean-v6.png", alt: "Pareja sonriendo y disfrutando sus lentes de sol", width: 1399, height: 1124 },
] as const;

/** Hold the visible portrait until another photograph has actually loaded. */
export function nextReadyPortrait(current: number, ready: readonly boolean[]): number {
  for (let offset = 1; offset < ready.length; offset += 1) {
    const next = (current + offset) % ready.length;
    if (ready[next]) return next;
  }
  return current;
}
