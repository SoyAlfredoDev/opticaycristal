import { RadarApiError } from "./api";
import type { CampaignVariant } from "./crm-model";
export function requiredText(
  body: Record<string, unknown>,
  key: string,
  max = 200,
) {
  const value = body[key];
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new RadarApiError(
      `Campo ${key} requerido (máximo ${max} caracteres).`,
    );
  return value.trim();
}
export function optionalText(
  body: Record<string, unknown>,
  key: string,
  max = 200,
) {
  if (body[key] === undefined || body[key] === null || body[key] === "")
    return "";
  return requiredText(body, key, max);
}
export function enumText(
  body: Record<string, unknown>,
  key: string,
  values: readonly string[],
) {
  const value = requiredText(body, key);
  if (!values.includes(value))
    throw new RadarApiError(`Valor inválido para ${key}.`);
  return value;
}
export function emailAddress(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email))
    throw new RadarApiError("Correo inválido.");
  return email;
}
export function dateValue(value: unknown, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new RadarApiError("Selecciona fecha y hora.");
    return null;
  }
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    throw new RadarApiError("Fecha inválida.");
  return new Date(value).toISOString();
}
export function campaignVariants(value: unknown): CampaignVariant[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3)
    throw new RadarApiError("Define de una a tres variantes de CTA.");
  const result = value.map((v, index) => {
    if (!v || typeof v !== "object")
      throw new RadarApiError("Variante inválida.");
    const kind = enumText(v, "kind", [
      "web",
      "whatsapp",
      "email",
    ]) as CampaignVariant["kind"];
    const label = requiredText(v, "label", 80),
      destination = optionalText(v, "destination", 500);
    if (kind === "web" && destination)
      throw new RadarApiError(
        "El CTA web utiliza la página de convenios con atribución del Radar.",
      );
    if (
      kind === "whatsapp" &&
      !/^https:\/\/wa\.me\/\d{8,15}(\?text=[^\s]*)?$/.test(destination)
    )
      throw new RadarApiError(
        "WhatsApp requiere https://wa.me/número (con código de país).",
      );
    if (
      kind === "email" &&
      !/^mailto:[^\s?]+(?:\?subject=[^\s]*)?$/.test(destination)
    )
      throw new RadarApiError("El CTA correo requiere mailto:correo@dominio.");
    if (kind === "email") emailAddress(destination.slice(7).split("?")[0]);
    return { id: `v${index + 1}`, kind, label, destination };
  });
  if (new Set(result.map((v) => v.kind)).size !== result.length)
    throw new RadarApiError(
      "Usa tipos de CTA diferentes para comparar las variantes.",
    );
  return result;
}
export function escapeEmail(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
