import { NextResponse } from 'next/server';
import { parseProviderReturn } from '@/lib/webpay/http';
import { returnWebpayPayment } from '@/lib/webpay/store';
import { webpayConfiguration } from '@/lib/webpay/sdk';
export const runtime = 'nodejs';
export const maxDuration = 30;
async function handle(request: Request) {
    try {
        const config = webpayConfiguration(), { token, aborted } = await parseProviderReturn(request);
        const id = await returnWebpayPayment(token, aborted);
        const response = NextResponse.redirect(new URL('/mi-cuenta/pagos?resultado=' + encodeURIComponent(id), config.origin), 303);
        response.headers.set('Cache-Control', 'private, no-store');
        response.headers.set('Referrer-Policy', 'no-referrer');
        return response;
    }
    catch {
        return new Response('<!doctype html><html lang="es"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Estado de pago</title><h1>Estamos verificando el pago</h1><p>Si ya pagaste, no lo intentes nuevamente. Revisa el estado desde Mi cuenta o contacta a la óptica.</p><a href="/mi-cuenta/pagos">Ir a mis pagos</a></html>', { status: 409, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    }
}
export const GET = handle;
export const POST = handle;
