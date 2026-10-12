import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: mocks.session }));
vi.mock("@/lib/orders/store", () => ({ updateOrderStatus: mocks.update }));
import { PATCH } from "./route";

describe("PATCH /api/pedidos/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("rechaza visitantes sin sesión y estados inválidos", async () => {
    mocks.session.mockResolvedValue(null);
    const context = { params: Promise.resolve({ id: "pedido-1" }) };
    expect((await PATCH(new Request("http://local", { method: "PATCH", body: JSON.stringify({ status: "cerrado" }) }), context)).status).toBe(401);
    mocks.session.mockResolvedValue({ u: "equipo", exp: Date.now() + 1000 });
    expect((await PATCH(new Request("http://local", { method: "PATCH", body: JSON.stringify({ status: "inventado" }) }), context)).status).toBe(400);
  });
  it("permite actualizar estado con sesión válida", async () => {
    mocks.session.mockResolvedValue({ u: "equipo", exp: Date.now() + 1000 }); mocks.update.mockResolvedValue(true);
    const response = await PATCH(new Request("http://local", { method: "PATCH", body: JSON.stringify({ status: "cotizado" }) }), { params: Promise.resolve({ id: "pedido-1" }) });
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith("pedido-1", "cotizado");
  });
});
