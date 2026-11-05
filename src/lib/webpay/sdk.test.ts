// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webpayConfiguration, validateCheckout, validateAuthorization, webpayAvailable } from './sdk';
import { parseProviderReturn } from './http';
const token = 'a'.repeat(64);
beforeEach(() => { vi.stubEnv('WEBPAY_ENABLED', 'true'); vi.stubEnv('WEBPAY_ENVIRONMENT', 'integration'); vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('CLIENT_APP_URL', 'http://localhost:3049'); });
afterEach(() => vi.unstubAllEnvs());
describe('Webpay: ambiente y respuestas estrictas', () => {
    it('usa el ambiente oficial de integración', () => { expect(webpayConfiguration().providerOrigin).toBe('https://webpay3gint.transbank.cl'); });
    it('está desactivado de forma predeterminada', () => { vi.stubEnv('WEBPAY_ENABLED', ''); expect(webpayAvailable()).toBe(false); });
    it('impide pruebas en producción', () => { vi.stubEnv('VERCEL_ENV', 'production'); expect(webpayAvailable()).toBe(false); });
    it('no activa producción sin credenciales', () => { vi.stubEnv('WEBPAY_ENVIRONMENT', 'production'); vi.stubEnv('WEBPAY_COMMERCE_CODE', ''); expect(webpayAvailable()).toBe(false); });
    it('rechaza orígenes inseguros y rutas de retorno inyectadas', () => { for (const url of ['http://example.com', 'https://example.com/path', 'https://user:pass@example.com', 'https://example.com?x=1']) {
        vi.stubEnv('CLIENT_APP_URL', url);
        expect(webpayAvailable()).toBe(false);
    } });
    it('solo redirige al endpoint oficial', () => { expect(validateCheckout({ token, url: 'https://webpay3gint.transbank.cl/webpayserver/initTransaction' }).token).toBe(token); for (const url of ['https://evil.test/webpayserver/initTransaction', 'https://webpay3gint.transbank.cl/other', 'https://webpay3gint.transbank.cl/webpayserver/initTransaction?x=1'])
        expect(() => validateCheckout({ token, url })).toThrow(); });
    it('exige monto, orden, sesión y autorización exactos', () => { const e = { amount: 75000, buyOrder: 'OCtest', sessionId: 'session' }, r = { amount: 75000, buy_order: 'OCtest', session_id: 'session', response_code: 0, status: 'AUTHORIZED' }; expect(validateAuthorization(r, e).authorized).toBe(true); expect(validateAuthorization({ ...r, response_code: -1 }, e).authorized).toBe(false); expect(validateAuthorization({ ...r, status: 'FAILED' }, e).authorized).toBe(false); for (const change of [{ amount: 1 }, { buy_order: 'other' }, { session_id: 'other' }, { amount: '75000' }])
        expect(() => validateAuthorization({ ...r, ...change }, e)).toThrow(); });
});
describe('Retorno Webpay', () => {
    it('acepta GET y POST sin sesión del navegador', async () => { expect(await parseProviderReturn(new Request('https://example.com?token_ws=' + token))).toEqual({ token, aborted: false }); expect(await parseProviderReturn(new Request('https://example.com', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'TBK_TOKEN=' + token }))).toEqual({ token, aborted: true }); });
    it('rechaza parámetros duplicados, arbitrarios y retornos ambiguos', async () => { for (const query of ['token_ws=a&token_ws=b', 'token_ws=a&other=b', 'token_ws=a&TBK_TOKEN=b', ''])
        await expect(parseProviderReturn(new Request('https://example.com?' + query))).rejects.toThrow(); });
    it('retorno mixto nunca autoriza una nueva transacción', async () => { expect((await parseProviderReturn(new Request(`https://example.com?token_ws=${token}&TBK_TOKEN=${token}`))).aborted).toBe(true); });
    it('limita tamaño y tipo del retorno', async () => { await expect(parseProviderReturn(new Request('https://example.com', { method: 'POST', body: 'x'.repeat(3000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }))).rejects.toThrow(); await expect(parseProviderReturn(new Request('https://example.com', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } }))).rejects.toThrow(); });
});
