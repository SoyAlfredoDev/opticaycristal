// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ pool: null as unknown, user: null as string | null }));
vi.mock("@/lib/clients/db", () => ({ clientPool: () => state.pool, clientTable: (name: string) => `"${name}"` }));
vi.mock("@/lib/clients/auth", () => ({ customerSession: async () => state.user ? { user: { id: state.user } } : null }));

vi.mock("@vercel/oidc", () => ({ getVercelOidcToken: async () => "synthetic-oidc-test-only" }));

import { GET, POST } from "@/app/api/clientes/asesor-de-monturas/route";
import { frameAdviceMetrics } from "./store";
import type { Suggestion } from "./shared";

const db = new PGlite();
const connection = {
  query: async (sql: string, params?: unknown[]) => {
    const result = await db.query(sql, params);
    return { ...result, rowCount: result.affectedRows ?? result.rows.length };
  },
  release() {},
};
state.pool = { query: connection.query, connect: async () => connection };

const origin = "https://opticaycristal.cl";
const consult = (requestId = randomUUID()) => ({ action: "consult", requestId, style: "clásico", profile: "suave" });
const post = (body: object, from = origin) => POST(new Request(`${origin}/api/clientes/asesor-de-monturas`, {
  method: "POST", headers: { Origin: from, "Content-Type": "application/json" }, body: JSON.stringify(body),
}));
const suggestions: Suggestion[] = [
  { shape: "cuadrada", colors: ["negro", "carey"], reason: "La línea definida aporta un contraste clásico." },
  { shape: "redonda", colors: ["dorado", "plata"], reason: "El aro curvo y fino da una impresión suave." },
  { shape: "panto", colors: ["vino", "ámbar"], reason: "La base redondeada aporta una opción de estilo retro." },
];
const providerResponse = (options = suggestions) => new Response(JSON.stringify({
  status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ suggestions: options }) }] }],
}));

