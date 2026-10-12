import { NextResponse } from "next/server";
import { allowAttempt, clientIp } from "@/lib/auth";
import { sendSolicitudCorreos } from "@/lib/mail/solicitud";
import { parseSolicitudBody } from "@/lib/solicitudes/parse";
import { correoDestino, createSolicitud, updateCorreoEstado } from "@/lib/solicitudes/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!allowAttempt(`solicitud:${clientIp(request)}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Recibimos varios envíos seguidos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La solicitud no tiene un formato válido." }, { status: 400 });
  }

  const parsed = parseSolicitudBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.spam) {
    return NextResponse.json({ ok: true });
  }

  const solicitud = {
    id: crypto.randomUUID(),
    origen: parsed.origen,
    ...parsed.data,
    correoDestino: correoDestino(),
    correoEstado: "pendiente" as const,
    correoDetalle: null,
    correoClienteEstado: "pendiente" as const,
    correoClienteDetalle: null,
    creadoEn: new Date().toISOString(),
  };

  let guardada = false;
  try {
    await createSolicitud(solicitud);
    guardada = true;
  } catch (error) {
    console.error("No se pudo registrar la solicitud", error);
  }

  const correos = await sendSolicitudCorreos(solicitud);

  if (guardada) {
    try {
      await updateCorreoEstado(solicitud.id, {
        correoEstado: correos.interno.estado,
        correoDetalle: correos.interno.detalle,
        correoClienteEstado: correos.cliente.estado,
        correoClienteDetalle: correos.cliente.detalle,
      });
    } catch (error) {
      console.error("No se pudo actualizar el estado del correo", error);
    }
  }

  const algunoEnviado = correos.interno.estado === "enviado" || correos.cliente.estado === "enviado";
  if (!guardada && !algunoEnviado) {
    return NextResponse.json(
      { error: "No pudimos registrar la solicitud. Inténtalo de nuevo en unos minutos." },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
