import { readFileSync } from "fs";
import path from "path";
import { getMesLabel } from "@/lib/jornada-form";
import { CONVENIO, convenioInterests } from "@/lib/convenios";
import { CONTACTO_EMAIL, ORIGEN_LABEL, type Solicitud } from "@/lib/solicitudes/types";

export const LOGO_CID = "logo-opticaycristal";
export const FROM_ADDRESS = `Óptica & Cristal <${CONTACTO_EMAIL}>`;

const ADDRESS = "Huérfanos 713, local 18, Santiago Centro";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function oneLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function logoAttachment() {
  const file = readFileSync(path.join(process.cwd(), "public", "images", "home", "oc-logo-oficial.png"));
  return {
    filename: "logo.png",
    content: file.toString("base64"),
    content_type: "image/png",
    content_id: LOGO_CID,
  };
}

function shell(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="es">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(title)}</title></head>
  <body style="margin:0;padding:0;background:#FBF7F2;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F2;">
      <tr>
        <td align="center" style="padding:36px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #E9D8C8;">
            <tr>
              <td style="height:4px;background:#6B1F3A;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 24px 12px;">
                <img src="cid:${LOGO_CID}" width="160" alt="Óptica &amp; Cristal" style="display:block;width:160px;max-width:100%;height:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px 8px;">
                <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;line-height:1.25;color:#6B1F3A;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#242020;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#62565A;">
            Óptica &amp; Cristal · Tu mirada, nuestra prioridad<br />
            ${ADDRESS}<br />
            <a href="mailto:${CONTACTO_EMAIL}" style="color:#6B1F3A;">${CONTACTO_EMAIL}</a><br />
            <a href="https://opticaycristal.cl/" style="color:#6B1F3A;">opticaycristal.cl</a> ·
            <a href="https://wa.me/56922452080" style="color:#6B1F3A;">WhatsApp</a> ·
            <a href="https://www.instagram.com/opticaycristal.cl/" style="color:#6B1F3A;">Instagram</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function fila(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 12px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#62565A;vertical-align:top;width:36%;overflow-wrap:break-word;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#242020;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(value)}</td>
  </tr>`;
}

function tabla(filas: Array<[string, string]>) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;margin:18px 0 8px;border-top:1px solid #E9D8C8;">${filas
    .map(([label, value]) => fila(label, value))
    .join("")}</table>`;
}

function button(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td bgcolor="#6B1F3A" style="border-radius:4px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:1.4;text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`;
}


function requestRows(solicitud: Solicitud): Array<[string, string]> {
  const details = solicitud.detalles;
  return [
    ["Región", solicitud.region],
    ...(details?.modalidadConvenio ? [["Interés del convenio", convenioInterests[details.modalidadConvenio]] as [string, string]] : []),
    ...(solicitud.mesEstimado ? [["Mes estimado", getMesLabel(solicitud.mesEstimado)] as [string, string]] : []),
    ...Object.entries({ "RUT de la empresa": details?.rutEmpresa, "Trabajadores / participantes": details?.trabajadores?.toString(), "Comuna": details?.comuna, "Dirección": details?.direccion, "Fecha tentativa": details?.fechaTentativa, "Comentarios": details?.comentarios })
      .filter((entry): entry is [string, string] => !!entry[1]),
  ];
}
export function correoCliente(solicitud: Solicitud) {
  const nombre = oneLine(solicitud.responsable);
  const empresa = oneLine(solicitud.empresa);
  const convenio = solicitud.origen === "convenio";
  const kind = convenio ? "convenio" : "jornada visual";
  const description = `Recibimos tu solicitud de ${kind} para ${empresa}. Nuestro equipo comercial te contactará para compartir la información y resolver tus dudas.`;
  const benefit = convenio
    ? `El convenio ofrece ${CONVENIO.discountPercent}% de descuento en compras online y en nuestra óptica, y consulta visual gratuita para trabajadores y familiares. Coordinaremos contigo el registro de tu empresa y cómo utilizarlo.`
    : "En una jornada llevamos la atención visual a las instalaciones de tu empresa: chequeo visual gratuito y descuentos de hasta un 30%, según las condiciones de la propuesta. Revisaremos participantes, espacios y fechas contigo.";
  const financing = "El financiamiento mediante la empresa, con descuento por nómina, es opcional y requiere acuerdo y contrato.";
  const rows: Array<[string, string]> = [["Empresa", empresa], ["Persona de contacto", nombre], ["Correo", solicitud.correo], ["Teléfono", solicitud.telefono], ...requestRows(solicitud)];
  const reference = `Referencia de solicitud: ${solicitud.id}`;
  const reply = `mailto:${CONTACTO_EMAIL}?subject=${encodeURIComponent(`Consulta sobre mi solicitud de ${kind} · ${solicitud.id.slice(0, 8)}`)}`;
  return {
    subject: `Recibimos tu solicitud de ${kind}`,
    text: [`Hola, ${nombre}:`, "", description, "", benefit, "", financing, "", ...rows.map(([label, value]) => `${label}: ${oneLine(value)}`), "", "Si quieres agregar información o corregir algún dato, responde a este correo.", "La solicitud no firma un contrato ni confirma una reserva de jornada.", reference, "Óptica & Cristal", CONTACTO_EMAIL, "https://opticaycristal.cl/"].join("\n"),
    html: shell("Tu solicitud está en nuestras manos", `<p>Hola, ${escapeHtml(nombre)}:</p><p>${escapeHtml(description)}</p><p>${escapeHtml(benefit)}</p><p style="padding:14px;background:#FBF7F2;font-size:14px;">${escapeHtml(financing)}</p>${tabla(rows)}<p>Si quieres agregar información o corregir algún dato, responde a este correo.</p>${button("Responder al equipo", reply)}<p style="font-size:12px;color:#62565A;">La solicitud no firma un contrato ni confirma una reserva de jornada.<br />${escapeHtml(reference)}</p>`),
    replyTo: CONTACTO_EMAIL,
  };
}
export function correoInterno(solicitud: Solicitud) {
  const empresa = oneLine(solicitud.empresa);
  const rows: Array<[string, string]> = [["Origen", ORIGEN_LABEL[solicitud.origen]], ["Empresa", empresa], ["Responsable", solicitud.responsable], ["Cargo", solicitud.cargo], ["Teléfono", solicitud.telefono], ["Correo", solicitud.correo], ...requestRows(solicitud), ["Contacto autorizado", solicitud.autorizacionDatos ? "Sí, confirmado al enviar el formulario" : "No"], ["Referencia", solicitud.id]];
  return {
    subject: oneLine(`Nueva solicitud de ${solicitud.origen} — ${empresa}`).slice(0, 180),
    text: [`Nueva solicitud de ${solicitud.origen} para ${empresa}.`, "", ...rows.map(([label, value]) => `${label}: ${oneLine(value)}`), "", "Próxima acción: contactar al responsable, resolver sus dudas y preparar una propuesta.", "https://opticaycristal.cl/admin"].join("\n"),
    html: shell("Una empresa quiere conversar", `<p>Llegó una solicitud de ${escapeHtml(solicitud.origen)} para <strong>${escapeHtml(empresa)}</strong>.</p>${tabla(rows)}<p><strong>Próxima acción:</strong> contactar al responsable, resolver sus dudas y preparar una propuesta.</p>${button("Revisar solicitudes en el panel", "https://opticaycristal.cl/admin")}`),
    replyTo: oneLine(solicitud.correo),
  };
}
