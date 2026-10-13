import { NextResponse } from "next/server";
import { allowAttempt, clientIp } from "@/lib/auth";
import { sendSolicitudCorreos } from "@/lib/mail/solicitud";
import { parseSolicitudBody } from "@/lib/solicitudes/parse";
import { correoDestino, createSolicitud, getSolicitud, updateCorreoEstado } from "@/lib/solicitudes/store";
import { assertRadarOrigin, RadarApiError, readRadarBody } from "@/lib/radar/api";
import type { Solicitud } from "@/lib/solicitudes/types";
import type { CompanyRequest } from "@/lib/company-request";

export const runtime = "nodejs";

function fingerprint(data: CompanyRequest) {
  return JSON.stringify([data.origen, data.responsable, data.cargo, data.telefono, data.correo, data.empresa, data.region, data.mesEstimado, data.autorizacionDatos,
    ...["rutEmpresa", "trabajadores", "comuna", "direccion", "fechaTentativa", "comentarios", "modalidadConvenio"].map(key => data.detalles?.[key as keyof NonNullable<CompanyRequest["detalles"]>] || null)]);
}
function receipt(solicitud: Solicitud) {
  return NextResponse.json({ ok: true, id: solicitud.id, confirmationSent: solicitud.correoClienteEstado === "enviado" });
}

export async function POST(request: Request) {
  if (!allowAttempt(`solicitud:${clientIp(request)}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Recibimos varios envíos seguidos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    assertRadarOrigin(request);
    body = await readRadarBody(request, 16000);
  } catch (error) {
    return NextResponse.json({ error: error instanceof RadarApiError ? error.message : "La solicitud no tiene un formato válido." }, { status: error instanceof RadarApiError ? error.status : 400 });
  }

  const parsed = parseSolicitudBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.spam) {
    return NextResponse.json({ ok: true });
  }

  const requestId = body.requestId;
  if (requestId !== undefined && (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))) {
    return NextResponse.json({ error: "La referencia de solicitud no es válida." }, { status: 400 });
  }
  const solicitud: Solicitud = {
    id: typeof requestId === "string" ? requestId.toLowerCase() : crypto.randomUUID(),
    origen: parsed.origen,
    ...parsed.data,
    correoDestino: correoDestino(),
    correoEstado: "pendiente" as const,
    correoDetalle: null,
    correoClienteEstado: "pendiente" as const,
    correoClienteDetalle: null,
    creadoEn: new Date().toISOString(),
  };

  const existingReceipt = async () => {
    const existing = await getSolicitud(solicitud.id);
    if (!existing) return null;
    if (fingerprint(existing) !== fingerprint(solicitud)) return NextResponse.json({ error: "La referencia corresponde a otra solicitud. Recarga el formulario." }, { status: 409 });
    return receipt(existing);
  };
  try {
    if (requestId) {
      const existing = await existingReceipt();
      if (existing) return existing;
    }
    await createSolicitud(solicitud);
  } catch (error) {
    // A concurrent retry can reach the unique ID before the first request finishes sending.
    if (requestId) {
      try { const existing = await existingReceipt(); if (existing) return existing; } catch { /* Persistence is unavailable. */ }
    }
    console.error("No se pudo registrar la solicitud", error instanceof Error ? error.name : "Error");
    return NextResponse.json({ error: "No pudimos registrar la solicitud. Inténtalo de nuevo en unos minutos." }, { status: 503 });
  }

  const correos = await sendSolicitudCorreos(solicitud);

  try {
      await updateCorreoEstado(solicitud.id, {
        correoEstado: correos.interno.estado,
        correoDetalle: correos.interno.detalle,
        correoClienteEstado: correos.cliente.estado,
        correoClienteDetalle: correos.cliente.detalle,
        correoId: correos.interno.id,
        correoClienteId: correos.cliente.id,
      });
  } catch (error) {
    console.error("No se pudo actualizar el estado del correo", error instanceof Error ? error.name : "Error");
  }

  return receipt({ ...solicitud, correoClienteEstado: correos.cliente.estado });
}
