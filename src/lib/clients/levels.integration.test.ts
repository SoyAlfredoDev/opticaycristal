// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
const state = vi.hoisted(() => ({ pool: null as unknown, staff: true, allowed: true }));
vi.mock("./db", () => ({ clientPool: () => state.pool, clientTable: (name: string) => `"${name}"` }));
vi.mock("./admin", () => ({ customerAdminSession: async () => state.staff ? { u: "responsable" } : null, canManageCustomerCategories: () => state.allowed }));
import { getLevelSettings, updateLevelBenefits } from "./levels";
import { GET, POST } from "@/app/api/admin/clientes/niveles/route";
import { getCustomerTiers } from "./store";
import { createSale, listCustomerSales, parseSale, quoteSale, saveSaleProduct } from "./sales";
import { protectClientValue } from "./privacy";
import { seedLegacyContractSettings } from "../../../tests/fixtures/legacy-contract-settings";
const db = new PGlite();
const conn = { query: async (sql: string, params?: unknown[]) => { const result = await db.query(sql, params); return { ...result, rowCount: result.affectedRows ?? result.rows.length }; }, release() {} };
state.pool = { query: conn.query, connect: async () => conn };
function input(extra: Record<string, unknown> = {}) { return { code: "start", maxPercent: 35, maxAmount: 50000, maxInstallments: 2, expectedRevision: 1, reason: "Ajuste de beneficios aprobado", requestKey: randomUUID(), ...extra }; }
function request(body: unknown, origin = "https://opticaycristal.cl") { return new Request("https://opticaycristal.cl/api/admin/clientes/niveles", { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) }); }
beforeAll(() => { vi.stubEnv("CLIENT_APP_URL", "https://opticaycristal.cl"); vi.stubEnv("CLIENT_DATA_KEY", randomBytes(32).toString("base64")); });
beforeEach(async () => {
  await db.exec("DROP SCHEMA IF EXISTS level_test CASCADE; CREATE SCHEMA level_test; SET search_path TO level_test;");
  for (const name of ["001-customers.sql", "002-sales.sql", "003-audit.sql", "007-installments.sql", "010-payment-commitments.sql", "015-level-benefits.sql"]) await db.exec(await readFile(`sql/clients/${name}`, "utf8"));
  await seedLegacyContractSettings(db);
  state.staff = true; state.allowed = true;
}, 30000);
afterAll(async () => { await db.close(); vi.unstubAllEnvs(); });
describe.sequential("Beneficios de niveles con historial persistente", () => {
  it("instala y repite la migración sin cambiar beneficios ni inventar historial", async () => {
    const initial = await getLevelSettings();
    expect(initial.levels.map(l => l.code)).toEqual(["start", "vip", "premium", "elite"]);
    expect(initial.history).toEqual([]);
    await db.exec(await readFile("sql/clients/015-level-benefits.sql", "utf8"));
    expect(await getLevelSettings()).toEqual(initial);
  });
  it("guarda valores anteriores y nuevos, usuario, motivo y fecha, y los usa en el portal", async () => {
    await updateLevelBenefits(input({ actor: "usurpado" }), "responsable");
    const result = await getLevelSettings();
    expect(result.levels[0]).toMatchObject({ revision: 2, maxAmount: 50000, maxPercent: 35, maxInstallments: 2 });
    expect(result.history[0]).toMatchObject({ actor: "responsable", reason: "Ajuste de beneficios aprobado", revision: 2, before: { maxAmount: 40000, maxPercent: 30, maxInstallments: 1 }, after: { maxAmount: 50000, maxPercent: 35, maxInstallments: 2 } });
    expect(Number.isFinite(Date.parse(result.history[0].createdAt))).toBe(true);
    expect((await getCustomerTiers())[0]).toMatchObject({ maxAmount: 50000, maxPercent: 35, maxInstallments: 2 });
    expect(result.levels.slice(1)).toMatchObject([{ maxAmount: 60000 }, { maxAmount: 80000 }, { maxAmount: 150000 }]);
    await db.exec(await readFile("sql/clients/007-installments.sql", "utf8"));
    expect(await getLevelSettings()).toEqual(result);
  });
  it("reintenta sin duplicar el cambio y rechaza reutilizar la clave con otro usuario o datos", async () => {
    const body = input();
    expect(await updateLevelBenefits(body, "responsable")).toEqual({ replayed: false });
    expect(await updateLevelBenefits(body, "responsable")).toEqual({ replayed: true });
    await expect(updateLevelBenefits(body, "otro")).rejects.toMatchObject({ status: 409 });
    await expect(updateLevelBenefits({ ...body, maxAmount: 60000 }, "responsable")).rejects.toMatchObject({ status: 409 });
    expect((await getLevelSettings()).history).toHaveLength(1);
  });
  it("rechaza ediciones desactualizadas y cambios vacíos", async () => {
    await expect(updateLevelBenefits(input({ maxPercent: 30, maxAmount: 40000, maxInstallments: 1 }), "responsable")).rejects.toThrow(/al menos/);
    await updateLevelBenefits(input(), "responsable");
    await expect(updateLevelBenefits(input({ maxAmount: 70000 }), "otro")).rejects.toMatchObject({ status: 409 });
    expect((await getLevelSettings()).levels[0].maxAmount).toBe(50000);
  });
  it.each([{ maxPercent: 100 }, { maxPercent: 0 }, { maxPercent: 30.5 }, { maxAmount: 0 }, { maxAmount: 1_000_000_001 }, { maxInstallments: 5 }, { maxInstallments: "2" }, { reason: " " }, { code: "inventado" }])("valida límites reales y conserva siempre el pie: %j", async extra => {
    await expect(updateLevelBenefits(input(extra), "responsable")).rejects.toMatchObject({ status: 400 });
    expect((await getLevelSettings()).history).toEqual([]);
  });
  it("revierte el cambio si falla la escritura del historial", async () => {
    await db.exec("CREATE FUNCTION fail_level_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit failure'; END $$; CREATE TRIGGER fail_level_audit BEFORE INSERT ON oc_client_level_changes FOR EACH ROW EXECUTE FUNCTION fail_level_audit();");
    await expect(updateLevelBenefits(input(), "responsable")).rejects.toThrow();
    expect((await getLevelSettings()).levels[0]).toMatchObject({ revision: 1, maxAmount: 40000 });
  });
  it("conserva las ventas anteriores y usa los nuevos beneficios en las próximas cotizaciones", async () => {
    for (const id of ["existing", "future"]) await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified") VALUES($1,$1,$2,'Cliente','Prueba',$3,$1,$4,true)`, [id, `${id}@example.invalid`, protectClientValue("123456785", "rut"), protectClientValue("+56911112222", "whatsapp")]);
    const productId = await saveSaleProduct({ name: "Lentes de prueba", protectedCost: 10000 }, "responsable");
    const sale = parseSale({ customerId: "existing", productId, quantity: 1, total: 100000, credit: 30000, installmentCount: 1, firstDueDate: "2030-01-31", identityChecked: true, depositReceived: true, requestKey: randomUUID() });
    await createSale(sale, "responsable");
    const saved = JSON.stringify(await listCustomerSales("existing"));
    await updateLevelBenefits(input(), "responsable");
    expect(JSON.stringify(await listCustomerSales("existing"))).toBe(saved);
    expect(await quoteSale({ ...sale, customerId: "future" })).toMatchObject({ maximumCredit: 35000, maxInstallments: 2 });
  });
  it("protege el historial frente a edición, borrado y truncado", async () => {
    await updateLevelBenefits(input(), "responsable");
    for (const sql of ["UPDATE oc_client_level_changes SET actor='otro'", "DELETE FROM oc_client_level_changes", "TRUNCATE oc_client_level_changes"]) await expect(db.exec(sql)).rejects.toThrow(/append-only/);
    expect((await getLevelSettings()).history[0].actor).toBe("responsable");
  });
  it("pagina todo el historial por nivel sin duplicados", async () => {
    for (let i = 1; i <= 23; i++) await updateLevelBenefits(input({ expectedRevision: i, maxAmount: 40000 + i }), "responsable");
    const first = await getLevelSettings("start");
    expect(first.history).toHaveLength(20); expect(first.nextCursor).toBeTruthy();
    const last = await getLevelSettings("start", first.nextCursor);
    expect(last.history).toHaveLength(3); expect(last.nextCursor).toBeNull();
    expect(new Set([...first.history, ...last.history].map(h => h.id)).size).toBe(23);
    expect((await getLevelSettings("vip")).history).toEqual([]);
    await expect(getLevelSettings("start", "invalid")).rejects.toMatchObject({ status: 400 });
  });
  it("bloquea acceso anónimo, lectura y escritura según permisos y origen", async () => {
    state.staff = false;
    expect((await GET(new Request("https://opticaycristal.cl/api/admin/clientes/niveles"))).status).toBe(401);
    expect((await POST(request(input()))).status).toBe(401);
    state.staff = true; state.allowed = false;
    expect((await GET(new Request("https://opticaycristal.cl/api/admin/clientes/niveles"))).status).toBe(200);
    expect((await POST(request(input()))).status).toBe(403);
    state.allowed = true;
    expect((await POST(request(input(), "https://external.invalid"))).status).toBe(403);
    const response = await POST(request(input({ actor: "usurpado" })));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await getLevelSettings()).history[0].actor).toBe("responsable");
  });
});
