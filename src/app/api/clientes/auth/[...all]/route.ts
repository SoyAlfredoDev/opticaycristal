import { clientAuth } from "@/lib/clients/auth";
import { allowClientRegistration, privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
export const runtime = "nodejs";
const allowed = new Set(["sign-in/email", "sign-out", "get-session", "request-password-reset", "reset-password", "send-verification-email", "verify-email"]);
async function handle(request: Request) {
  const path = new URL(request.url).pathname.replace(/^\/api\/clientes\/auth\//, "");
  const resetCallback = request.method === "GET" && /^reset-password\/[A-Za-z0-9_-]+$/.test(path);
  if (!allowed.has(path) && !resetCallback) return privateJson({ error: "Acción no disponible." }, 404);
  try {
    if (request.method === "POST") {
      if (!sameClientOrigin(request)) return privateJson({ error: "Origen no permitido." }, 403);
      await readClientBody(request.clone());
    }
    if (path === "send-verification-email") {
      const session = await clientAuth().api.getSession({ headers: request.headers });
      if (!session) return privateJson({ error: "Inicia sesión para verificar tu correo." }, 401);
      if (!await allowClientRegistration(request, session.user.email)) return privateJson({ error: "Espera antes de solicitar otro correo." }, 429);
      const forwardedHeaders = new Headers(request.headers);
      forwardedHeaders.delete("content-length");
      request = new Request(request.url, { method: "POST", headers: forwardedHeaders, body: JSON.stringify({ email: session.user.email, callbackURL: "/mi-cuenta/perfil" }) });
    }
    const response = await clientAuth().handler(request);
    response.headers.set("Cache-Control", "no-store, private");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch { return privateJson({ error: "El acceso no está disponible temporalmente. Inténtalo más tarde." }, 503); }
}
export const GET = handle;
export const POST = handle;
