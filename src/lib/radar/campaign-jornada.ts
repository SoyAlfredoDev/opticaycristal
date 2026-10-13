import type { CampaignEmailInput } from "./campaign-render";
import { campaignTemplate } from "./campaign-templates";
import { escapeEmail } from "./email-escape";

export function renderJornadaCampaign(input: CampaignEmailInput) {
  const template = campaignTemplate(input.templateId);
  const subject = input.subject
    .replaceAll("{{empresa}}", input.company)
    .replace(/[\r\n]+/g, " ")
    .slice(0, 250);
  const body = input.body.replaceAll("{{empresa}}", input.company);
  const inline = (value: string) =>
    escapeEmail(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const blocks = body
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((line) => line.startsWith("- ")))
        return `<ul style="margin:0 0 22px;padding-left:22px">${lines.map((line) => `<li style="margin-bottom:10px">${inline(line.slice(2))}</li>`).join("")}</ul>`;
      return `<p style="margin:0 0 18px">${inline(block).replaceAll("\n", "<br>")}</p>`;
    })
    .join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeEmail(subject)}</title></head><body style="margin:0;background:#FBF7F2;color:#242020">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escapeEmail(template.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #E9D8C8">
<tr><td style="padding:24px 26px"><img src="https://opticaycristal.cl/images/home/oc-logo-oficial.png" width="140" alt="Óptica &amp; Cristal" style="display:block;width:140px;height:auto;border:0"></td></tr>
<tr><td style="padding:0"><img src="https://opticaycristal.cl/images/email/oc-chequeo-visual-header-v01.jpg" width="600" height="150" alt="Fotografía referencial: profesional frente a una tabla de evaluación visual" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>
<tr><td style="padding:16px 26px;background:#285D45;color:#ffffff;font:bold 17px/1.5 Arial,sans-serif;text-align:center">Regala a tu equipo un chequeo visual 100% gratuito.</td></tr>
<tr><td style="padding:26px;font:16px/1.7 Arial,sans-serif"><h1 style="margin:0 0 24px;color:#6B1F3A;font:500 34px/1.2 Georgia,serif">${escapeEmail(template.headline)}</h1>
${blocks}
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#6B1F3A" style="border-radius:4px"><a href="${escapeEmail(input.ctaUrl)}" data-primary-cta="true" style="display:inline-block;padding:15px 20px;color:#ffffff;background:#6B1F3A;border:1px solid #6B1F3A;border-radius:4px;font:bold 15px/1.5 Arial,sans-serif;text-decoration:none">${escapeEmail(input.variant.label)}</a></td></tr></table>
<p style="margin:26px 0 0">Saludos cordiales,<br><strong>Alfredo Hurtado</strong><br><span style="color:#62565A;font-size:14px">Encargado comercial · Óptica &amp; Cristal</span></p></td></tr>
<tr><td style="padding:22px 26px;background:#FBF7F2;border-top:1px solid #E9D8C8;font:12px/1.8 Arial,sans-serif;color:#62565A"><a href="https://opticaycristal.cl/" style="color:#6B1F3A">Conozcan nuestra óptica · opticaycristal.cl</a><br>${escapeEmail(input.address)}<br>WhatsApp: +56 9 2245 2080 · <a href="https://www.instagram.com/opticaycristal.cl/" style="color:#6B1F3A">Instagram</a><p style="margin:14px 0 6px">Invitación comercial de Óptica &amp; Cristal. Puedes dejar de recibir estos mensajes desde el enlace de baja.</p><a href="https://opticaycristal.cl/privacidad" style="color:#62565A">Privacidad</a> · <a href="${escapeEmail(input.unsubscribeUrl)}" style="color:#62565A">Darme de baja</a><p style="margin:12px 0 0">© ${new Date().getUTCFullYear()} Óptica &amp; Cristal. Todos los derechos reservados.</p></td></tr>
</table></td></tr></table></body></html>`;
  const text = `Óptica & Cristal\nRegala a tu equipo un chequeo visual 100% gratuito.\nVer bien. Sentirse bien.\n\n${body.replaceAll("**", "")}\n\n${input.variant.label}: ${input.ctaUrl}\n\nAlfredo Hurtado\nEncargado comercial · Óptica & Cristal\n${input.address}\nhttps://opticaycristal.cl/\nWhatsApp: +56 9 2245 2080\nInstagram: https://www.instagram.com/opticaycristal.cl/\nInvitación comercial de Óptica & Cristal. Puedes darte de baja en el enlace siguiente.\nDarme de baja: ${input.unsubscribeUrl}\nPrivacidad: https://opticaycristal.cl/privacidad`;
  return { subject, html, text };
}
