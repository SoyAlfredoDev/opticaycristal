import { readFileSync } from "fs";
import path from "path";
import { getMesLabel } from "@/lib/jornada-form";
import { convenioInterests } from "@/lib/convenios";
import { CONTACTO_EMAIL, ORIGEN_LABEL, type Solicitud } from "@/lib/solicitudes/types";

export const LOGO_CID = "logo-opticaycristal";
export const FROM_ADDRESS = `Óptica y Cristal <${CONTACTO_EMAIL}>`;

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
  const file = readFileSync(path.join(process.cwd(), "public", "logo-email.png"));
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
  <body style="margin:0;padding:0;background:#f6f6f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;">
      <tr>
        <td align="center" style="padding:36px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #ececec;">
            <tr>
              <td style="height:3px;background:#b21f24;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td align="center" style="padding:36px 36px 8px;">
                <img src="cid:${LOGO_CID}" width="188" alt="Óptica y Cristal" style="display:block;width:188px;max-width:188px;height:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:12px 36px 8px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:#1a1a1a;">
                ${title}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 36px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#3a3a3a;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8a8a8a;">
            Óptica y Cristal<br />
            ${ADDRESS}<br />
            <a href="mailto:${CONTACTO_EMAIL}" style="color:#8a8a8a;text-decoration:none;">${CONTACTO_EMAIL}</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function fila(label: string, value: string) {
  return `<tr>
    <td style="padding:7px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8a8a8a;vertical-align:top;width:148px;">${escapeHtml(label)}</td>
    <td style="padding:7px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;">${escapeHtml(value)}</td>
  </tr>`;
}

function tabla(filas: Array<[string, string]>) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;border-top:1px solid #ececec;">${filas
    .map(([label, value]) => fila(label, value))
    .join("")}</table>`;
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
  const kind = solicitud.origen === "convenio" ? "convenio" : "jornada oftalmológica";
  const description = `Recibimos la solicitud de ${kind} para ${empresa}. Te contactaremos para revisar los detalles y condiciones.`;
  const rows = requestRows(solicitud);
  return {
    subject: `Recibimos tu solicitud de ${solicitud.origen}`,
    text: [`Estimado/a ${nombre}:`, "", description, "", ...rows.map(([label, value]) => `${label}: ${oneLine(value)}`), "", "Si necesitas corregir algún dato, responde a este correo.", "Óptica & Cristal", CONTACTO_EMAIL].join("\n"),
    html: shell("Recibimos tu solicitud", `<p>Estimado/a ${escapeHtml(nombre)}:</p><p>${escapeHtml(description)}</p>${tabla(rows)}<p>Si necesitas corregir algún dato, responde a este correo.</p>`),
    replyTo: CONTACTO_EMAIL,
  };
}
export function correoInterno(solicitud: Solicitud) {
  const empresa = oneLine(solicitud.empresa);
  const rows: Array<[string, string]> = [["Origen", ORIGEN_LABEL[solicitud.origen]], ["Empresa", empresa], ["Responsable", solicitud.responsable], ["Cargo", solicitud.cargo], ["Teléfono", solicitud.telefono], ["Correo", solicitud.correo], ...requestRows(solicitud)];
  return {
    subject: oneLine(`Nueva solicitud de ${solicitud.origen} — ${empresa}`).slice(0, 180),
    text: [`Nueva solicitud de ${solicitud.origen} para ${empresa}.`, "", ...rows.map(([label, value]) => `${label}: ${oneLine(value)}`)].join("\n"),
    html: shell("Nueva solicitud", `<p>Llegó una solicitud de ${escapeHtml(solicitud.origen)} para <strong>${escapeHtml(empresa)}</strong>.</p>${tabla(rows)}`),
    replyTo: oneLine(solicitud.correo),
  };
}
