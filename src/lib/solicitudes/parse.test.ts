import { describe, expect, it } from "vitest";
import { parseSolicitudBody } from "./parse";
import { getMesOptions } from "@/lib/jornada-form";
const base = { origen: "jornada", responsable: "Persona de prueba", cargo: "RRHH", telefono: "+56 9 1234 5678", correo: "prueba@example.com", empresa: "Empresa de prueba", region: "Metropolitana de Santiago", mesEstimado: getMesOptions()[0].value, autorizacionDatos: true };
describe("validación del servidor para solicitudes", () => {
  it.each(["descuento", "financiamiento", "asesoria"])("conserva el interés de convenio: %s", (modalidadConvenio) => {
    expect(parseSolicitudBody({ ...base, origen: "convenio", mesEstimado: "", detalles: { trabajadores: 11, comuna: "Santiago", modalidadConvenio } })).toMatchObject({ ok: true, data: { detalles: { modalidadConvenio } } });
  });
  it.each(["credito-automatico", "toString", 3, true, null])("rechaza un interés no permitido: %s", (modalidadConvenio) => {
    expect(parseSolicitudBody({ ...base, origen: "convenio", mesEstimado: "", detalles: { trabajadores: 11, comuna: "Santiago", modalidadConvenio } })).toMatchObject({ ok: false });
  });
  it("conserva payloads de jornadas anteriores", () => { expect(parseSolicitudBody(base)).toMatchObject({ ok: true, spam: false, origen: "jornada" }); });
  it.each([0, 10, 10.5, "11", null])("rechaza convenio con número de trabajadores inválido: %s", (trabajadores) => {
    expect(parseSolicitudBody({ ...base, origen: "convenio", mesEstimado: "", detalles: { trabajadores, comuna: "Santiago" } })).toMatchObject({ ok: false });
  });
  it("acepta convenio desde 11 trabajadores sin exigir mes de jornada", () => {
    expect(parseSolicitudBody({ ...base, origen: "convenio", mesEstimado: "", detalles: { trabajadores: 11, comuna: "Santiago", comentarios: " Revisar opciones " } })).toMatchObject({ ok: true, data: { detalles: { trabajadores: 11, comentarios: "Revisar opciones" } } });
  });
  it("rechaza consentimiento ausente, región desconocida y origen inventado", () => {
    for (const change of [{ autorizacionDatos: false }, { region: "Otro país" }, { origen: "inventado" }]) expect(parseSolicitudBody({ ...base, ...change })).toMatchObject({ ok: false });
  });
  it("valida RUT y fechas imposibles o fuera del mes elegido", () => {
    for (const detalles of [{ rutEmpresa: "12.345.678-0", comuna: "Santiago" }, { fechaTentativa: "2026-02-31", comuna: "Santiago" }, { fechaTentativa: "2000-01-01", comuna: "Santiago" }]) expect(parseSolicitudBody({ ...base, detalles })).toMatchObject({ ok: false });
  });
  it("limita comentarios y descarta campos desconocidos", () => {
    const parsed = parseSolicitudBody({ ...base, detalles: { comuna: "Santiago", comentarios: "a".repeat(3000), admin: true } });
    if (!parsed.ok || parsed.spam) throw new Error("Solicitud válida esperada");
    expect(parsed.data.detalles?.comentarios).toHaveLength(2000); expect(parsed.data.detalles).not.toHaveProperty("admin");
  });
  it("descarta honeypot sin guardar datos", () => { expect(parseSolicitudBody({ sitioWeb: "spam" })).toEqual({ ok: true, spam: true }); });
});
