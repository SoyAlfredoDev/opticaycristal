import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMesOptions } from "@/lib/jornada-form";
const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), mail: vi.fn(), allow: vi.fn() }));
vi.mock("@/lib/auth", () => ({ allowAttempt: mocks.allow, clientIp: () => "test-isolated" }));
vi.mock("@/lib/solicitudes/store", () => ({ createSolicitud: mocks.create, updateCorreoEstado: mocks.update, correoDestino: () => "team@example.com" }));
vi.mock("@/lib/mail/solicitud", () => ({ sendSolicitudCorreos: mocks.mail }));
import { POST } from "./route";
const body = { origen: "convenio", responsable: "Persona de prueba", cargo: "RRHH", telefono: "+56 9 1234 5678", correo: "prueba@example.com", empresa: "Empresa de prueba", region: "Metropolitana de Santiago", mesEstimado: "", autorizacionDatos: true, detalles: { trabajadores: 11, comuna: "Santiago", comentarios: "Opciones para el equipo" } };
function request(data: unknown) { return new Request("http://localhost/api/solicitudes", { method: "POST", body: JSON.stringify(data) }); }
beforeEach(() => { vi.clearAllMocks(); mocks.allow.mockReturnValue(true); mocks.create.mockResolvedValue(undefined); mocks.update.mockResolvedValue(undefined); mocks.mail.mockResolvedValue({ interno: { estado: "pendiente", detalle: "Prueba aislada" }, cliente: { estado: "pendiente", detalle: "Prueba aislada" } }); });
describe("API de solicitudes sin efectos externos", () => {
  it.each(["convenio", "jornada"])("guarda %s con todos los detalles y actualiza estados", async (origen) => {
    const payload = { ...body, origen, mesEstimado: origen === "jornada" ? getMesOptions()[0].value : "" };
    const response = await POST(request(payload)); expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ origen, detalles: expect.objectContaining({ trabajadores: 11, comentarios: body.detalles.comentarios }) }));
    expect(mocks.mail).toHaveBeenCalledOnce(); expect(mocks.update).toHaveBeenCalledOnce();
  });
  it("rechaza convenio no elegible antes de persistir o enviar", async () => {
    expect((await POST(request({ ...body, detalles: { ...body.detalles, trabajadores: 10 } }))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.mail).not.toHaveBeenCalled();
  });
  it("mantiene rate limit y honeypot", async () => {
    mocks.allow.mockReturnValueOnce(false); expect((await POST(request(body))).status).toBe(429);
    expect((await POST(request({ sitioWeb: "spam" }))).status).toBe(200); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("no informa éxito cuando falla el registro y no hay correo enviado", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {}); mocks.create.mockRejectedValueOnce(new Error("Prueba de error"));
    expect((await POST(request(body))).status).toBe(503); log.mockRestore();
  });
});
