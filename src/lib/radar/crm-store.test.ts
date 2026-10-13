import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ blocked: false, queries: [] as { text: string; values: unknown[] }[] }));
vi.mock("./db", () => ({ getProspect: async () => ({ id: "company-test" }) }));
vi.mock("./crm-schema", () => ({
  ensureCrmSchema: async () => {},
  crmSql: () => async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    mock.queries.push({ text, values });
    if (text.startsWith("SELECT 1 FROM radar_crm_suppressions")) return mock.blocked ? [{}] : [];
    if (text.startsWith("SELECT id FROM radar_crm_contacts")) return [{ id: "contact-test" }];
    return [];
  },
}));
import { crmAction } from "./crm-store";

describe("CRM contact registration without evidence forms", () => {
  beforeEach(() => { mock.blocked = false; mock.queries = []; });
  it("accepts an email without authorization checkbox, date or evidence", async () => {
    await expect(crmAction({ action: "contact", prospectId: "company-test", email: "ventas@example.com" }, "admin")).resolves.toEqual({ id: "contact-test" });
    const insert = mock.queries.find(query => query.text.startsWith("WITH added"))!;
    expect(insert.values).toContain("active");
    expect(insert.text).not.toContain("consent_evidence");
    expect(insert.text).not.toContain("consented_at");
  });
  it("keeps suppressed emails unsubscribed even when registered again", async () => {
    mock.blocked = true;
    await crmAction({ action: "contact", prospectId: "company-test", email: "ventas@example.com" }, "admin");
    const insert = mock.queries.find(query => query.text.startsWith("WITH added"))!;
    expect(insert.values).toContain("unsubscribed");
    expect(insert.text).toContain("radar_crm_contacts.status='unsubscribed'");
  });
});
