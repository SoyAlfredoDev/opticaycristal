import { describe, expect, it } from "vitest";
import { brand, collections, homeNavigation, whatsappUrl } from "./content";

describe("contenido oficial de Inicio", () => {
  it("utiliza el WhatsApp oficial y codifica el mensaje", () => {
    expect(whatsappUrl()).toBe("https://wa.me/56922452080");
    const url = new URL(whatsappUrl("Hola, ¿qué lentes tienen?"));
    expect(url.searchParams.get("text")).toBe("Hola, ¿qué lentes tienen?");
    expect(brand.phone).toBe("+56 9 2245 2080");
  });
  it("incluye las cuatro entradas y las tres colecciones sin ids repetidos", () => {
    expect(homeNavigation.map((item) => item.label)).toEqual(["Inicio", "Óptica", "Convenios", "Jornadas"]);
    expect(new Set(collections.map((item) => item.id)).size).toBe(3);
    expect(collections.every((item) => item.alt.includes("referencial"))).toBe(true);
  });
});
