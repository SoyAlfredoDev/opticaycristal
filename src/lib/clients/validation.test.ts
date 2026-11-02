import { describe, expect, it } from "vitest";
import { parseRegistration, validClientRut } from "./validation";
import { availableCredit } from "./types";
const input = { firstName: "  María José ", lastName: "O'Connor Pérez", rut: "12.345.678-5", whatsapp: "9 1234 5678", email: "MARIA@example.com", password: "una frase larga segura", privacyAccepted: true };
describe("Registro de clientes", () => {
  it("normaliza datos chilenos sin alterar una contraseña", () => { expect(parseRegistration(input)).toMatchObject({ firstName: "María José", rut: "123456785", whatsapp: "+56912345678", email: "maria@example.com", password: input.password }); });
  it("rechaza dígitos verificadores, nombres, teléfonos y consentimiento inválidos", () => { expect(validClientRut("12.345.678-4")).toBe(false);for (const patch of [{ rut: "12.345.678-4" }, { firstName: "<script>" }, { whatsapp: "123" }, { privacyAccepted: false }, { password: "corta" }]) expect(() => parseRegistration({ ...input, ...patch })).toThrow(); });
  it("acepta contraseñas de once caracteres y rechaza menos de ocho", () => { expect(parseRegistration({ ...input, password: "Acceso2026!" }).password).toBe("Acceso2026!");expect(() => parseRegistration({ ...input, password: "Corta7!" })).toThrow(); });
  it("descarta nivel y flags de verificación enviados por el navegador", () => { const p = parseRegistration({ ...input, category: "elite", emailVerified: true, whatsappVerified: true });expect(p).not.toHaveProperty("category");expect(p).not.toHaveProperty("emailVerified");expect(p).not.toHaveProperty("whatsappVerified"); });
  it("distingue capacidad del nivel de cupo habilitado", () => { expect(availableCredit(40000, 0, false)).toEqual({ capacity: 40000, available: 0 });expect(availableCredit(80000, 40000, true)).toEqual({ capacity: 40000, available: 40000 });expect(availableCredit(40000, 50000, true).available).toBe(0); });
});
