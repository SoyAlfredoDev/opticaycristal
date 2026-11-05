import { customerSession } from "@/lib/clients/auth";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
import { createCreditPayment, getWebpayPayment, listWebpayPayments, startWebpayPayment, listUnpaidSales, cancelUnstartedPayment } from "@/lib/webpay/store";
import { webpayAvailable, webpayConfiguration, WebpayError } from "@/lib/webpay/sdk";
import { limitPayments, paymentError } from "@/lib/webpay/http";
export const runtime = 'nodejs';
export async function GET(request: Request) { const s = await customerSession(); if (!s)
    return privateJson({ error: 'Inicia sesión.' }, 401); try {
    const id = new URL(request.url).searchParams.get('id');
    return privateJson({ enabled: webpayAvailable(), ...(id ? { payment: await getWebpayPayment(id, s.user.id) } : { payments: await listWebpayPayments(s.user.id), sales: await listUnpaidSales(s.user.id) }) });
}
catch (e) {
    return paymentError(e);
} }
export async function POST(request: Request) {
    const s = await customerSession();
    if (!s)
        return privateJson({ error: 'Inicia sesión.' }, 401);
    if (!sameClientOrigin(request))
        return privateJson({ error: 'Origen no permitido.' }, 403);
    try {
        webpayConfiguration();
        await limitPayments(s.user.id);
        const raw = await readClientBody(request);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
            throw new WebpayError('INVALID_INPUT', 'Datos no válidos.');
        const b = raw as Record<string, unknown>;
        if (b.action === 'credit') {
            const { action, ...input } = b;
            void action;
            return privateJson({ payment: await createCreditPayment(s.user.id, input) });
        }
        if (b.action === 'start' && Object.keys(b).every(k => ['action', 'id'].includes(k)) && typeof b.id === 'string')
            return privateJson(await startWebpayPayment(b.id, s.user.id));
        if (b.action === 'cancel' && Object.keys(b).every(k => ['action', 'id'].includes(k)) && typeof b.id === 'string')
            return privateJson(await cancelUnstartedPayment(b.id, s.user.id));
        throw new WebpayError('INVALID_INPUT', 'Acción no válida.');
    }
    catch (e) {
        return paymentError(e);
    }
}
