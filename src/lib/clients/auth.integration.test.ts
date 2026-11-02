// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import type { Pool } from "pg";
import { createClientAuth } from "./auth";
import { clientFingerprint, protectClientValue, revealClientValue } from "./privacy";
import type { ClientMail } from "./mail";
import { allowClientRegistration, sameClientOrigin } from "./http";
vi.mock("./db", async original => ({ ...await original<typeof import("./db")>(), clientPool: () => pool }));

const database = new PGlite(), mails: ClientMail[] = [];
const connection = { query: async (sql: string, values?: unknown[]) => { const r = await database.query(sql, values);return { ...r, rowCount: r.affectedRows ?? r.rows.length }; }, release() {} };
const pool = { connect: async () => connection, query: connection.query, end: async () => {} } as unknown as Pool;
let auth: ReturnType<typeof createClientAuth>;
let cookie = "", id = "";
const password = "Una frase segura de prueba 2026!";
const base = "http://localhost:3097";
const extra = { firstName: "Cliente", lastName: "Prueba", rutCipher: "", rutHash: "", whatsappCipher: "" };
async function post(path: string, body: unknown, sessionCookie = "") { return auth.handler(new Request(base + "/api/clientes/auth/" + path, { method: "POST", headers: { "Content-Type": "application/json", Origin: base, ...(sessionCookie ? { Cookie: sessionCookie } : {}) }, body: JSON.stringify(body) })); }
beforeAll(async () => {
  vi.stubEnv("CLIENT_DATABASE_SCHEMA", "public");vi.stubEnv("CLIENT_AUTH_SECRET", randomBytes(32).toString("base64"));vi.stubEnv("CLIENT_DATA_KEY", randomBytes(32).toString("base64"));vi.stubEnv("CLIENT_APP_URL", base);
  await database.exec(await readFile("sql/clients/001-customers.sql", "utf8"));
  await database.exec(await readFile("sql/clients/012-customer-profile-edits.sql", "utf8"));
  extra.rutCipher = protectClientValue("123456785", "rut");extra.rutHash = clientFingerprint("123456785", "rut");extra.whatsappCipher = protectClientValue("+56912345678", "whatsapp");
  auth = createClientAuth(pool, async message => { mails.push(message); });
}, 30_000);
afterAll(async () => { await database.close();vi.unstubAllEnvs(); });
describe.sequential("Autenticación real contra PostgreSQL local aislado", () => {
  it("crea las cuatro niveles y la migración se puede repetir", async () => { const r = await database.query<{ code: string; max_amount: number }>("SELECT code,max_amount FROM oc_client_tiers ORDER BY position");expect(r.rows.map(x => [x.code, x.max_amount])).toEqual([["start",40000],["vip",60000],["premium",80000],["elite",150000]]);await database.exec(await readFile("sql/clients/001-customers.sql", "utf8")); });
  it("crea la cuenta en Start, con hash de contraseña y saldo inicial atómico", async () => {
    const r = await auth.api.signUpEmail({ body: { name: "Cliente Prueba", email: "cliente@example.com", password, ...extra, category: "elite", emailVerified: true, whatsappVerified: true } as never });
    id = r.user.id;
    const u = (await database.query<Record<string, unknown>>('SELECT * FROM oc_client_user WHERE id=$1', [id])).rows[0];
    expect(u.category).toBe("start");expect(u.emailVerified).toBe(false);expect(u.whatsappVerified).toBe(false);
    expect(u.rutCipher).not.toContain("123456785");expect(revealClientValue(String(u.rutCipher), "rut")).toBe("123456785");expect(() => revealClientValue(String(u.rutCipher), "whatsapp")).toThrow();
    expect(r.user).not.toHaveProperty("rutCipher");expect(r.user).not.toHaveProperty("whatsappCipher");
    expect((await database.query("SELECT * FROM oc_client_credit_balances WHERE user_id=$1", [id])).rows).toHaveLength(1);
    const a = (await database.query<{ password: string }>("SELECT password FROM oc_client_account WHERE \"userId\"=$1", [id])).rows[0];expect(a.password).not.toBe(password);expect(a.password.length).toBeGreaterThan(60);expect(mails[0].kind).toBe("verify");
  }, 20_000);
  it("impide cuentas duplicadas por RUT aun usando otro correo", async () => { await expect(auth.api.signUpEmail({ body: { name: "Duplicado", email: "otro@example.com", password, ...extra } as never })).rejects.toThrow();expect((await database.query("SELECT count(*)::int AS count FROM oc_client_user")).rows[0]).toEqual({ count: 1 }); });
  it("permite entrar antes de verificar y emite cookie HttpOnly SameSite", async () => { const r = await post("sign-in/email", { email: "cliente@example.com", password });expect(r.status).toBe(200);const set = r.headers.get("set-cookie") || "";expect(set.toLowerCase()).toContain("httponly");expect(set.toLowerCase()).toContain("samesite=lax");cookie = set.split(";")[0];const s = await auth.api.getSession({ headers: new Headers({ Cookie: cookie }) });expect(s?.user.id).toBe(id);expect(s?.user.emailVerified).toBe(false); });
  it("el cliente no puede cambiar ni restablecer su nivel al actualizar su perfil", async () => {
    await database.query("UPDATE oc_client_user SET category='vip' WHERE id=$1",[id]);
    try {
      expect((await post("update-user",{name:"Cliente Prueba",category:"elite"},cookie)).status).toBe(400);
      expect((await database.query("SELECT category FROM oc_client_user WHERE id=$1",[id])).rows[0]).toEqual({category:"vip"});
      expect((await post("update-user",{name:"Cliente Prueba"},cookie)).status).toBe(200);
      expect((await database.query("SELECT category FROM oc_client_user WHERE id=$1",[id])).rows[0]).toEqual({category:"vip"});
    } finally { await database.query("UPDATE oc_client_user SET category='start' WHERE id=$1",[id]); }
  });
  it("rechaza origen externo y contraseña equivocada", async () => { expect((await post("sign-in/email", { email: "cliente@example.com", password: "otra contraseña" })).status).toBe(401);const request = new Request(base+"/api/clientes/auth/sign-out", { method: "POST", headers: { Origin: "https://ajeno.example", "Content-Type": "application/json", Cookie: cookie }, body: "{}" });expect(sameClientOrigin(request)).toBe(false); });
  it("verifica el correo con su enlace sin dar permisos administrativos", async () => { const url = mails.find(x => x.kind === "verify")!.url;const r = await auth.handler(new Request(url));expect(r.status).toBeLessThan(400);const u = (await database.query<{ emailVerified: boolean; category: string; whatsappVerified: boolean }>('SELECT "emailVerified",category,"whatsappVerified" FROM oc_client_user WHERE id=$1', [id])).rows[0];expect(u).toEqual({ emailVerified: true, category: "start", whatsappVerified: false }); });
  it("restablece una sola vez e invalida las sesiones previas", async () => {
    expect((await post("request-password-reset", { email: "cliente@example.com", redirectTo: base+"/mi-cuenta/restablecer" })).status).toBe(200);
    const reset = new URL(mails.find(x => x.kind === "reset")!.url);const callback = await auth.handler(new Request(reset));expect(callback.status).toBe(302);
    const token = new URL(callback.headers.get("location")!).searchParams.get("token");expect(token).toBeTruthy();
    const values = await database.query<{ identifier: string }>("SELECT identifier FROM oc_client_verification");expect(values.rows.every(x => !x.identifier.includes(token!))).toBe(true);
    const newPassword = "Mi nueva frase segura 2026!";
    expect((await post("reset-password", { token, newPassword })).status).toBe(200);
    expect((await post("reset-password", { token, newPassword })).status).toBeGreaterThanOrEqual(400);
    expect(await auth.api.getSession({ headers: new Headers({ Cookie: cookie }) })).toBeNull();
    expect((await post("sign-in/email", { email: "cliente@example.com", password })).status).toBe(401);
    expect((await post("sign-in/email", { email: "cliente@example.com", password: newPassword })).status).toBe(200);
  }, 20_000);
  it("no distingue un correo inexistente al solicitar recuperación", async () => { expect((await post("request-password-reset", { email: "inexistente@example.com", redirectTo: base+"/mi-cuenta/restablecer" })).status).toBe(200);expect(mails.filter(x => x.to === "inexistente@example.com")).toHaveLength(0); });
  it("persiste límites por IP y correo sin guardarlos en claro", async () => { const request = new Request(base, { headers: { "x-forwarded-for": "198.51.100.1" } });for (let i = 0; i < 3; i++) expect(await allowClientRegistration(request, "limit@example.com")).toBe(true);expect(await allowClientRegistration(request, "limit@example.com")).toBe(false);for (let i = 0; i < 4; i++) expect(await allowClientRegistration(request, `other${i}@example.com`)).toBe(true);expect(await allowClientRegistration(request, "ninth@example.com")).toBe(false);const rows = await database.query<{ key: string }>("SELECT key FROM oc_client_registration_limit");expect(rows.rows.every(r => /^[0-9a-f]{64}$/.test(r.key))).toBe(true); });
});
