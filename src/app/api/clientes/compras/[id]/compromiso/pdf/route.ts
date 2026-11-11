import { customerSession } from "@/lib/clients/auth";
import { getCustomerDocumentSale } from "@/lib/clients/history";
import { getStoredCommitment,storedAgreementPdf } from "@/lib/clients/commitments";
import { creditAgreementPdf } from "@/lib/clients/credit-agreement-pdf";
import { privateJson } from "@/lib/clients/http";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await customerSession();
    if (!session) return privateJson({ error: "Inicia sesión." }, 401);
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/i.test(id)) return privateJson({ error: "Venta no válida." }, 400);
    const sale = await getCustomerDocumentSale(session.user.id, id);
    if (!sale?.credit) return privateJson({ error: "Venta no encontrada." }, 404);
    const document = await getStoredCommitment(id, session.user.id);
    if (!document) return privateJson({ error: "Esta venta todavía no tiene un compromiso generado." }, 409);
    const bytes = document.model ? await storedAgreementPdf(id,session.user.id) : await creditAgreementPdf(document, { cancelled: sale.status === "cancelled", signedAt: sale.signedAt });
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="compromiso-de-pago.pdf"', "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return privateJson({ error: "No pudimos preparar el PDF. Puedes usar la versión imprimible del compromiso." }, 503);
  }
}
