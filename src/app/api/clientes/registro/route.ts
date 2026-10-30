import { hashPassword } from "better-auth/crypto";
import { registrationExists, registrationWelcome } from "@/lib/clients/registration";
import { clientAuth } from "@/lib/clients/auth";
import { allowClientRegistration, privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
import { clientFingerprint, protectClientValue } from "@/lib/clients/privacy";
import { parseRegistration } from "@/lib/clients/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameClientOrigin(request)) return privateJson({ error: "Origen no permitido." }, 403);
  let data;
  try { data = parseRegistration(await readClientBody(request)); }
  catch (error) { return privateJson({ error: error instanceof Error ? error.message : "Revisa los datos." }, 400); }
  // The same public tier information is returned for new and duplicate registrations.
  const neutral = async () => privateJson({ ok: true, message: "¡Gracias por sumarte a Óptica & Cristal! Revisa tu correo para continuar. Si ya tienes cuenta, ingresa para ver tu información.", welcome: await registrationWelcome() });
  const rutHash = clientFingerprint(data.rut, "rut");
  try {
    if (!await allowClientRegistration(request, data.email)) return privateJson({ error: "Demasiados intentos. Inténtalo más tarde." }, 429);
    if (await registrationExists(data.email, rutHash)) { await hashPassword(data.password); return await neutral(); }
    const response = await clientAuth().api.signUpEmail({ body: {
      name: `${data.firstName} ${data.lastName}`, email: data.email, password: data.password,
      firstName: data.firstName, lastName: data.lastName, rutCipher: protectClientValue(data.rut, "rut"), rutHash, whatsappCipher: protectClientValue(data.whatsapp, "whatsapp"),
      callbackURL: "/mi-cuenta/perfil?correo=verificado",
    }, asResponse: true });
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { code?: string } | null;
      if (result?.code !== "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" && result?.code !== "USER_ALREADY_EXISTS" && !await registrationExists(data.email,rutHash)) throw new Error("Registration unavailable");
    }
    return await neutral();
  } catch {
    try { if (await registrationExists(data.email,rutHash)) return await neutral(); } catch {}
    return privateJson({ error: "No pudimos completar el registro. Si ya tienes cuenta, recupera tu acceso. Si el problema continúa, contacta a la óptica." }, 503);
  }
}
