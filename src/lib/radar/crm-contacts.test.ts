import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ queries: [] as { text: string; values: unknown[] }[] }));
vi.mock("./crm-schema", () => ({
  ensureCrmSchema: vi.fn(async () => {}),
  crmSql: () => async (strings: TemplateStringsArray, ...values: unknown[]) => {
    mock.queries.push({ text: strings.join("?"), values });
    return [];
  },
}));
import { normalizedContactEmails, syncProspectContacts } from "./crm-contacts";
import { parseProspectCsv } from "./import-csv";

describe("automatic Radar contacts", () => {
  beforeEach(() => { mock.queries = []; });
  it("normalizes and deduplicates real addresses, ignoring malformed values", () => {
    expect(normalizedContactEmails([" Ventas@example.com ", "ventas@example.com", "invalid"])).toEqual(["ventas@example.com"]);
  });
  it("does not invent contacts for companies without email", async () => {
    await syncProspectContacts({ id: "company-test" });
    expect(mock.queries).toHaveLength(0);
  });
  it("creates active contacts idempotently and preserves opt-outs and suppressions", async () => {
    await syncProspectContacts({ id: "company-test", emails: ["ventas@example.com", "VENTAS@example.com"] });
    expect(mock.queries).toHaveLength(1);
    const query = mock.queries[0];
    expect(query.text).toContain("ON CONFLICT(prospect_id,email)");
    expect(query.text).toContain("radar_crm_suppressions");
    expect(query.text).toContain("radar_crm_contacts.status='unsubscribed'");
    expect(query.text).toContain("ELSE 'active'");
    expect(query.text).not.toContain("consented_at");
    expect(query.text).not.toContain("consent_evidence");
    await syncProspectContacts({ id: "company-test", emails: ["ventas@example.com"] });
    expect(mock.queries[1].values[0]).toBe(query.values[0]);
  });
  it("imports emails from CSV so saving can sync them into CRM", () => {
    const companies = parseProspectCsv('empresa,correos\nEmpresa real,"Ventas@example.com; contacto@example.com; invalid"');
    expect(companies[0].emails).toEqual(["ventas@example.com", "contacto@example.com"]);
    expect(companies[0].source).toContain("sin verificar");
  });
});
