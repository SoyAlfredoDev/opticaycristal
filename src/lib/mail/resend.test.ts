import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/mail/templates", () => ({ FROM_ADDRESS: "Óptica & Cristal <contacto@opticaycristal.cl>", logoAttachment: () => ({ filename: "logo.png", content: "test" }) }));
import { enviarConResend } from "./resend";
const send = vi.fn();
const message = { to: "test@example.invalid", subject: "Prueba aislada", html: "<p>Prueba</p>", text: "Prueba", replyTo: "contacto@opticaycristal.cl", idempotencyKey: "request-test-client" };
beforeEach(() => { vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubGlobal("fetch", send); send.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("transporte Resend sin llamadas externas", () => {
  it("envía la clave de idempotencia en la cabecera HTTP", async () => {
    send.mockResolvedValueOnce(Response.json({ id: "provider-id" }));
    expect(await enviarConResend(message)).toMatchObject({ ok: true, id: "provider-id" });
    expect(send.mock.calls[0][1].headers["Idempotency-Key"]).toBe(message.idempotencyKey);
    expect(JSON.parse(send.mock.calls[0][1].body)).toMatchObject({ to: [message.to], reply_to: message.replyTo });
  });
  it("no declara éxito sin una referencia del proveedor", async () => {
    send.mockResolvedValueOnce(Response.json({})); expect(await enviarConResend(message)).toMatchObject({ ok: false, id: null });
  });
  it("conserva el fallo y la incertidumbre sin volver a enviar automáticamente", async () => {
    send.mockRejectedValueOnce(new Error("Timeout simulado"));
    expect(await enviarConResend(message)).toMatchObject({ ok: false }); expect(send).toHaveBeenCalledOnce();
  });
});
