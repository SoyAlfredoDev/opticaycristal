import { customerSession } from "@/lib/clients/auth";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
import { DigitalAgreementError, requestAgreementCode, sendDigitalAgreementCopy, signDigitalAgreement } from "@/lib/clients/digital-agreement";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
 if (!sameClientOrigin(request)) return privateJson({error:"Origen no permitido."},403);
 try {
  const session = await customerSession();
  if (!session) return privateJson({error:"Inicia sesión."},401);
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return privateJson({error:"Venta no válida."},400);
  const raw = await readClientBody(request, 2048).catch(() => null) as Record<string, unknown> | null;
  switch (raw?.action) {
   case "request": return privateJson(await requestAgreementCode(id, session.user.id));
   case "sign": return privateJson(await signDigitalAgreement(id, session.user.id, raw));
   case "copy": return privateJson(await sendDigitalAgreementCopy(id, session.user.id));
   default: return privateJson({error:"Solicitud no válida."},400);
  }
 } catch (error) {
  if (error instanceof DigitalAgreementError) return privateJson({error:error.message},error.status);
  return privateJson({error:"No pudimos completar la solicitud. Inténtalo nuevamente."},503);
 }
}
