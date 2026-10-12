import { renderJornadaCampaign } from "./campaign-jornada";
import { campaignTemplate } from "./campaign-templates";
import { escapeEmail } from "./email-escape";
import type { CampaignVariant } from "./crm-model";

export type CampaignEmailInput = {
  company: string; subject: string; body: string; variant: CampaignVariant;
  ctaUrl: string; unsubscribeUrl: string; address: string; consent: string;
  templateId?: string;
};

export function renderCampaignEmail(input: CampaignEmailInput) {
  const template = campaignTemplate(input.templateId);
  if (template.id === "jornada") return renderJornadaCampaign(input);
  const e = escapeEmail;
  const subject = input.subject.replaceAll("{{empresa}}", input.company).replace(/[\r\n]+/g, " ").slice(0, 250);
  const body = input.body.replaceAll("{{empresa}}", input.company);
  const wine = "#6B1F3A", ivory = "#FBF7F2", ink = "#242020";
  const paragraphs = body.split(/\n\s*\n/).map(p => `<p style="margin:0 0 18px;font-family:'DM Sans',Arial,sans-serif;font-size:16px;line-height:1.7;color:${ink}">${e(p).replaceAll("\n", "<br>")}</p>`).join("");
  const highlights = template.highlights.map((h, i) => `<tr><td style="padding:11px 16px;border-bottom:1px solid #E9D8C8;font:14px/1.6 Arial,sans-serif;color:${ink}"><span style="color:${wine};font-weight:bold">0${i + 1}</span>&nbsp;&nbsp;${e(h)}</td></tr>`).join("");
  const year = new Date().getUTCFullYear();
  const html = `<!doctype html><html lang="es" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:${ivory};color:${ink}">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${e(template.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${ivory}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #E9D8C8">
<tr><td style="padding:28px 28px 22px;border-top:5px solid ${wine}"><img src="https://opticaycristal.cl/images/home/oc-logo-oficial.png" width="156" alt="Óptica &amp; Cristal" style="display:block;width:156px;max-width:100%;height:auto;border:0"><p style="margin:14px 0 0;font:12px/1.6 Arial,sans-serif;color:#62565A">Tu mirada, nuestra prioridad</p></td></tr>
<tr><td style="padding:30px 28px;background:#E9D8C8;color:#421326"><p style="margin:0 0 12px;font:bold 11px/1.6 Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase">${e(template.eyebrow)}</p><h1 style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;font-weight:500;line-height:1.2">${e(template.headline)}</h1></td></tr>
<tr><td style="padding:28px 28px 10px">${paragraphs}</td></tr>
<tr><td style="padding:0 28px 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${ivory}">${highlights}</table></td></tr>
<tr><td style="padding:0 28px 28px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${wine}" style="border-radius:4px;text-align:center"><a data-primary-cta="true" href="${e(input.ctaUrl)}" style="display:inline-block;padding:16px 20px;border:1px solid ${wine};border-radius:4px;background:${wine};color:#ffffff;font:bold 15px/1.5 Arial,sans-serif;text-decoration:none;mso-padding-alt:0;text-underline-color:${wine}">${e(input.variant.label)}</a></td></tr></table><p style="margin:14px 0 0;font:12px/1.7 Arial,sans-serif;color:#62565A">Una solicitud de información no firma un contrato ni confirma una reserva.</p></td></tr>
<tr><td style="padding:24px 28px;background:${ivory};border-top:1px solid #E9D8C8;font:12px/1.8 Arial,sans-serif;color:#62565A"><p style="margin:0 0 8px"><strong>Óptica &amp; Cristal</strong><br>${e(input.address)}</p><p style="margin:0 0 14px"><a href="https://opticaycristal.cl" style="color:${wine}">www.opticaycristal.cl</a> · <a href="https://www.instagram.com/opticaycristal.cl/" style="color:${wine}">Instagram</a><br>WhatsApp: +56 9 2245 2080 · contacto@opticaycristal.cl</p><p style="margin:0 0 8px">Recibes esta invitación porque autorizaste comunicaciones comerciales de Óptica &amp; Cristal.</p><a href="${e(input.unsubscribeUrl)}" style="color:#62565A;text-decoration:underline">Darme de baja</a> · <a href="https://opticaycristal.cl/privacidad" style="color:#62565A">Privacidad</a><p style="margin:12px 0 0">© ${year} Óptica &amp; Cristal. Todos los derechos reservados.</p></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html, text: `Óptica & Cristal · Tu mirada, nuestra prioridad\n\n${subject}\n\n${body}\n\n${input.variant.label}: ${input.ctaUrl}\n\nSolicitar información no firma un contrato ni confirma una reserva.\nÓptica & Cristal · ${input.address}\nWeb: https://opticaycristal.cl\nInstagram: @opticaycristal.cl\nWhatsApp: +56 9 2245 2080\nRecibes este mensaje por tu autorización de comunicaciones comerciales.\nDarme de baja: ${input.unsubscribeUrl}\nPrivacidad: https://opticaycristal.cl/privacidad\n© ${year} Óptica & Cristal.` };
}
