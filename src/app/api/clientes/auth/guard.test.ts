// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ handler: vi.fn(async (request: Request) => { void request; return new Response("{}"); }), session: vi.fn(), limit: vi.fn(async () => true) }));
vi.mock("@/lib/clients/auth", () => ({ clientAuth: () => ({ handler: mocks.handler, api: { getSession: mocks.session } }) }));
vi.mock("@/lib/clients/db", () => ({ clientPool: vi.fn() }));
vi.mock("@/lib/clients/http", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/clients/http")>(), allowClientRegistration: mocks.limit }));
import { GET, POST } from "./[...all]/route";
const base = "http://localhost:3097";
function req(path: string, origin = base, body: unknown = {}) { return new Request(`${base}/api/clientes/auth/${path}`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => { vi.stubEnv("CLIENT_APP_URL", base);mocks.handler.mockClear();mocks.session.mockReset(); });
describe("Límite público de autenticación", () => {
  it("rechaza solicitudes mutantes desde otro origen antes de llamar al proveedor", async () => { expect((await POST(req("sign-out", "https://ajeno.example"))).status).toBe(403);expect(mocks.handler).not.toHaveBeenCalled(); });
  it("no expone registro directo, cambio de atributos ni verificación de WhatsApp", async () => { for (const p of ["sign-up/email", "update-user", "change-email", "whatsapp/verify", "admin/set-role"]) expect((await POST(req(p))).status).toBe(404);expect(mocks.handler).not.toHaveBeenCalled(); });
  it("permite el callback real de recuperación por token", async () => { const r = await GET(new Request(base+"/api/clientes/auth/reset-password/token123?callbackURL="+encodeURIComponent(base+"/mi-cuenta/restablecer")));expect(r.status).toBe(200);expect(mocks.handler).toHaveBeenCalledOnce(); });
  it("no permite reenviar verificación sin sesión", async () => { mocks.session.mockResolvedValue(null);expect((await POST(req("send-verification-email"))).status).toBe(401); });
  it("ignora el correo ajeno y reenvía solo al de la sesión autenticada", async () => { mocks.session.mockResolvedValue({ user: { id: "own", email: "own@example.com" } });await POST(req("send-verification-email", base, { email: "other@example.com" }));expect(mocks.handler).toHaveBeenCalledOnce();const forwarded = mocks.handler.mock.calls[0]?.[0] as unknown as Request;expect(await forwarded.json()).toEqual({ email: "own@example.com", callbackURL: "/mi-cuenta/perfil" }); });
});
