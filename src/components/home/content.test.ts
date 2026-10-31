import { describe, expect, it } from "vitest";
import { brand, collections, homeNavigation, whatsappUrl } from "./content";

describe("contenido oficial de Inicio", () => {
  it("utiliza el WhatsApp oficial y codifica el mensaje", () => {
    expect(whatsappUrl()).toBe("https://wa.me/56922452080");
    const url = new URL(whatsappUrl("Hola, ¿qué lentes tienen?"));
    expect(url.searchParams.get("text")).toBe("Hola, ¿qué lentes tienen?");
    expect(brand.phone).toBe("+56 9 2245 2080");
  });
  it("conserva la navegación pública, Mi cuenta y las tres colecciones sin ids repetidos", () => {
    expect(homeNavigation.map((item) => item.label)).toEqual(["Inicio", "Óptica", "Crédito directo", "Convenios", "Jornadas", "Mi cuenta"]);
    expect(homeNavigation.find((item) => item.label === "Mi cuenta")?.href).toBe("/mi-cuenta");
    expect(homeNavigation.find((item) => item.label === "Crédito directo")?.href).toBe("/credito-directo");
    expect(new Set(collections.map((item) => item.id)).size).toBe(3);
    expect(collections.every((item) => item.alt.includes("referencial"))).toBe(true);
  });
});
