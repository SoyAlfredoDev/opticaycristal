import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
import {
  senderEmail,
  replyTokens,
  plainReply,
  inboundDisposition,
  replyAddress,
} from "./crm-inbound";
describe("safe commercial response detection", () => {
  beforeEach(() => vi.unstubAllEnvs());
  it("correlates only recipient aliases on the configured domain", () => {
    const token = "12345678-1234-1234-1234-123456789abc";
    expect(
      replyTokens(
        [
          `reply.${token}@respuestas.example.invalid`,
          `reply.${token}@attacker.invalid`,
        ],
        "respuestas.example.invalid",
      ),
    ).toEqual([token]);
    expect(senderEmail("Equipo <Ventas@example.invalid>")).toBe(
      "ventas@example.invalid",
    );
  });
  it("quarantines spoofed senders and authentication failures for the executive", () => {
    expect(
      inboundDisposition(
        { from: "ventas@example.invalid", authentication: { dmarc: "pass" } },
        "ventas@example.invalid",
      ),
    ).toBe("new");
    expect(
      inboundDisposition(
        { from: "other@example.invalid", authentication: { dmarc: "pass" } },
        "ventas@example.invalid",
      ),
    ).toBe("quarantine");
    expect(
      inboundDisposition(
        { from: "ventas@example.invalid", authentication: { dmarc: "fail" } },
        "ventas@example.invalid",
      ),
    ).toBe("quarantine");
  });
  it("keeps autoreplies out of the interest funnel", () => {
    expect(
      inboundDisposition(
        {
          from: "ventas@example.invalid",
          authentication: { dmarc: "pass" },
          headers: { "Auto-Submitted": "auto-replied" },
        },
        "ventas@example.invalid",
      ),
    ).toBe("automatic");
  });
  it("extracts text and removes executable email HTML", () => {
    const text = plainReply({
      html: '<p>Quiero información</p><script>fetch("/send")</script><iframe src="https://attacker.invalid"></iframe>',
    });
    expect(text).toContain("Quiero información");
    expect(text).not.toContain("fetch");
    expect(text).not.toContain("iframe");
  });
  it("reads regular HTML when Resend marks inline images as data_uri", () => {
    expect(
      plainReply({
        html: '<p>Envíen la propuesta</p><img src="data:image/png;base64,aGVsbG8=">',
        html_format: "data_uri",
      }),
    ).toContain("Envíen la propuesta");
  });
  it("uses an alias only after receiving is configured", () => {
    vi.stubEnv("RADAR_MAIL_REPLY_TO", "contacto@example.invalid");
    expect(replyAddress("invalid")).toBe("contacto@example.invalid");
    vi.stubEnv("RADAR_INBOUND_READY", "true");
    vi.stubEnv("RADAR_INBOUND_DOMAIN", "respuestas.example.invalid");
    expect(replyAddress("12345678-1234-1234-1234-123456789abc")).toBe(
      "reply.12345678-1234-1234-1234-123456789abc@respuestas.example.invalid",
    );
  });
});
