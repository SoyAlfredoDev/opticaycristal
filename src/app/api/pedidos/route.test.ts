import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ allow: vi.fn(() => true), create: vi.fn(), list: vi.fn(), session: vi.fn(() => null) }));
vi.mock("@/lib/auth", () => ({ allowAttempt: mocks.allow, clientIp: () => "127.0.0.1", getSession: mocks.session }));
vi.mock("@/lib/orders/store", () => ({ createOrder: mocks.create, listOrders: mocks.list }));
import { GET, POST } from "./route";
const payload = { items: [{ productId: "cat-eye", quantity: 1 }], customer: { name: "Ana Pérez", email: "ana@example.cl", phone: "+56912345678", comuna: "Santiago", address: "Calle 123", comments: "", consent: true } };
describe("/api/pedidos", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.allow.mockReturnValue(true); mocks.session.mockReturnValue(null); });
  it("registra una solicitud de cotización y devuelve 201", async () => {
    mocks.create.mockImplementation(async (order) => order);
    const response = await POST(new Request("http://local/api/pedidos", { method: "POST", body: JSON.stringify(payload) }));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ items: [expect.objectContaining({ title: "Montura cat eye" })] }));
  });
  it("rechaza datos inválidos y protege la lectura del panel", async () => {
    expect((await POST(new Request("http://local/api/pedidos", { method: "POST", body: "{}" }))).status).toBe(400);
    expect((await GET()).status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
