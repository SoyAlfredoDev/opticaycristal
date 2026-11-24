export const HERO_INTERVAL_MS = 5200;
export const heroPortraits = [
  {
    id: "customer-0778",
    label: "Cliente con montura ámbar",
    src: "/images/home/hero-cliente-0778-cintura-v2.png",
    alt: "Cliente de Óptica & Cristal con montura óptica ámbar y camisa verde",
    width: 1086,
    height: 1448,
  },
  {
    id: "retrato-microfono",
    label: "Modelo con micrófono",
    src: "/images/home/hero-retrato-microfono-v2.png",
    alt: "Mujer con montura metálica, vestido amarillo y micrófono rojo, orientada hacia la izquierda",
    width: 1086,
    height: 1448,
  },
] as const;

/** Hold the visible portrait until another photograph has actually loaded. */
export function nextReadyPortrait(current: number, ready: readonly boolean[]): number {
  for (let offset = 1; offset < ready.length; offset += 1) {
    const next = (current + offset) % ready.length;
    if (ready[next]) return next;
  }
  return current;
}
