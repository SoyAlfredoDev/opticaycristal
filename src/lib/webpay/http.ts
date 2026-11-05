import "server-only";
import { clientPool, clientTable } from "@/lib/clients/db";
import { clientFingerprint } from "@/lib/clients/privacy";
import { privateJson } from "@/lib/clients/http";
import { SaleError } from "@/lib/clients/sales";
import { CommitmentError } from "@/lib/clients/commitments";
import { WebpayError } from "./sdk";
export async function limitPayments(subject: string) { const r = await clientPool().query(`INSERT INTO ${clientTable('oc_client_registration_limit')} AS l(key,count,reset_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN l.reset_at<now() THEN 1 ELSE l.count+1 END,reset_at=CASE WHEN l.reset_at<now() THEN now()+interval '15 minutes' ELSE l.reset_at END RETURNING count`, [clientFingerprint(subject, 'webpay-rate')]); if (Number(r.rows[0].count) > 20)
    throw new WebpayError('RATE_LIMITED', 'Espera antes de volver a intentarlo.', 429); }
export function paymentError(error: unknown) { const known = error instanceof WebpayError; return privateJson({ error: { code: known ? error.code : 'UNAVAILABLE', message: known ? error.message : error instanceof SaleError || error instanceof CommitmentError ? error.message : 'No pudimos consultar el pago. No vuelvas a pagar si ya realizaste la operación.' } }, known ? error.status : error instanceof SaleError || error instanceof CommitmentError ? 400 : 503); }
export async function parseProviderReturn(request: Request) {
    let params: URLSearchParams;
    if (request.method === 'GET')
        params = new URL(request.url).searchParams;
    else {
        if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))
            throw new WebpayError('INVALID_RETURN', 'Retorno no válido.');
        const reader = request.body?.getReader();
        if (!reader)
            throw new WebpayError('INVALID_RETURN', 'Retorno vacío.');
        let raw = '';
        const decoder = new TextDecoder();
        let size = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.length;
            if (size > 2048) {
                await reader.cancel();
                throw new WebpayError('INVALID_RETURN', 'Retorno no válido.');
            }
            raw += decoder.decode(value, { stream: true });
        }
        raw += decoder.decode();
        params = new URLSearchParams(raw);
    }
    for (const [key, value] of params) {
        if (!['token_ws', 'TBK_TOKEN', 'TBK_ID_SESION', 'TBK_ORDEN_COMPRA'].includes(key) || params.getAll(key).length !== 1 || value.length > 128)
            throw new WebpayError('INVALID_RETURN', 'Retorno no válido.');
    }
    const token = params.get('token_ws'), aborted = params.get('TBK_TOKEN');
    // Mixed returns are recovery/status-only; never authorize a cancellation.
    if (!token && !aborted)
        throw new WebpayError('INVALID_RETURN', 'El resultado necesita revisión; no pagues nuevamente.');
    if (token && aborted && token !== aborted)
        throw new WebpayError('INVALID_RETURN', 'Retorno ambiguo; requiere revisión.');
    return { token: aborted || token!, aborted: !!aborted };
}
