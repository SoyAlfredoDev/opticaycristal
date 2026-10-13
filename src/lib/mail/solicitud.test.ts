import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Solicitud } from "@/lib/solicitudes/types";
const mocks = vi.hoisted(() => ({ send: vi.fn(), configured: vi.fn() }));
vi.mock("@/lib/mail/resend", () => ({ enviarConResend: mocks.send, resendConfigured: mocks.configured }));
import { sendSolicitudCorreos } from "./solicitud";
const request: Solicitud = { id: "test-request", origen: "convenio", responsable: "Persona", cargo: "RRHH", telefono: "+56912345678", correo: "test@example.invalid", empresa: "Empresa de prueba", region: "Metropolitana de Santiago", mesEstimado: "", autorizacionDatos: true, detalles: { trabajadores: 5, comuna: "Santiago" }, correoDestino: "contacto@opticaycristal.cl", correoEstado: "pendiente", correoDetalle: null, correoClienteEstado: "pendiente", correoClienteDetalle: null, creadoEn: new Date().toISOString() };
beforeEach(() => { vi.clearAllMocks(); mocks.configured.mockReturnValue(true); mocks.send.mockResolvedValue({ ok: true, id: "provider-id", error: null }); });
afterEach(() => vi.unstubAllEnvs());
describe("doble aviso de solicitudes", () => {
  it.each(["convenio", "jornada"] as const)("envía %s a contacto y al cliente con claves distintas y Reply-To correcto", async origen => {
    vi.stubEnv("MAIL_TO", "unrelated@example.invalid");
    const result = await sendSolicitudCorreos({ ...request, origen });
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: "contacto@opticaycristal.cl", replyTo: request.correo, idempotencyKey: "request-test-request-internal" }));
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: request.correo, replyTo: "contacto@opticaycristal.cl", idempotencyKey: "request-test-request-client" }));
    expect(result).toMatchObject({ interno: { estado: "enviado", id: "provider-id" }, cliente: { estado: "enviado", id: "provider-id" } });
  });
  it("al reenviar un aviso pendiente no vuelve a enviar la confirmación aceptada", async () => {
    await sendSolicitudCorreos({ ...request, correoClienteEstado: "enviado", correoClienteId: "old-id" });
    expect(mocks.send).toHaveBeenCalledOnce(); expect(mocks.send.mock.calls[0][0].to).toBe("contacto@opticaycristal.cl");
  });
  it("registra ambos pendientes cuando falta Resend", async () => {
    mocks.configured.mockReturnValueOnce(false);
    expect(await sendSolicitudCorreos(request)).toMatchObject({ interno: { estado: "pendiente" }, cliente: { estado: "pendiente" } });
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
