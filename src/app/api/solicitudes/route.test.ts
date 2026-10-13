import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMesOptions } from "@/lib/jornada-form";
const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), get: vi.fn(), mail: vi.fn(), allow: vi.fn() }));
vi.mock("@/lib/auth", () => ({ allowAttempt: mocks.allow, clientIp: () => "test-isolated" }));
vi.mock("@/lib/solicitudes/store", () => ({ createSolicitud: mocks.create, getSolicitud: mocks.get, updateCorreoEstado: mocks.update, correoDestino: () => "team@example.com" }));
vi.mock("@/lib/mail/solicitud", () => ({ sendSolicitudCorreos: mocks.mail }));
import { POST } from "./route";
const body = { origen: "convenio", responsable: "Persona de prueba", cargo: "RRHH", telefono: "+56 9 1234 5678", correo: "prueba@example.com", empresa: "Empresa de prueba", region: "Metropolitana de Santiago", mesEstimado: "", autorizacionDatos: true, detalles: { trabajadores: 11, comuna: "Santiago", comentarios: "Opciones para el equipo" } };
function request(data: unknown) { return new Request("http://localhost/api/solicitudes", { method: "POST", body: JSON.stringify(data) }); }
beforeEach(() => { vi.clearAllMocks(); mocks.allow.mockReturnValue(true); mocks.get.mockResolvedValue(null); mocks.create.mockResolvedValue(undefined); mocks.update.mockResolvedValue(undefined); mocks.mail.mockResolvedValue({ interno: { estado: "pendiente", detalle: "Prueba aislada", id: null }, cliente: { estado: "pendiente", detalle: "Prueba aislada", id: null } }); });
describe("API de solicitudes sin efectos externos", () => {
  it.each(["convenio", "jornada"])("guarda %s con todos los detalles y actualiza estados", async (origen) => {
    const payload = { ...body, origen, mesEstimado: origen === "jornada" ? getMesOptions()[0].value : "" };
    const response = await POST(request(payload)); expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ origen, detalles: expect.objectContaining({ trabajadores: 11, comentarios: body.detalles.comentarios }) }));
    expect(mocks.mail).toHaveBeenCalledOnce(); expect(mocks.update).toHaveBeenCalledOnce();
  });
  it("rechaza convenio no elegible antes de persistir o enviar", async () => {
    expect((await POST(request({ ...body, detalles: { ...body.detalles, trabajadores: 4 } }))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.mail).not.toHaveBeenCalled();
  });
  it("acepta convenio desde cinco trabajadores", async () => {
    expect((await POST(request({ ...body, detalles: { ...body.detalles, trabajadores: 5 } }))).status).toBe(200);
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it("mantiene rate limit y honeypot", async () => {
    mocks.allow.mockReturnValueOnce(false); expect((await POST(request(body))).status).toBe(429);
    expect((await POST(request({ sitioWeb: "spam" }))).status).toBe(200); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("no informa éxito cuando falla el registro y no hay correo enviado", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {}); mocks.create.mockRejectedValueOnce(new Error("Prueba de error"));
    expect((await POST(request(body))).status).toBe(503); expect(mocks.mail).not.toHaveBeenCalled(); log.mockRestore();
  });
  it("conserva referencias del proveedor y confirma únicamente el correo aceptado", async () => {
    mocks.mail.mockResolvedValueOnce({ interno: { estado: "enviado", detalle: null, id: "internal-id" }, cliente: { estado: "enviado", detalle: null, id: "client-id" } });
    const response = await POST(request(body));
    expect(await response.json()).toMatchObject({ ok: true, confirmationSent: true });
    expect(mocks.update).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ correoId: "internal-id", correoClienteId: "client-id" }));
  });
  it("una confirmación fallida conserva la solicitud y no afirma que se envió", async () => {
    mocks.mail.mockResolvedValueOnce({ interno: { estado: "enviado", detalle: null, id: "internal-id" }, cliente: { estado: "error", detalle: "Prueba de fallo", id: null } });
    const response = await POST(request(body));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ ok: true, confirmationSent: false });
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it("un reintento con la misma referencia no duplica solicitudes ni correos", async () => {
    const id = "12345678-1234-1234-1234-123456789abc";
    await POST(request({ ...body, requestId: id }));
    mocks.get.mockResolvedValueOnce({ ...body, id, correoEstado: "enviado", correoClienteEstado: "enviado" });
    const response = await POST(request({ ...body, requestId: id }));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ id, confirmationSent: true });
    expect(mocks.create).toHaveBeenCalledOnce(); expect(mocks.mail).toHaveBeenCalledOnce();
  });
  it("rechaza reutilizar una referencia con datos diferentes", async () => {
    const id = "12345678-1234-1234-1234-123456789abc";
    mocks.get.mockResolvedValueOnce({ ...body, id, empresa: "Otra empresa" });
    expect((await POST(request({ ...body, requestId: id }))).status).toBe(409);
    expect(mocks.mail).not.toHaveBeenCalled();
  });
  it("limita el tamaño del cuerpo y rechaza envíos desde otro origen", async () => {
    expect((await POST(request({ ...body, extra: "x".repeat(17000) }))).status).toBe(413);
    const foreign = new Request("https://opticaycristal.cl/api/solicitudes", { method: "POST", headers: { origin: "https://example.invalid" }, body: JSON.stringify(body) });
    expect((await POST(foreign)).status).toBe(403); expect(mocks.mail).not.toHaveBeenCalled();
  });
});
