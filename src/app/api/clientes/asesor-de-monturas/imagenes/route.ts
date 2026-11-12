import { customerSession } from "@/lib/clients/auth";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
import { canUseFrameAdvisor } from "@/lib/frame-advisor/access";
import { normalizePhoto, editFramePhoto } from "@/lib/frame-advisor/image-provider";
import { finishFrameImage, purgeExpiredFrameImages, readFrameImages, reserveFrameImage } from "@/lib/frame-advisor/image-store";

export const runtime = "nodejs";
export const maxDuration = 180;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const enabled = () => process.env.CLIENT_FRAME_PHOTO_EDITS_ENABLED === "true" && !!process.env.OPENAI_API_KEY?.trim();

export async function GET(request: Request) {
  try {
    const session = await customerSession();
    if (!session) return privateJson({ error: "Inicia sesión." }, 401);
    if (!enabled() || !await canUseFrameAdvisor(session.user.id)) return privateJson({ error: "Asesor no disponible." }, 404);
    const id = new URL(request.url).searchParams.get("adviceId") ?? "";
    if (!uuid.test(id)) return privateJson({ error: "Solicitud no válida." }, 400);
    return privateJson({ images: await readFrameImages(session.user.id, id) });
  } catch { return privateJson({ error: "No pudimos recuperar las imágenes." }, 503); }
}

export async function POST(request: Request) {
  if (!sameClientOrigin(request)) return privateJson({ error: "Origen no permitido." }, 403);
  try {
    const session = await customerSession();
    if (!session) return privateJson({ error: "Inicia sesión." }, 401);
    if (!enabled() || !await canUseFrameAdvisor(session.user.id)) return privateJson({ error: "Asesor no disponible." }, 404);
    let data: Record<string, unknown>, photo: Buffer;
    try {
      data = await readClientBody(request, 2_850_000) as Record<string, unknown>;
      if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).some(key => !["adviceId","index","photo","consent"].includes(key)) || typeof data.adviceId !== "string" || !uuid.test(data.adviceId) || !Number.isInteger(data.index) || Number(data.index)<0 || Number(data.index)>2 || data.consent !== "photo-edit-v1") throw new Error("Invalid request");
      photo = await normalizePhoto(data.photo);
    } catch { return privateJson({ error: "Revisa la foto y autoriza su uso para crear tus propuestas." }, 400); }
    const id = data.adviceId as string, index = data.index as number, userId = session.user.id;
    await purgeExpiredFrameImages();
    const reservation = await reserveFrameImage(userId, id, index, photo);
    switch (reservation.state) {
      case "ready": return privateJson({ image: reservation.image.toString("base64"), state: "ready" });
      case "missing": return privateJson({ error: "Asesoría no encontrada." }, 404);
      case "expired": return privateJson({ error: "Esta asesoría ya venció. Crea una nueva cuando quieras." }, 410);
      case "mismatch": return privateJson({ error: "Usa la misma foto para las tres propuestas." }, 409);
      case "pending": return privateJson({ error: "Todavía estamos preparando tu propuesta.", retry: true }, 409);
      case "limit": return privateJson({ error: "Se alcanzó el límite de imágenes del piloto." }, 429);
      case "failed": return privateJson({ error: "Esta imagen no se pudo completar. Conservamos tus recomendaciones.", retry: false }, 503);
      case "reserved": {
        try {
          const image = await editFramePhoto(photo, reservation.suggestion);
          if (!await finishFrameImage(userId,id,index,image)) throw new Error("Image save failed");
          return privateJson({ image: image.toString("base64"), state: "ready" });
        } catch {
          await finishFrameImage(userId,id,index,null).catch(() => undefined);
          return privateJson({ error: "No pudimos completar esta imagen. Tus recomendaciones siguen disponibles.", retry: false }, 503);
        }
      }
    }
  } catch { return privateJson({ error: "No pudimos preparar la imagen. Inténtalo más tarde." }, 503); }
}
