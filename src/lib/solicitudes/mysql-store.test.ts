import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NuevaSolicitud } from "./types";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("mysql2/promise", () => ({ default: { createPool: () => ({ query }) } }));
import { mysqlStore } from "./mysql-store";
beforeEach(() => { query.mockReset(); query.mockResolvedValue([[], []]); });
describe("persistencia MySQL compatible", () => {
  it("guarda los detalles como parámetro JSON, sin concatenar SQL", async () => {
    const input: NuevaSolicitud = { id: "test", origen: "convenio", responsable: "Persona", cargo: "RRHH", telefono: "+56912345678", correo: "test@example.com", empresa: "Empresa", region: "Metropolitana de Santiago", mesEstimado: "", autorizacionDatos: true, correoDestino: "team@example.com", creadoEn: new Date().toISOString(), detalles: { trabajadores: 11, comuna: "Santiago", comentarios: "'; DROP TABLE solicitudes; --" } };
    await mysqlStore.create(input);
    const call = query.mock.calls.find(([sql]) => typeof sql === "string" && sql.includes("INSERT INTO"));
    expect(call).toBeDefined(); expect(call![0]).not.toContain("DROP TABLE");
    expect(JSON.parse(call![1].at(-1))).toEqual(input.detalles); expect(call![0].match(/\?/g)).toHaveLength(call![1].length);
  });
  it("lee registros antiguos sin detalles y registros nuevos con detalles", async () => {
    const row = { id: "test", origen: "jornada", responsable: "Persona", cargo: "RRHH", telefono: "+56912345678", correo: "test@example.com", empresa: "Empresa", region: "Metropolitana de Santiago", mes_estimado: "2026-10", autorizacion_datos: 1, correo_destino: "team@example.com", correo_estado: "pendiente", correo_detalle: null, correo_cliente_estado: null, correo_cliente_detalle: null, creado_en: "2026-10-08 12:00:00.000", detalles: null };
    query.mockResolvedValueOnce([[row, { ...row, origen: "convenio", detalles: JSON.stringify({ trabajadores: 20, comuna: "Santiago" }) }], []]);
    const rows = await mysqlStore.list(); expect(rows[0].detalles).toBeUndefined(); expect(rows[1].detalles?.trabajadores).toBe(20);
  });
});
