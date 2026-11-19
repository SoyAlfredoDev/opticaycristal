import { customerAdminSession } from "@/lib/clients/admin";
import { privateJson, sameClientOrigin } from "@/lib/clients/http";
import { AdminCreateError, limitStaffCustomerAction } from "@/lib/clients/staff-customer-limits";
import { checkCommitmentSale, CommitmentUploadError, readCommitmentUpload, readSaleCommitment, uploadSaleCommitment } from "@/lib/clients/commitment-uploads";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
function failure(error: unknown) {
  if (error instanceof CommitmentUploadError || error instanceof AdminCreateError) return privateJson({ error: error.message }, error.status);
  return privateJson({ error: "No pudimos acceder al documento. Inténtalo nuevamente." }, 503);
}
export async function GET(_request: Request, context: Context) {
  const staff = await customerAdminSession(true);
  if (!staff) return privateJson({ error: "Acceso restringido." }, 401);
  try {
    const bytes = await readSaleCommitment((await context.params).id, { actor: staff.u, seller: staff.role === "seller" });
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="compromiso-de-pago.pdf"',
      "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  const staff = await customerAdminSession(true);
  if (!staff) return privateJson({ error: "Acceso restringido." }, 401);
  if (!sameClientOrigin(request)) return privateJson({ error: "Origen no permitido." }, 403);
  try {
    const id = (await context.params).id, scope = { actor: staff.u, seller: staff.role === "seller" };
    await checkCommitmentSale(id, scope);
    await limitStaffCustomerAction(staff.u, "commitment-upload", 30);
    await limitStaffCustomerAction(id, "commitment-upload-sale", 6);
    const file = await uploadSaleCommitment(id, scope, await readCommitmentUpload(request));
    return privateJson({ file }, 201);
  } catch (error) { return failure(error); }
}