beforeAll(async () => {
  await db.exec("CREATE TABLE oc_client_user(id text PRIMARY KEY); INSERT INTO oc_client_user VALUES ('test-a'),('test-b');");
  const migration = await readFile("sql/clients/025-frame-advisor.sql", "utf8");
  await db.exec(migration);
  await db.exec(migration);
  await db.exec(await readFile("sql/clients/027-frame-advisor-reset.sql", "utf8"));
  vi.stubEnv("CLIENT_APP_URL", origin);
  vi.stubEnv("CLIENT_DATA_KEY", randomBytes(32).toString("base64"));
  vi.stubEnv("CLIENT_FRAME_ADVISOR_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "synthetic-unit-test-only");
});
beforeEach(async () => {
  await db.exec("TRUNCATE oc_client_frame_advice, oc_client_frame_budget, oc_client_frame_pilot; INSERT INTO oc_client_frame_pilot VALUES ('test-a'),('test-b');");
  state.user = "test-a";
  vi.stubEnv("CLIENT_FRAME_ADVISOR_PROVIDER", "openai");
  vi.stubEnv("CLIENT_FRAME_ADVISOR_MODEL", undefined);
  vi.stubEnv("OPENAI_API_KEY", "synthetic-unit-test-only");
  vi.stubGlobal("fetch", vi.fn(async () => providerResponse()));
});
afterAll(async () => {
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
  await db.close();
});

it("permite únicamente solicitudes de cliente y rechaza fotos o IDs enviados en el cuerpo", async () => {
  state.user = null;
  expect((await GET()).status).toBe(401);
  expect((await post(consult())).status).toBe(401);
  state.user = "test-a";
  expect((await post(consult(), "https://example.invalid")).status).toBe(403);
  expect((await post({ ...consult(), photo: "data:image/jpeg;base64,example" })).status).toBe(400);
  expect((await post({ ...consult(), customerId: "test-b" })).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});

it("consulta una vez, conserva la respuesta y admite una sola calificación de su dueño", async () => {
  const input = consult();
  const first = await post(input);
  expect(first.status).toBe(200);
  expect(first.headers.get("Cache-Control")).toContain("no-store");
  const { advice } = await first.json();
  expect(advice.suggestions).toEqual(suggestions);
  expect(await (await post(input)).json()).toEqual({ advice });
  expect(await (await GET()).json()).toEqual({ advice });
  expect(fetch).toHaveBeenCalledTimes(1);
  const providerCall = vi.mocked(fetch).mock.calls[0];
  const payload = JSON.parse(String(providerCall[1]?.body));
  expect(providerCall[0]).toBe("https://api.openai.com/v1/responses");
  expect(payload).toMatchObject({ model: "gpt-6-luna", store: false, max_output_tokens: 650 });
  expect(payload.input).toContain("biblioteca");
  expect(payload.instructions).toContain("proporciones aproximadas");
  expect(payload.input).not.toContain("test-a");

  const vote = { action: "rate", id: advice.id, rating: 5, feedback: "Buenas opciones." };
  state.user = "test-b";
  expect(await (await GET()).json()).toEqual({ advice: null });
  expect((await post(vote)).status).toBe(404);
  state.user = "test-a";
  expect(await (await post(vote)).json()).toEqual({ rating: 5 });
  expect(await (await post({ ...vote, rating: 1 })).json()).toEqual({ rating: 5 });
  expect((await db.query("SELECT feedback FROM oc_client_frame_advice")).rows[0]).not.toEqual({ feedback: vote.feedback });
  expect(await frameAdviceMetrics()).toMatchObject({ used: 1, completed: 1, rated: 1, average: 5, feedback: [{ rating: 5, feedback: vote.feedback }] });
});

it("admite explicaciones más detalladas y evita inferir rasgos sin foto", async () => {
  const reason = "Si buscas un look clásico, te sugeriría una montura cuadrada: sus lados rectos le dan una línea definida que puedes combinar con facilidad. En carey, el acabado añade textura y conserva ese aire clásico.";
  vi.mocked(fetch).mockImplementation(async () => providerResponse([{ ...suggestions[0], reason }, ...suggestions.slice(1)]));
  const response = await post({ ...consult(), profile: "sin-foto" });
  expect(response.status).toBe(200);
  expect((await response.json()).advice.suggestions[0].reason).toBe(reason);
  const payload = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
  expect(payload.instructions).toContain("No tienes foto ni información sobre su rostro");
  expect(payload.instructions).not.toContain("rostro de proporciones alargadas");
});

it("aplica cupo diario por cliente y cupo mensual compartido", async () => {
  for (let i = 0; i < 3; i++) expect((await post(consult())).status).toBe(200);
  expect((await post(consult())).status).toBe(429);
  expect(fetch).toHaveBeenCalledTimes(3);
  await db.exec("UPDATE oc_client_frame_budget SET used=299");
  state.user = "test-b";
  expect((await post(consult())).status).toBe(200);
  expect((await post(consult())).status).toBe(429);
  expect(fetch).toHaveBeenCalledTimes(4);
});

it("rechaza respuestas del proveedor con monturas repetidas", async () => {
  vi.mocked(fetch).mockImplementation(async () => providerResponse([suggestions[0], suggestions[0], suggestions[2]]));
  const input = consult();
  expect((await post(input)).status).toBe(503);
  expect((await post(input)).status).toBe(503);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(await (await GET()).json()).toEqual({ advice: null });
});

it("una consulta en curso bloquea duplicados y nuevas claves hasta terminar", async () => {
  const started = Promise.withResolvers<void>();
  const provider = Promise.withResolvers<Response>();
  vi.mocked(fetch).mockImplementation(() => {
    started.resolve();
    return provider.promise;
  });
  const input = consult();
  const pending = post(input);
  await started.promise;
  expect((await post(input)).status).toBe(409);
  expect((await post(consult())).status).toBe(409);
  expect(fetch).toHaveBeenCalledTimes(1);
  provider.resolve(providerResponse());
  expect((await pending).status).toBe(200);
  expect((await post(input)).status).toBe(200);
});

it("impide a clientes fuera del piloto leer, consultar o calificar aunque tengan sesión", async () => {
  await db.exec("DELETE FROM oc_client_frame_pilot WHERE user_id='test-b'");
  state.user = "test-b";
  expect((await GET()).status).toBe(404);
  expect((await post(consult())).status).toBe(404);
  expect((await post({ action: "rate", id: randomUUID(), rating: 5, feedback: "" })).status).toBe(404);
  expect(fetch).not.toHaveBeenCalled();
  expect(await frameAdviceMetrics()).toMatchObject({ used: null, completed: 0, rated: 0 });
});

it("usa AI Gateway con la identidad del proyecto y el mismo modelo estructurado", async () => {
  vi.stubEnv("CLIENT_FRAME_ADVISOR_PROVIDER", "vercel");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("AI_GATEWAY_API_KEY", "");
  vi.stubEnv("OPENAI_API_KEY", "");
  expect((await post(consult())).status).toBe(200);
  const [url, options] = vi.mocked(fetch).mock.calls[0];
  expect(url).toBe("https://ai-gateway.vercel.sh/v1/responses");
  expect(options?.headers).toMatchObject({ Authorization: "Bearer synthetic-oidc-test-only" });
  expect(JSON.parse(String(options?.body))).toMatchObject({
    model: "openai/gpt-5.4-mini", store: false, text: { format: { type: "json_schema", strict: true } },
  });
});

it("habilita a un cliente registrado fuera del piloto y conserva el requisito de sesión", async () => {
  await db.exec("DELETE FROM oc_client_frame_pilot WHERE user_id='test-b'");
  vi.stubEnv("CLIENT_FRAME_ADVISOR_ALL_CUSTOMERS", "true");
  try {
    state.user = "test-b";
    const response = await post(consult());
    expect(response.status).toBe(200);
    expect((await response.json()).advice.suggestions).toHaveLength(3);
    state.user = null;
    expect((await post(consult())).status).toBe(401);
  } finally {
    vi.stubEnv("CLIENT_FRAME_ADVISOR_ALL_CUSTOMERS", undefined);
  }
});

it("reinicia el cupo diario sin borrar historial ni devolver presupuesto mensual", async () => {
  for (let i = 0; i < 3; i++) expect((await post(consult())).status).toBe(200);
  expect((await post(consult())).status).toBe(429);
  await db.exec("UPDATE oc_client_frame_pilot SET daily_reset_at=now() WHERE user_id='test-a'");
  expect((await post(consult())).status).toBe(200);
  expect(await frameAdviceMetrics()).toMatchObject({ used: 4, completed: 4 });
});
