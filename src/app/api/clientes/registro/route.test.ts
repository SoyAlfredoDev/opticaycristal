// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ signup: vi.fn(), exists:vi.fn(async()=>false), limit: vi.fn(async () => true) }));
vi.mock("@/lib/clients/auth", () => ({ clientAuth: () => ({ api: { signUpEmail: m.signup } }) }));
vi.mock("@/lib/clients/registration",()=>({registrationExists:m.exists}));
vi.mock("@/lib/clients/db", () => ({ clientPool: vi.fn() }));
vi.mock("@/lib/clients/http", async original => ({ ...await original<typeof import("@/lib/clients/http")>(), allowClientRegistration: m.limit }));
import { POST } from "./route";
const data = { firstName: "Persona", lastName: "Prueba", email: "persona@example.com", rut: "12.345.678-5", whatsapp: "+56912345678", password: "Una frase segura privada!", privacyAccepted: true };
const request = (body: unknown, origin = "http://localhost:3097") => new Request("http://localhost:3097/api/clientes/registro", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks();vi.stubEnv("CLIENT_APP_URL", "http://localhost:3097");vi.stubEnv("CLIENT_DATA_KEY", Buffer.alloc(32, 6).toString("base64"));m.signup.mockResolvedValue(new Response(JSON.stringify({ user: { id: "test" } }), { status: 200 }));m.limit.mockResolvedValue(true);m.exists.mockResolvedValue(false); });
describe("Registro validado en servidor", () => {
  it("rechaza un RUT inválido antes de crear una cuenta", async () => { expect((await POST(request({ ...data, rut: "12345678-4" }))).status).toBe(400);expect(m.signup).not.toHaveBeenCalled(); });
  it("rechaza un origen externo", async () => { expect((await POST(request(data, "https://otro.example"))).status).toBe(403);expect(m.signup).not.toHaveBeenCalled(); });
  it("cifra datos y no transmite privilegios aportados por el navegador", async () => { const r = await POST(request({ ...data, category: "elite", role: "admin", whatsappVerified: true, emailVerified: true }));expect(r.status).toBe(200);const body = m.signup.mock.calls[0][0].body;expect(body).not.toHaveProperty("category");expect(body).not.toHaveProperty("role");expect(body).not.toHaveProperty("whatsappVerified");expect(body.rutCipher).not.toContain("123456785");expect(body.whatsappCipher).not.toContain("56912345678");expect(await r.text()).not.toContain("test"); });
  it("aplica límites antes del hash de contraseña y no muestra errores internos", async () => { m.limit.mockResolvedValue(false);expect((await POST(request(data))).status).toBe(429);expect(m.signup).not.toHaveBeenCalled();m.limit.mockResolvedValue(true);m.signup.mockRejectedValue(new Error("postgres://secret@host"));const r = await POST(request(data));expect(r.status).toBe(503);expect(await r.text()).not.toContain("secret"); });
});
