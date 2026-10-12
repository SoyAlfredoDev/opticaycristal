import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCredentialsConfigured,
  adminCookieOptions,
  allowAttempt,
  clientIp,
  createSessionToken,
  credentialsMatch,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!allowAttempt(`login:${clientIp(request)}`, 8, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos." },
      { status: 429 }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4_096) return NextResponse.json({ error: "La solicitud supera el tamaño permitido." }, { status: 413 });
  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 4_096) return NextResponse.json({ error: "La solicitud supera el tamaño permitido." }, { status: 413 });
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "No se pudo leer el acceso." }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const usuario = typeof record.usuario === "string" ? record.usuario.trim() : "";
  const password = typeof record.password === "string" ? record.password : "";

  if (!adminCredentialsConfigured()) {
    return NextResponse.json(
      { error: "El acceso interno todavía no está configurado en el servidor." },
      { status: 500 }
    );
  }

  if (!credentialsMatch(usuario, password)) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const token = createSessionToken(usuario);
  if (!token) {
    return NextResponse.json(
      { error: "Falta SESSION_SECRET en el servidor." },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, adminCookieOptions(60 * 60 * 12));
  return response;
}
