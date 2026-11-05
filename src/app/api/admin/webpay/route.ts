import { customerAdminSession } from "@/lib/clients/admin";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
import { createCatalogPayment, listWebpayPayments, reconcileWebpayPayment } from "@/lib/webpay/store";
import { webpayAvailable } from "@/lib/webpay/sdk";
import { limitPayments, paymentError } from "@/lib/webpay/http";
export const runtime = 'nodejs';
export async function GET() { if (!await customerAdminSession())
    return privateJson({ error: 'Acceso restringido.' }, 401); try {
    return privateJson({ enabled: webpayAvailable(), payments: await listWebpayPayments() });
}
catch (e) {
    return paymentError(e);
} }
export async function POST(request: Request) { const s = await customerAdminSession(); if (!s)
    return privateJson({ error: 'Acceso restringido.' }, 401); if (!sameClientOrigin(request))
    return privateJson({ error: 'Origen no permitido.' }, 403); try {
    await limitPayments('admin:' + s.u);
    const raw = await readClientBody(request);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return privateJson({ error: { message: 'Solicitud no válida.' } }, 400);
    const b = raw as Record<string, unknown>;
    if (b.action === 'reconcile') {
        if (Object.keys(b).some(k => !['action', 'id'].includes(k)) || typeof b.id !== 'string')
            return privateJson({ error: { message: 'Solicitud no válida.' } }, 400);
        return privateJson({ payment: await reconcileWebpayPayment(b.id) });
    }
    return privateJson({ payment: await createCatalogPayment(b, s.u) }, 201);
}
catch (e) {
    return paymentError(e);
} }
