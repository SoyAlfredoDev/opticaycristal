import { describe, expect, it } from "vitest";
import { filterProducts, initialFilters, products } from "./catalog";
describe("catálogo referencial", () => {
  it("busca sin depender de tildes o mayúsculas", () => { expect(filterProducts({ ...initialFilters, search: "CAT ÉYE" }).map((product) => product.id)).toContain("cat-eye"); });
  it("combina categoría y filtros con intersección", () => { expect(filterProducts({ ...initialFilters, category: "opticos", materials: ["Metal"], colors: ["Dorado"] }).map((product) => product.id)).toEqual(["redonda"]); });
  it("devuelve vacío para filtros incompatibles y no altera el orden original", () => {
    const ids = products.map((product) => product.id);
    expect(filterProducts({ ...initialFilters, shapes: ["Cat eye"], colors: ["Negro"] })).toEqual([]);
    filterProducts({ ...initialFilters, sort: "za" }); expect(products.map((product) => product.id)).toEqual(ids);
  });
});
