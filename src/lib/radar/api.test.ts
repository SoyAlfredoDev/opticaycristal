import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  session: vi.fn(async () => null as { u: string } | null),
}));
vi.mock("@/lib/auth", () => ({ getSession: mock.session }));
import {
  hasRadarAccess,
  readRadarBody,
  validateSearchFilters,
  assertRadarOrigin,
} from "./api";
describe("radar machine and request boundaries", () => {
  it("accepts the browser's local host and rejects cross-origin requests", () => {
    expect(() =>
      assertRadarOrigin(
        new Request("http://localhost:3001/api/admin/radar/workspace", {
          headers: { Host: "127.0.0.1:3001", Origin: "http://127.0.0.1:3001" },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      assertRadarOrigin(
        new Request("https://opticaycristal.cl/api/admin/radar/workspace", {
          headers: {
            Host: "opticaycristal.cl",
            Origin: "https://attacker.invalid",
          },
        }),
      ),
    ).toThrow("Origen no autorizado");
  });
  beforeEach(() => {
    mock.session.mockResolvedValue(null);
    vi.stubEnv("RADAR_AGENT_API_KEY", "a".repeat(48));
    vi.stubEnv("RADAR_AGENT_SCOPES", "read,search");
  });
  afterEach(() => vi.unstubAllEnvs());
  it("requires a valid bearer credential and an allowed scope", async () => {
    const req = new Request("http://local", {
      headers: { Authorization: `Bearer ${"a".repeat(48)}` },
    });
    expect(await hasRadarAccess(req, "read")).toBe(true);
    expect(await hasRadarAccess(req, "save")).toBe(false);
    expect(
      await hasRadarAccess(
        new Request("http://local", {
          headers: { Authorization: "Bearer incorrect" },
        }),
        "read",
      ),
    ).toBe(false);
  });
  it("preserves administrative session access", async () => {
    mock.session.mockResolvedValue({ u: "admin" });
    expect(await hasRadarAccess(new Request("http://local"), "enrich")).toBe(
      true,
    );
  });
  it("bounds actual request bytes and rejects null or array JSON", async () => {
    for (const body of ["null", "[]", "{"]) {
      await expect(
        readRadarBody(new Request("http://local", { method: "POST", body })),
      ).rejects.toThrow();
    }
    await expect(
      readRadarBody(
        new Request("http://local", {
          method: "POST",
          body: JSON.stringify({ value: "x".repeat(200) }),
        }),
        100,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("validates structured filters without accepting scripts or arbitrary countries", () => {
    expect(
      validateSearchFilters({
        region: "Metropolitana de Santiago",
        industry: "company",
        commune: "Quilicura",
      }),
    ).toMatchObject({ commune: "Quilicura" });
    expect(() =>
      validateSearchFilters({ region: "Chile", industry: "company" }),
    ).toThrow();
    expect(() =>
      validateSearchFilters({
        region: "Metropolitana de Santiago",
        industry: "other",
        otherIndustry: " ",
      }),
    ).toThrow();
  });
});
