import { staffLoginGate } from "@/lib/clients/staff-access";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
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
  if (!sameClientOrigin(request)) return privateJson({error:"Origen no permitido."},403);
  let body: unknown;
  try { body = await readClientBody(request, 4096); }
  catch { return privateJson({error:"No se pudo leer el acceso."},400); }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const usuario = typeof record.usuario === "string" ? record.usuario.trim() : "";
  const password = typeof record.password === "string" ? record.password : "";

  const limited = await staffLoginGate(clientIp(request), usuario);
  if (limited) return limited;

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
