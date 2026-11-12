import { customerSession } from "@/lib/clients/auth";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
import { generateAdvice } from "@/lib/frame-advisor/provider";
import { canUseFrameAdvisor } from "@/lib/frame-advisor/access";
import { profiles, styles, type Profile, type Style } from "@/lib/frame-advisor/shared";
import { finishAdvice, lastAdvice, rateAdvice, reserveAdvice } from "@/lib/frame-advisor/store";

export const runtime = "nodejs";
export const maxDuration = 30;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const unavailable = () => privateJson({ error: "El asesor no está disponible por el momento." }, 503);

export async function GET() {
  try {
    const session = await customerSession();
    if (!session) return privateJson({ error: "Inicia sesión." }, 401);
    if (!await canUseFrameAdvisor(session.user.id)) return privateJson({ error: "Asesor no disponible." }, 404);
    return privateJson({ advice: await lastAdvice(session.user.id) });
  } catch {
    return unavailable();
  }
}

export async function POST(request: Request) {
  if (!sameClientOrigin(request)) return privateJson({ error: "Origen no permitido." }, 403);
  try {
    const session = await customerSession();
    if (!session) return privateJson({ error: "Inicia sesión." }, 401);
    if (!await canUseFrameAdvisor(session.user.id)) return privateJson({ error: "Asesor no disponible." }, 404);
    let body: unknown;
    try {
      body = await readClientBody(request, 2500);
    } catch {
      return privateJson({ error: "Solicitud no válida." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return privateJson({ error: "Solicitud no válida." }, 400);
    const data = body as Record<string, unknown>;
    const userId = session.user.id;

    if (data.action === "rate") {
      if (Object.keys(data).some(key => !["action", "id", "rating", "feedback"].includes(key)) ||
        typeof data.id !== "string" || !uuid.test(data.id) || typeof data.rating !== "number" ||
        !Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5 ||
        typeof data.feedback !== "string" || data.feedback.length > 400) {
        return privateJson({ error: "Revisa la calificación y el comentario." }, 400);
      }
      const rating = await rateAdvice(userId, data.id, data.rating, data.feedback.trim());
      if (!rating) return privateJson({ error: "Asesoría no encontrada." }, 404);
      return privateJson({ rating });
    }

    if (data.action !== "consult" || Object.keys(data).some(key => !["action", "requestId", "style", "profile"].includes(key)) ||
      typeof data.requestId !== "string" || !uuid.test(data.requestId) ||
      !styles.includes(data.style as Style) || !profiles.includes(data.profile as Profile)) {
      return privateJson({ error: "Revisa los datos de la asesoría." }, 400);
    }
    const reservation = await reserveAdvice(userId, data.requestId);
    switch (reservation.status) {
      case "ready": return privateJson({ advice: reservation.advice });
      case "pending": return privateJson({ error: "Tu asesoría se está preparando. Vuelve a intentarlo en unos segundos.", retry: true }, 409);
      case "daily-limit": return privateJson({ error: "Usaste tus 3 asesorías de hoy. Puedes volver mañana." }, 429);
      case "monthly-limit": return privateJson({ error: "Las asesorías de este mes ya se agotaron." }, 429);
      case "failed": return privateJson({ error: "No pudimos terminar esa asesoría. Inténtalo de nuevo." }, 503);
      case "reserved": {
        try {
          const suggestions = await generateAdvice(data.profile as Profile, data.style as Style);
          if (!await finishAdvice(userId, reservation.id, suggestions)) return unavailable();
          return privateJson({ advice: { id: reservation.id, suggestions, rating: null } });
        } catch {
          await finishAdvice(userId, reservation.id, null).catch(() => undefined);
          return privateJson({ error: "No pudimos preparar la asesoría. Inténtalo de nuevo." }, 503);
        }
      }
    }
  } catch {
    return unavailable();
  }
}
