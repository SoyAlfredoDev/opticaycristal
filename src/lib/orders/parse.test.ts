import { describe, expect, it } from "vitest";
import { parseOrderBody } from "./parse";

const valid = { items: [{ productId: "cat-eye", quantity: 2 }], customer: { name: "Ana Pérez", email: "ana@example.cl", phone: "+56912345678", comuna: "Santiago", address: "Calle 123", comments: "", consent: true } };

describe("parseOrderBody", () => {
  it("normaliza y reconstruye ítems desde el catálogo confiable", () => {
    expect(parseOrderBody(valid)).toMatchObject({ ok: true, data: { items: [{ title: "Montura cat eye", quantity: 2 }], customer: { email: "ana@example.cl" } } });
  });
  it("rechaza consentimiento ausente, productos desconocidos y cantidades inválidas", () => {
    expect(parseOrderBody({ ...valid, customer: { ...valid.customer, consent: false } }).ok).toBe(false);
    expect(parseOrderBody({ ...valid, items: [{ productId: "inventado", quantity: 1 }] }).ok).toBe(false);
    expect(parseOrderBody({ ...valid, items: [{ productId: "cat-eye", quantity: 50 }] }).ok).toBe(false);
  });
});
