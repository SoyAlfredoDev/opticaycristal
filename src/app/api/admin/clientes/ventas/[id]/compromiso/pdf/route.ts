import { customerAdminSession } from "@/lib/clients/admin";
import { clientPool, clientTable } from "@/lib/clients/db";
import { getStoredCommitment } from "@/lib/clients/commitments";
import { creditAgreementPdf } from "@/lib/clients/credit-agreement-pdf";
import { privateJson } from "@/lib/clients/http";
export const runtime = "nodejs";
export async function GET(_r: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    if (!await customerAdminSession(true))
        return privateJson({ error: "Acceso restringido." }, 401);
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/i.test(id))
        return privateJson({ error: "Venta no válida." }, 400);
    try {
        const sale = (await clientPool().query(`SELECT user_id,status,signed_at FROM ${clientTable("oc_client_sales")} WHERE id=$1`, [id])).rows[0];
        if (!sale)
            return privateJson({ error: "Venta no encontrada." }, 404);
        const document = await getStoredCommitment(id, sale.user_id);
        if (!document)
            return privateJson({ error: "Esta venta todavía no tiene un compromiso generado." }, 409);
        const bytes = await creditAgreementPdf(document, { cancelled: sale.status === "cancelled", signedAt: sale.signed_at });
        return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="compromiso-de-pago.pdf"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }
    catch {
        return privateJson({ error: "No pudimos preparar el PDF. Puedes usar la versión imprimible del compromiso." }, 503);
    }
}
