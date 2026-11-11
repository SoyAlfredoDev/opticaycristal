import { customerAdminSession } from "@/lib/clients/admin";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
import { authorizeDigitalAgreement, DigitalAgreementError } from "@/lib/clients/digital-agreement";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
 if (!sameClientOrigin(request)) return privateJson({error:"Origen no permitido."},403);
 try {
  const staff = await customerAdminSession();
  if (!staff?.staffId || staff.role !== "administrator") return privateJson({error:"Acceso no autorizado."},403);
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return privateJson({error:"Venta no válida."},400);
  const raw = await readClientBody(request, 2048).catch(() => null);
  if (!raw || typeof raw !== "object") return privateJson({error:"Solicitud no válida."},400);
  await authorizeDigitalAgreement(id, staff.staffId, raw as Record<string, unknown>);
  return privateJson({ok:true});
 } catch (error) {
  if (error instanceof DigitalAgreementError) return privateJson({error:error.message},error.status);
  return privateJson({error:"No pudimos habilitar la firma digital."},503);
 }
}
