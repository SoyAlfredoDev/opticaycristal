import { afterEach, describe, expect, it, vi } from "vitest";
import { adminCookieOptions, allowAttempt, createSessionToken, credentialsMatch, readSessionToken } from "./auth";

afterEach(() => vi.unstubAllEnvs());
describe("seguridad de acceso administrativo", () => {
  it("firma la sesión y rechaza una firma alterada", () => {
    vi.stubEnv("SESSION_SECRET", "s".repeat(48));
    const token = createSessionToken("equipo");
    expect(readSessionToken(token)).toMatchObject({ u: "equipo" });
    expect(readSessionToken(`${token?.slice(0, -1)}x`)).toBeNull();
  });
  it("compara las credenciales sin exponerlas y limita intentos", () => {
    vi.stubEnv("ADMIN_USER", "equipo"); vi.stubEnv("ADMIN_PASSWORD", "clave-segura-de-prueba");
    expect(credentialsMatch("equipo", "clave-segura-de-prueba")).toBe(true);
    expect(credentialsMatch("equipo", "incorrecta")).toBe(false);
    vi.stubEnv("ADMIN_USER_2", "soyalfredo.dev@gmail.com"); vi.stubEnv("ADMIN_PASSWORD_2", "clave-segura-secundaria");
    expect(credentialsMatch("SOYALFREDO.DEV@GMAIL.COM", "clave-segura-secundaria")).toBe(true);
    const key = `auth-test-${crypto.randomUUID()}`;
    for (let attempt = 0; attempt < 8; attempt++) expect(allowAttempt(key, 8, 60_000)).toBe(true);
    expect(allowAttempt(key, 8, 60_000)).toBe(false);
  });
  it("crea cookies de sesión no accesibles desde JavaScript y seguras en producción", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(adminCookieOptions(100)).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  });
});
