import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ enabled: false, reconcileFails: false, queries: [] as string[] }));
vi.mock("./crm-store", () => ({ marketingConfiguration: () => ({ sendingEnabled: mock.enabled, missing: [] }), publicBase: () => "https://example.invalid" }));
vi.mock("./crm-schema", () => {
  const sql = Object.assign(async (strings: TemplateStringsArray) => {
    const q = strings.join("?"); mock.queries.push(q);
    if (q.includes("SELECT d.id FROM radar_crm_deliveries")) return [{ id: "delivery-test" }];
    if (q.includes("UPDATE radar_crm_deliveries d SET status='sending'")) return [{ id: "delivery-test", email: "person@example.invalid", campaign_id: "campaign-test", prospect_id: "prospect-test", company_name: "[Empresa de prueba]", token: "test-token", consent_evidence: "[Prueba]", subject: "Invitación", body: "Texto de prueba", variants: [{id:"v1",kind:"web",label:"Conversar",destination:""}], variant_id: "v1", template_id: "jornada" }];
    if (q.includes("INSERT INTO radar_crm_send_budget")) return [{ used: 1 }];
    if (q.includes("SELECT w.*") && mock.reconcileFails) throw Error("Simulated database interruption");
    return [];
  }, { transaction: async (queries: Promise<unknown>[]) => Promise.all(queries) });
  return { ensureCrmSchema: async () => {}, crmSql: () => sql };
});
import { dispatchCampaign, ingestWebhook, automationHint } from "./crm-mail";

describe("marketing delivery audit without real recipients", () => {
  beforeEach(() => {
    mock.enabled=false;mock.reconcileFails=false;mock.queries=[];
    vi.stubEnv("RADAR_MAIL_FROM", "Sender <sender@example.invalid>");
    vi.stubEnv("RADAR_MAIL_REPLY_TO", "sender@example.invalid");
    vi.stubEnv("RADAR_MAIL_COMPANY_ADDRESS", "[Dirección de prueba]");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: "provider-test" })));
  });
  it("blocks delivery when sending is disabled", async () => {
    await expect(dispatchCampaign("campaign-test")).rejects.toThrow("Envío no habilitado");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps an accepted delivery sent even if webhook reconciliation fails", async () => {
    mock.enabled=true;mock.reconcileFails=true;
    expect(await dispatchCampaign("campaign-test")).toMatchObject({ sent: 1, uncertain: 0 });
    expect(mock.queries.some(q=>q.includes("SET status='uncertain',error='No se confirmó"))).toBe(false);
    expect(mock.queries.find(q=>q.includes("UPDATE radar_crm_deliveries d SET status='sending'"))).toContain("c.status='subscribed'");
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect((init.headers as Record<string,string>)["Idempotency-Key"]).toBe("radar-delivery-test");
  });
  it("stores provider events idempotently and ignores unsupported events", async () => {
    await ingestWebhook("event-test", {type:"email.clicked",data:{email_id:"provider-test",click:{link:"https://example.invalid/r/test",userAgent:"Proofpoint scanner"}}});
    expect(mock.queries.find(q=>q.includes("INSERT INTO radar_crm_webhooks"))).toContain("ON CONFLICT(id) DO NOTHING");
    expect(await ingestWebhook("unsupported", {type:"other.event",data:{email_id:"provider-test"}})).toEqual({ignored:true});
    expect(automationHint("Proofpoint scanner")).toBe(true);
  });
});
