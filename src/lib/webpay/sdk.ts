import "server-only";
import { WebpayPlus, Options, Environment, IntegrationCommerceCodes, IntegrationApiKeys } from "transbank-sdk";
export class WebpayError extends Error {
    constructor(public code: string, message: string, public status = 400) { super(message); }
}
export function webpayConfiguration() {
    if (process.env.WEBPAY_ENABLED !== "true")
        throw new WebpayError("NOT_CONFIGURED", "Webpay todavía no está disponible.", 503);
    const mode = process.env.WEBPAY_ENVIRONMENT;
    if (mode !== "integration" && mode !== "production")
        throw new WebpayError("NOT_CONFIGURED", "Falta configurar el ambiente de Webpay.", 503);
    if (process.env.VERCEL_ENV === "production" && mode !== "production")
        throw new WebpayError("NOT_CONFIGURED", "No se permiten pagos de prueba en producción.", 503);
    const commerceCode = mode === "integration" ? IntegrationCommerceCodes.WEBPAY_PLUS : process.env.WEBPAY_COMMERCE_CODE?.trim();
    const apiKey = mode === "integration" ? IntegrationApiKeys.WEBPAY : process.env.WEBPAY_API_KEY?.trim();
    if (!commerceCode || !/^\d{12}$/.test(commerceCode) || !apiKey || (mode === "production" && commerceCode === IntegrationCommerceCodes.WEBPAY_PLUS))
        throw new WebpayError("NOT_CONFIGURED", "Faltan las credenciales productivas de Webpay Plus.", 503);
    let origin: URL;
    try {
        origin = new URL(process.env.CLIENT_APP_URL || "https://opticaycristal.cl");
    }
    catch {
        throw new WebpayError("NOT_CONFIGURED", "URL del comercio no válida.", 503);
    }
    if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || (origin.protocol !== "https:" && !(mode === "integration" && ["localhost", "127.0.0.1"].includes(origin.hostname))))
        throw new WebpayError("NOT_CONFIGURED", "URL del comercio no válida.", 503);
    return { mode, commerceCode, apiKey, origin: origin.origin, providerOrigin: mode === "production" ? Environment.Production : Environment.Integration };
}
export function webpayAvailable() { try {
    webpayConfiguration();
    return true;
}
catch {
    return false;
} }
export function webpaySdk() { const c = webpayConfiguration(); return new WebpayPlus.Transaction(new Options(c.commerceCode, c.apiKey, c.providerOrigin, 12000)); }
export function validWebpayToken(token: unknown): string {
    if (typeof token !== "string" || !/^[a-zA-Z0-9]{40,128}$/.test(token))
        throw new WebpayError("INVALID_RETURN", "Retorno de pago no válido.");
    return token;
}
export function validateCheckout(result: unknown) {
    const r = result as {
        token?: unknown;
        url?: unknown;
    };
    const token = validWebpayToken(r?.token);
    let url: URL;
    try {
        url = new URL(String(r?.url));
    }
    catch {
        throw new WebpayError("INVALID_PROVIDER_RESPONSE", "Respuesta de Webpay no válida.", 502);
    }
    if (url.origin !== webpayConfiguration().providerOrigin || url.pathname !== "/webpayserver/initTransaction" || url.username || url.password || url.search || url.hash)
        throw new WebpayError("INVALID_PROVIDER_RESPONSE", "Destino de Webpay no permitido.", 502);
    return { token, url: url.toString() };
}
export type ExpectedPayment = {
    amount: number;
    buyOrder: string;
    sessionId: string;
};
export function validateAuthorization(raw: unknown, expected: ExpectedPayment) {
    const r = raw as Record<string, unknown>;
    if (!r || typeof r !== "object")
        throw new WebpayError("INVALID_PROVIDER_RESPONSE", "No se pudo verificar el pago.", 502);
    if (r.buy_order !== expected.buyOrder || r.session_id !== expected.sessionId || r.amount !== expected.amount)
        throw new WebpayError("PAYMENT_MISMATCH", "El pago necesita revisión de la óptica.", 409);
    return { authorized: r.response_code === 0 && r.status === "AUTHORIZED", status: typeof r.status === "string" ? r.status : "UNKNOWN" };
}
