export const shapes = ["cuadrada", "rectangular", "redonda", "ovalada", "cat-eye", "aviador", "panto", "browline"] as const;
export const colors = ["negro", "carey", "vino", "transparente", "dorado", "plata", "azul", "verde", "ámbar", "gris"] as const;
export const styles = ["discreto", "clásico", "llamativo"] as const;
export const profiles = ["suave", "definido", "alargado", "equilibrado", "sin-foto"] as const;

export type Shape = typeof shapes[number];
export type Color = typeof colors[number];
export type Style = typeof styles[number];
export type Profile = typeof profiles[number];
export type Suggestion = { shape: Shape; colors: Color[]; reason: string };
export type Advice = { id: string; suggestions: Suggestion[]; rating: number | null };

export const shapeLabels: Record<Shape, string> = {
  cuadrada: "Cuadrada", rectangular: "Rectangular", redonda: "Redonda", ovalada: "Ovalada",
  "cat-eye": "Cat eye", aviador: "Aviador", panto: "Panto", browline: "Browline",
};

export const colorPaint: Record<Color, string> = {
  negro: "#22212a", carey: "#693916", vino: "#781d3d", transparente: "#d7bdac", dorado: "#a67a3e",
  plata: "#727985", azul: "#243b70", verde: "#2c654f", ámbar: "#b86a27", gris: "#555563",
};
