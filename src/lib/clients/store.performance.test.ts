// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ query: vi.fn(), sales: vi.fn() }));
vi.mock("./db", () => ({ clientPool: () => ({ query: mock.query }), clientTable: (name: string) => name }));
vi.mock("./sales", () => ({ listCustomerSales: mock.sales }));
vi.mock("./privacy", () => ({ revealClientValue: (value: unknown) => value, clientFingerprint: vi.fn() }));
import { getCustomerProfile } from "./store";
beforeEach(() => { mock.sales.mockResolvedValue([]); });
it("lee perfil y contacto en una sola consulta y conserva el cupo y el nivel", async () => {
  mock.query.mockResolvedValue({ rows: [{ id: "own", firstName: "Cliente", lastName: "Prueba", email: "test@example.invalid", emailVerified: true,
    identityVerified: false, whatsappVerified: false, createdAt: "2026-01-01", code: "start", tier_name: "Start", max_percent: 30,
    max_amount: 40000, max_installments: 1, outstanding: 0, rutCipher: "test-rut", whatsappCipher: "test-whatsapp" }] });
  const customer = await getCustomerProfile("own");
  expect(mock.query).toHaveBeenCalledTimes(1);
  expect(mock.query.mock.calls[0][0]).toContain('u."rutCipher",u."whatsappCipher"');
  expect(mock.query.mock.calls[0][1]).toEqual(["own"]);
  expect(mock.sales).toHaveBeenCalledOnce(); expect(mock.sales).toHaveBeenCalledWith("own");
  expect(customer).toMatchObject({ rut: "test-rut", tier: { maxInstallments: 1, maxAmount: 40000 }, credit: { capacity: 40000, available: 40000 } });
});
it("no carga historial de una cuenta que no existe", async () => {
  mock.query.mockResolvedValue({ rows: [] });
  expect(await getCustomerProfile("missing")).toBeNull(); expect(mock.sales).not.toHaveBeenCalled();
});
