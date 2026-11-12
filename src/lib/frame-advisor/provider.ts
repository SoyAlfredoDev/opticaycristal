import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";
import { adviceReference } from "./knowledge";
import { colors, shapes, type Profile, type Style, type Suggestion } from "./shared";

const resultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["shape", "colors", "reason"],
        properties: {
          shape: { type: "string", enum: shapes },
          colors: { type: "array", items: { type: "string", enum: colors }, minItems: 2, maxItems: 3 },
          reason: { type: "string", minLength: 15, maxLength: 160 },
        },
      },
    },
  },
} as const;

export function parseSuggestions(value: unknown): Suggestion[] {
  if (!value || typeof value !== "object" || !("suggestions" in value)) throw new Error("Invalid advice");
  const list = value.suggestions;
  if (!Array.isArray(list) || list.length !== 3) throw new Error("Invalid advice");
  const result: Suggestion[] = [];
  for (const item of list) {
    if (!item || !shapes.includes(item.shape) || result.some(other => other.shape === item.shape) ||
      !Array.isArray(item.colors) || item.colors.length < 2 || item.colors.length > 3 ||
      !item.colors.every((color: Suggestion["colors"][number]) => colors.includes(color)) ||
      new Set(item.colors).size !== item.colors.length ||
      typeof item.reason !== "string" || item.reason.trim().length < 15 || item.reason.trim().length > 160) {
      throw new Error("Invalid advice");
    }
    result.push({ shape: item.shape, colors: item.colors, reason: item.reason.trim() });
  }
  return result;
}

export function frameAdvisorProviderConfigured() {
  if (process.env.CLIENT_FRAME_ADVISOR_PROVIDER === "vercel") {
    return process.env.VERCEL === "1" || Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
  }
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

async function providerConfig() {
  const model = process.env.CLIENT_FRAME_ADVISOR_MODEL?.trim() || "gpt-5.4-mini";
  if (process.env.CLIENT_FRAME_ADVISOR_PROVIDER === "vercel") {
    return {
      url: "https://ai-gateway.vercel.sh/v1/responses",
      model: `openai/${model}`,
      token: process.env.AI_GATEWAY_API_KEY?.trim() || await getVercelOidcToken(),
    };
  }
  return { url: "https://api.openai.com/v1/responses", model, token: process.env.OPENAI_API_KEY?.trim() };
}

export async function generateAdvice(profile: Profile, style: Style) {
  const provider = await providerConfig();
  if (!provider.token) throw new Error("Provider not configured");
  const response = await fetch(provider.url, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(18_000),
    headers: { Authorization: `Bearer ${provider.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      store: false,
      max_output_tokens: 550,
      reasoning: { effort: "none" },
      instructions: [
        "Asesora sobre estilo de monturas para una óptica chilena. Usa solo los criterios de la biblioteca proporcionada.",
        "Devuelve tres formas distintas, dos o tres colores distintos por forma y un motivo sencillo en español por opción.",
        "Trata el efecto como una preferencia estética. No describas el rostro como un problema ni infieras atributos sensibles.",
        "Habla solo de referencias de estilo. No inventes modelos, marcas, precios, disponibilidad, tallas ni recomendaciones clínicas.",
        "La razón debe ser una frase sin Markdown ni enlaces, con un máximo de 160 caracteres. Evita promesas de ajuste.",
      ].join(" "),
      input: JSON.stringify({ perfil: profile, preferencia: style, biblioteca: adviceReference(profile, style) }),
      text: { format: { type: "json_schema", name: "frame_style_advice", strict: true, schema: resultSchema } },
    }),
  });
  if (!response.ok) {
    console.warn("Asesor de monturas: proveedor rechazó la solicitud", response.status);
    throw new Error("Provider unavailable");
  }
  const data = await response.json() as {
    status?: string;
    output?: { type?: string; content?: { type?: string; text?: string }[] }[];
  };
  const message = data.output?.find(item => item.type === "message");
  const answer = message?.content?.find(item => item.type === "output_text")?.text;
  if (data.status !== "completed" || !answer) throw new Error("Provider returned incomplete advice");
  return parseSuggestions(JSON.parse(answer));
}
