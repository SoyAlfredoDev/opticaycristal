import { allowStaffLogin } from "@/lib/clients/staff-access";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  clientIp,
  createSessionToken,
  credentialsMatch,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let allowed=false;
  try { allowed=await allowStaffLogin(clientIp(request)); } catch { return NextResponse.json({error:"Acceso temporalmente no disponible."},{status:503}); }
  if (!allowed) {
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

  if (!credentialsMatch(usuario, password)) {
    if (usuario.includes("@") && password.length >= 8 && password.length <= 128) {
      try {
        const {staffAuth}=await import("@/lib/staff/auth");
        const login=await staffAuth().api.signInEmail({body:{email:usuario.toLowerCase(),password},headers:request.headers,asResponse:true});
        if(login.ok){const response=NextResponse.json({ok:true});for(const cookie of login.headers.getSetCookie())response.headers.append("Set-Cookie",cookie);return response;}
      } catch { /* Keep credential errors indistinguishable. */ }
    }
    return NextResponse.json({error:"Usuario o contraseña incorrectos."},{status:401});
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
