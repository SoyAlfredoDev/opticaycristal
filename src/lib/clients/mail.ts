import "server-only";
import { enviarConResend } from "@/lib/mail/resend";
import { CONTACTO_EMAIL } from "@/lib/solicitudes/types";
import { LOGO_CID } from "@/lib/mail/templates";
export type ClientMail = { to: string; url: string; kind: "verify" | "reset" };
function escape(value: string) { return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!); }
export function clientEmailContent({ url, kind }: ClientMail) {
  const verify = kind === "verify";
  const title = verify ? "Verifica tu correo en Óptica & Cristal" : "Restablece tu contraseña de Óptica & Cristal";
  const action = verify ? "Verificar mi correo" : "Crear una nueva contraseña";
  const expiry = verify ? "24 horas" : "30 minutos";
  const text = `${title}\n\n${action}: ${url}\n\nEste enlace vence en ${expiry}. Si no solicitaste esta acción, ignora este mensaje. Nunca compartas tu contraseña ni este enlace.\n\nÓptica & Cristal\nHuérfanos 713, local 18, Santiago Centro\n${CONTACTO_EMAIL}`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f4f7fc;font:16px/1.6 Arial,sans-serif;color:#182944"><div style="max-width:560px;margin:24px auto;padding:30px;background:white"><img alt="Óptica &amp; Cristal" width="160" src="cid:${LOGO_CID}"><h1 style="font-size:24px">${title}</h1><p>Para continuar en tu espacio de cliente, confirma esta acción.</p><p><a href="${escape(url)}" style="display:inline-block;padding:14px 22px;background:#194fdf;border-radius:10px;color:white;text-decoration:none">${action}</a></p><p>El enlace vence en ${expiry}.</p><p style="font-size:14px">Si no solicitaste esta acción, ignora este mensaje. Nunca compartas tu contraseña ni este enlace.</p><hr><p style="font-size:13px">Óptica &amp; Cristal · Huérfanos 713, local 18, Santiago Centro<br>${CONTACTO_EMAIL}</p></div></body></html>`;
  return { title, html, text };
}
export async function sendClientMail(message: ClientMail) {
  const { title, html, text } = clientEmailContent(message);
  // Domain-level marketing tracking must not wrap password-reset or verification links.
  // Plain-text delivery does not contain HTML anchors or tracking pixels.
  const result = await enviarConResend({ to: message.to, subject: title, html, text, textOnly: true, replyTo: CONTACTO_EMAIL });
  if (!result.ok) throw new Error("No se pudo confirmar el envío del correo de seguridad.");
}
