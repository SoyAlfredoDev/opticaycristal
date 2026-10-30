import "server-only";
import { enviarConResend } from "@/lib/mail/resend";
import { CONTACTO_EMAIL } from "@/lib/solicitudes/types";
import { LOGO_CID } from "@/lib/mail/templates";
export type ClientMail = { to: string; url: string; kind: "verify" | "reset" };
export const CLIENT_MAIL_COMPANY={name:"Óptica y Cristal Limitada",rut:"77.068.257-6",address:"Huérfanos 713, local 18, Santiago Centro",phone:"+56 9 2245 2080",website:"https://opticaycristal.cl"};
function escape(value: string) { return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!); }
export function clientEmailContent({ url, kind }: ClientMail) {
 const verify=kind==="verify";
 const title=verify?"Verifique su correo · Óptica & Cristal":"Recupere su acceso · Óptica & Cristal";
 const heading=verify?"Bienvenido a su espacio":"Recuperación de acceso";
 const purpose=verify?"Para completar el registro de su cuenta en Óptica & Cristal, confirme su correo electrónico.":"Recibimos una solicitud para restablecer la contraseña de su cuenta en Óptica & Cristal.";
 const action=verify?"Verificar mi correo":"Crear nueva contraseña";
 const expiry=verify?"24 horas":"30 minutos";
 const company=CLIENT_MAIL_COMPANY;
 const security="Por su seguridad, no comparta este enlace ni su contraseña. Si no solicitó esta acción, puede ignorar este mensaje.";
 const text=`${heading}\n\n${purpose}\n\n${action}: ${url}\n\nEl enlace es válido durante ${expiry}.\n${security}\n\n${company.name}\nRUT ${company.rut}\n${company.address}\n${CONTACTO_EMAIL}\n${company.phone}\n${company.website}`;
 const html=corporateEmailHtml({title,heading,purpose,action,url,security,expiry,eyebrow:verify?"Verificación de cuenta":"Seguridad de su cuenta"});
 return {title,html,text};
}
export type CorporateEmail = {title:string;heading:string;purpose:string;action:string;url:string;eyebrow:string;security:string;expiry?:string;note?:string};
export function corporateEmailHtml({title,heading,purpose,action,url,eyebrow,security,expiry,note}:CorporateEmail) {
 const company=CLIENT_MAIL_COMPANY;
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#fbf7f2;color:#242020;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(purpose)} ${expiry ? `Enlace válido durante ${escape(expiry)}.` : ""}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf7f2"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;border:1px solid #e9d8c8;border-radius:12px;background:#fff">
<tr><td style="height:5px;border-radius:12px 12px 0 0;background:#6b1f3a;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:30px 28px 20px"><img src="cid:${LOGO_CID}" alt="Óptica &amp; Cristal" width="156" style="display:block;width:156px;max-width:100%;height:auto;border:0"></td></tr>
<tr><td style="padding:0 28px"><p style="margin:0 0 12px;font-size:10px;font-weight:bold;letter-spacing:1.8px;color:#007f5f;text-transform:uppercase">${escape(eyebrow)}</p><h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:normal;line-height:1.2;color:#6b1f3a">${escape(heading)}</h1><p style="margin:0;font-size:15px;line-height:1.8">${escape(purpose)}</p></td></tr>
<tr><td align="left" style="padding:28px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#c9ff73" style="border-radius:8px;background:#c9ff73"><a href="${escape(url)}" style="display:inline-block;min-height:20px;padding:15px 24px;border:1px solid #b9eb62;border-radius:8px;font-size:14px;line-height:20px;font-weight:bold;text-decoration:none;color:#183e29">${escape(action)}</a></td></tr></table><p style="margin:16px 0 0;font-size:12px;line-height:1.7;color:#6e6264">${expiry ? `El enlace es válido durante <strong>${escape(expiry)}</strong>.` : escape(note || "Consulte y responda desde el portal de la óptica.")}</p></td></tr>
<tr><td style="padding:0 28px 28px"><p style="margin:0;padding:16px;border:1px solid #e5ece8;border-radius:8px;background:#f8faf9;font-size:12px;line-height:1.8;color:#566b62">${escape(security)}</p></td></tr>
<tr><td style="padding:22px 28px;border-top:1px solid #eee4db;background:#fdfaf7;border-radius:0 0 12px 12px"><p style="margin:0;font-size:12px;line-height:1.9;color:#62565a"><strong style="color:#6b1f3a">${escape(company.name)}</strong><br>RUT ${company.rut}<br>${escape(company.address)}<br><a href="mailto:${CONTACTO_EMAIL}" style="color:#245c4a;text-decoration:none">${CONTACTO_EMAIL}</a> · <a href="tel:+56922452080" style="color:#245c4a;text-decoration:none">${company.phone}</a><br><a href="${company.website}" style="color:#245c4a;text-decoration:none">opticaycristal.cl</a></p></td></tr>
</table><p style="margin:18px 0 0;font-size:10px;letter-spacing:.3px;color:#8a7d7e">Tu mirada, nuestra prioridad.</p>
</td></tr></table></body></html>`;
}
export async function sendClientMail(message: ClientMail) {
 const {title,html,text}=clientEmailContent(message);
 // Domain open/click tracking is disabled so security links remain direct.
 const result=await enviarConResend({to:message.to,subject:title,html,text,replyTo:CONTACTO_EMAIL});
 if(!result.ok)throw new Error("No se pudo confirmar el envío del correo de seguridad.");
}
