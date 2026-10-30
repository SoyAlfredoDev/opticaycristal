// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ customer: vi.fn(), admin: vi.fn(), profile: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/clients/auth", () => ({ customerSession: m.customer }));
vi.mock("@/lib/clients/admin", () => ({ customerAdminSession: m.admin }));
vi.mock("@/lib/clients/store", () => ({ getCustomerProfile: m.profile, listCustomerSummaries: m.list }));
import { GET as profile } from "./perfil/route";
import { GET as adminList } from "../admin/clientes/route";
beforeEach(() => { vi.clearAllMocks(); });
describe("Separación de datos entre clientes y administración", () => {
  it("no consulta datos privados sin sesión de cliente", async () => { m.customer.mockResolvedValue(null);expect((await profile()).status).toBe(401);expect(m.profile).not.toHaveBeenCalled(); });
  it("obtiene el ID del cliente desde la sesión y no desde una entrada externa", async () => { m.customer.mockResolvedValue({ user: { id: "cliente-propio" } });m.profile.mockResolvedValue({ id: "cliente-propio" });const r = await profile();expect(m.profile).toHaveBeenCalledWith("cliente-propio");expect((await r.json()).customer.id).toBe("cliente-propio");expect(r.headers.get("cache-control")).toContain("no-store"); });
  it("una sesión de cliente no concede permisos del personal", async () => { m.customer.mockResolvedValue({ user: { id: "cliente-propio" } });m.admin.mockResolvedValue(null);expect((await adminList(new Request("http://localhost/api/admin/clientes"))).status).toBe(401);expect(m.list).not.toHaveBeenCalled(); });
  it("solo la sesión administrativa permite consultar clientes", async () => { m.admin.mockResolvedValue({ u: "staff" });m.list.mockResolvedValue([]);const r = await adminList(new Request("http://localhost/api/admin/clientes?q=Camila"));expect(r.status).toBe(200);expect(m.list).toHaveBeenCalledWith("Camila"); });
});
