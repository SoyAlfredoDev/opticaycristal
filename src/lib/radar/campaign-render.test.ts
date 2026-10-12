import { describe, expect, it } from "vitest";
import { campaignTemplates } from "./campaign-templates";
import { renderCampaignEmail } from "./campaign-render";

describe("corporate campaign formats", () => {
  for (const t of campaignTemplates) it(`renders ${t.id} with branding, one main CTA and accessible unsubscribe`, () => {
    const mail = renderCampaignEmail({ company: "[Empresa de prueba]", subject: t.subject, body: t.body, templateId: t.id,
      variant: { id: "v1", kind: "web", label: t.cta, destination: "" }, ctaUrl: "https://example.invalid/r/test",
      unsubscribeUrl: "https://example.invalid/unsubscribe/test", address: "[Dirección de prueba]", consent: "[Evidencia de prueba]" });
    expect(mail.html.match(/data-primary-cta=/g)).toHaveLength(1);
    expect(mail.html).toContain('lang="es"');
    expect(mail.html).toContain('role="presentation"');
    expect(mail.html).toContain("oc-logo-oficial.png");
    expect(mail.html).toContain("#6B1F3A");
    expect(mail.html).toContain("Darme de baja");
    expect(mail.html).toContain("https://opticaycristal.cl/privacidad");
    expect(mail.text).toContain("Darme de baja: https://example.invalid/unsubscribe/test");
    expect(mail.html).not.toContain("{{empresa}}");
    expect(mail.html).not.toContain("[Evidencia de prueba]");
    expect(mail.html.length).toBeLessThan(100_000);
  });
  it("escapes company names and message content instead of executing HTML", () => {
    const mail = renderCampaignEmail({ company: '<img src=x onerror=alert(1)>', subject: 'Invitación {{empresa}}\r\nBcc: x',
      body: '<script>alert(1)</script> {{empresa}}', variant: { id: "v1", kind: "web", label: "<CTA>", destination: "" },
      ctaUrl: "#preview", unsubscribeUrl: "#unsubscribe", address: "<dirección>", consent: "" });
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).toContain("&lt;CTA&gt;");
  });
});
