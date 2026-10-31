// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ session: vi.fn(), profile: vi.fn(), tiers: vi.fn() }));
vi.mock("@/lib/clients/auth", () => ({ customerSession: mock.session }));
vi.mock("@/lib/clients/store", () => ({ getCustomerProfile: mock.profile, getCustomerTiers: mock.tiers }));
import { GET } from "./route";
const request = (etag = "") => new Request("http://localhost/api/clientes/perfil?userId=other", { headers: etag ? { "If-None-Match": etag } : {} });
beforeEach(() => {
  mock.session.mockResolvedValue({ user: { id: "own" } });
  mock.profile.mockResolvedValue({ id: "own", credit: { capacity: 40000 } });
  mock.tiers.mockResolvedValue([{ code: "start", maxInstallments: 1 }]);
});
it("autentica antes de comparar versiones y nunca acepta un ID del navegador", async () => {
  const response = await GET(request());
  expect(mock.profile).toHaveBeenCalledWith("own");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("Cache-Control")).toContain("private");
  expect(response.headers.get("Vary")).toBe("Cookie");
  expect(response.headers.get("ETag")).toBeTruthy();
  expect((await response.json()).tiers).toHaveLength(1);
});
it("no descarga otra copia del perfil cuando la versión no cambió", async () => {
  const first = await GET(request()), etag = first.headers.get("ETag")!;
  const next = await GET(request(etag));
  expect(next.status).toBe(304); expect(await next.text()).toBe("");
  expect(next.headers.get("Cache-Control")).toBe("no-store, private");
  expect(mock.session).toHaveBeenCalledTimes(2);
});
it("cambia la versión cuando cambia el saldo o las condiciones de categoría", async () => {
  const etag = (await GET(request())).headers.get("ETag")!;
  mock.profile.mockResolvedValue({ id: "own", credit: { capacity: 30000 } });
  expect((await GET(request(etag))).status).toBe(200);
  mock.tiers.mockResolvedValue([{ code: "start", maxInstallments: 2 }]);
  expect((await GET(request(etag))).headers.get("ETag")).not.toBe(etag);
});
it("no responde 304 a una sesión expirada aunque conserve una versión válida", async () => {
  const etag = (await GET(request())).headers.get("ETag")!;
  mock.session.mockResolvedValue(null); mock.profile.mockClear(); mock.tiers.mockClear();
  expect((await GET(request(etag))).status).toBe(401);
  expect(mock.profile).not.toHaveBeenCalled(); expect(mock.tiers).not.toHaveBeenCalled();
});
it("no confunde una cuenta eliminada o una caída de base de datos con un saldo cero", async () => {
  mock.profile.mockResolvedValue(null); expect((await GET(request())).status).toBe(404);
  mock.profile.mockRejectedValue(new Error("offline")); expect((await GET(request())).status).toBe(503);
});
