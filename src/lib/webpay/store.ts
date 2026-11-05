import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { clientPool, clientTable as t } from "@/lib/clients/db";
import { clientFingerprint, protectClientValue, revealClientValue } from "@/lib/clients/privacy";
import { recordSalePayment, requestKey, findCustomerByRut, whole, todayChile, SaleError } from "@/lib/clients/sales";
import { saleInterestQuote } from "@/lib/clients/commitments";
import { products } from "@/components/optica/catalog";
import { WebpayError, webpaySdk, webpayConfiguration, validateCheckout, validateAuthorization, validWebpayToken } from "./sdk";
type Row = {
    id: string;
    user_id: string;
    kind: "catalog" | "credit";
    sale_id: string | null;
    description: string;
    amount: number;
    principal: number;
    interest: number;
    request_key: string;
    buy_order: string;
    session_id: string;
    state: string;
    token_enc: string | null;
    payment_id: string | null;
    created_at: string;
    updated_at: string;
};
const fields = 'id,user_id,kind,sale_id,description,amount,principal,interest,request_key,buy_order,session_id,state,token_enc,payment_id,created_at,updated_at';
export const paymentView = (r: Row) => ({ id: r.id, kind: r.kind, saleId: r.sale_id, description: r.description, amount: Number(r.amount), principal: Number(r.principal), interest: Number(r.interest), state: r.state, createdAt: r.created_at });
async function tx<T>(work: (db: PoolClient) => Promise<T>) { const db = await clientPool().connect(); try {
    await db.query("BEGIN");
    await db.query("SET LOCAL lock_timeout='4s'");
    const result = await work(db);
    await db.query("COMMIT");
    return result;
}
catch (e) {
    await db.query("ROLLBACK");
    throw e;
}
finally {
    db.release();
} }
function strict(raw: unknown, keys: string[]) { if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some(k => !keys.includes(k)))
    throw new WebpayError("INVALID_INPUT", "Datos no válidos."); return raw as Record<string, unknown>; }
function identifier(id: unknown) { if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id))
    throw new WebpayError("INVALID_INPUT", "Identificador no válido."); return id; }
function paymentIdentifier(id: string) { if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id))
    throw new WebpayError('INVALID_INPUT', 'Cobro no válido.'); return id; }
async function event(db: Pick<PoolClient, "query">, id: string, outcome: string) { await db.query(`INSERT INTO ${t("oc_client_webpay_events")}(id,payment_request_id,outcome) VALUES($1,$2,$3)`, [randomUUID(), id, outcome]); }
function ids() { const id = randomUUID(); return { id, buyOrder: 'OC' + id.replaceAll('-', '').slice(0, 24), sessionId: randomUUID() }; }
export async function createCatalogPayment(raw: unknown, actor: string) {
    const b = strict(raw, ['rut', 'productId', 'quantity', 'total', 'confirmed', 'requestKey']);
    if (b.confirmed !== true)
        throw new WebpayError("PRICE_NOT_CONFIRMED", "Confirma el precio acordado con el cliente.");
    const product = products.find(p => p.id === b.productId);
    if (!product)
        throw new WebpayError("INVALID_INPUT", "Selecciona un producto del catálogo.");
    const quantity = whole(b.quantity, 'Cantidad', 1, 100), amount = whole(b.total, 'Total confirmado', 1), key = requestKey(b.requestKey), userId = await findCustomerByRut(b.rut), description = product.title + ' × ' + quantity;
    return tx(async (db) => {
        await db.query(`SELECT id FROM ${t('oc_client_user')} WHERE id=$1 FOR UPDATE`, [userId]);
        const previous = (await db.query<Row>(`SELECT ${fields} FROM ${t('oc_client_webpay')} WHERE user_id=$1 AND request_key=$2`, [userId, key])).rows[0];
        if (previous) {
            if (previous.kind !== 'catalog' || previous.description !== description || Number(previous.amount) !== amount)
                throw new WebpayError('IDEMPOTENCY_CONFLICT', 'La solicitud ya se usó con otros datos.', 409);
            return paymentView(previous);
        }
        const { id, buyOrder, sessionId } = ids();
        const r = (await db.query<Row>(`INSERT INTO ${t('oc_client_webpay')}(id,user_id,kind,description,amount,request_key,buy_order,session_id,created_by) VALUES($1,$2,'catalog',$3,$4,$5,$6,$7,$8) RETURNING ${fields}`, [id, userId, description, amount, key, buyOrder, sessionId, actor])).rows[0];
        await event(db, id, 'catalog_price_confirmed');
        return paymentView(r);
    });
}
export async function createCreditPayment(userId: string, raw: unknown) {
    const b = strict(raw, ['saleId', 'mode', 'requestKey']), saleId = identifier(b.saleId), key = requestKey(b.requestKey);
    if (b.mode !== 'next' && b.mode !== 'balance')
        throw new WebpayError('INVALID_INPUT', 'Selecciona cuota o saldo total.');
    return tx(async (db) => {
        await db.query(`SELECT id FROM ${t('oc_client_user')} WHERE id=$1 FOR UPDATE`, [userId]);
        const sale = (await db.query(`SELECT id,status FROM ${t('oc_client_sales')} WHERE id=$1 AND user_id=$2 FOR UPDATE`, [saleId, userId])).rows[0];
        if (!sale || sale.status !== 'active')
            throw new WebpayError('NOT_FOUND', 'Venta no disponible.', 404);
        const previous = (await db.query<Row>(`SELECT ${fields} FROM ${t('oc_client_webpay')} WHERE user_id=$1 AND request_key=$2`, [userId, key])).rows[0];
        const description = b.mode === 'next' ? 'Pago de próxima cuota' : 'Pago de saldo total';
        if (previous) {
            if (previous.sale_id !== saleId || previous.description !== description)
                throw new WebpayError('IDEMPOTENCY_CONFLICT', 'La solicitud ya se usó con otros datos.', 409);
            return paymentView(previous);
        }
        const pending = (await db.query(`SELECT id FROM ${t('oc_client_webpay')} WHERE sale_id=$1 AND state IN ('quoted','creating','ready','confirming','unknown','review')`, [saleId])).rows[0];
        if (pending)
            throw new WebpayError('PAYMENT_PENDING', 'Ya existe un intento de pago pendiente. Revísalo antes de iniciar otro.', 409);
        const quote = await saleInterestQuote(saleId, todayChile(), userId);
        let principal = quote.principalDue;
        if (b.mode === 'next') {
            const installment = (await db.query(`SELECT amount-paid AS remaining FROM ${t('oc_client_installments')} WHERE sale_id=$1 AND amount>paid ORDER BY number LIMIT 1`, [saleId])).rows[0];
            principal = Number(installment?.remaining || 0);
        }
        const interest = quote.due, amount = principal + interest;
        if (!Number.isSafeInteger(amount) || amount < 1)
            throw new WebpayError('NOTHING_DUE', 'No hay saldo pendiente.');
        const { id, buyOrder, sessionId } = ids();
        const r = (await db.query<Row>(`INSERT INTO ${t('oc_client_webpay')}(id,user_id,kind,sale_id,description,amount,principal,interest,request_key,buy_order,session_id,created_by) VALUES($1,$2,'credit',$3,$4,$5,$6,$7,$8,$9,$10,'customer') RETURNING ${fields}`, [id, userId, saleId, description, amount, principal, interest, key, buyOrder, sessionId])).rows[0];
        await event(db, id, 'credit_amount_calculated');
        return paymentView(r);
    });
}
export async function listWebpayPayments(userId?: string) {
    if (!userId) {
        const r = await clientPool().query<Row & {
            customer_name: string;
        }>(`SELECT ${fields.split(',').map(f => 'w.' + f).join(',')},u.name AS customer_name FROM ${t('oc_client_webpay')} w JOIN ${t('oc_client_user')} u ON u.id=w.user_id ORDER BY w.created_at DESC LIMIT 50`);
        return r.rows.map(r => ({ ...paymentView(r), customerName: r.customer_name, reference: r.buy_order }));
    }
    const r = await clientPool().query<Row>(`SELECT ${fields} FROM ${t('oc_client_webpay')} WHERE user_id=$1 ORDER BY CASE WHEN state IN ('quoted','creating','ready','confirming','unknown','review') THEN 0 ELSE 1 END,created_at DESC LIMIT 50`, [userId]);
    return r.rows.map(paymentView);
}
export async function listUnpaidSales(userId: string) { return (await clientPool().query(`SELECT id,product_name AS description,remaining FROM ${t('oc_client_sales')} WHERE user_id=$1 AND status='active' AND remaining>0 ORDER BY created_at DESC LIMIT 10`, [userId])).rows; }
export async function cancelUnstartedPayment(id: string, userId: string) { paymentIdentifier(id); const r = await clientPool().query(`UPDATE ${t('oc_client_webpay')} SET state='cancelled',updated_at=now() WHERE id=$1 AND user_id=$2 AND kind='credit' AND state='quoted' RETURNING id`, [id, userId]); if (!r.rowCount)
    throw new WebpayError('PAYMENT_PENDING', 'Este pago ya fue iniciado. Consulta el resultado antes de volver a pagar.', 409); return { id }; }
export async function getWebpayPayment(id: string, userId: string) { paymentIdentifier(id); const r = (await clientPool().query<Row>(`SELECT ${fields} FROM ${t('oc_client_webpay')} WHERE id=$1 AND user_id=$2`, [id, userId])).rows[0]; if (!r)
    throw new WebpayError('NOT_FOUND', 'Cobro no disponible.', 404); return paymentView(r); }
export async function startWebpayPayment(id: string, userId: string) {
    paymentIdentifier(id);
    const config = webpayConfiguration();
    const row = await tx(async (db) => {
        const r = (await db.query<Row>(`SELECT ${fields} FROM ${t('oc_client_webpay')} WHERE id=$1 AND user_id=$2 FOR UPDATE`, [id, userId])).rows[0];
        if (!r)
            throw new WebpayError('NOT_FOUND', 'Cobro no disponible.', 404);
        if (r.kind === 'credit') {
            const q = await saleInterestQuote(r.sale_id, todayChile(), userId);
            const next = (await db.query(`SELECT amount-paid AS remaining FROM ${t('oc_client_installments')} WHERE sale_id=$1 AND amount>paid ORDER BY number LIMIT 1`, [r.sale_id])).rows[0];
            const expected = r.description === 'Pago de próxima cuota' ? Number(next?.remaining || 0) : q.principalDue;
            if (expected !== Number(r.principal) || q.due !== Number(r.interest))
                throw new WebpayError('BALANCE_CHANGED', 'El saldo cambió. Solicita a la óptica revisar este intento antes de pagar.', 409);
        }
        if (r.state === 'ready' && r.token_enc)
            return r;
        if (r.state !== 'quoted')
            throw new WebpayError('PAYMENT_PENDING', 'Este intento ya fue procesado o necesita revisión. No se generará otro cobro.', 409);
        await db.query(`UPDATE ${t('oc_client_webpay')} SET state='creating',updated_at=now() WHERE id=$1`, [id]);
        return r;
    });
    if (row.state === 'ready')
        return { url: config.providerOrigin + '/webpayserver/initTransaction', token: revealClientValue(row.token_enc!, 'webpay-token') };
    try {
        const checkout = validateCheckout(await webpaySdk().create(row.buy_order, row.session_id, Number(row.amount), config.origin + '/api/pagos/webpay/retorno'));
        await tx(async (db) => { await db.query(`UPDATE ${t('oc_client_webpay')} SET state='ready',token_hash=$2,token_enc=$3,updated_at=now() WHERE id=$1`, [id, clientFingerprint(checkout.token, 'webpay-token'), protectClientValue(checkout.token, 'webpay-token')]); await event(db, id, 'checkout_created'); });
        return checkout;
    }
    catch {
        await clientPool().query(`UPDATE ${t('oc_client_webpay')} SET state='unknown',updated_at=now() WHERE id=$1`, [id]);
        throw new WebpayError('PROVIDER_UNAVAILABLE', 'No pudimos confirmar el inicio del pago. No vuelvas a pagar hasta que la óptica revise el intento.', 503);
    }
}
export async function returnWebpayPayment(token: string, aborted = false) {
    validWebpayToken(token);
    webpayConfiguration();
    const row = await tx(async (db) => {
        const r = (await db.query<Row>(`SELECT ${fields} FROM ${t('oc_client_webpay')} WHERE token_hash=$1 FOR UPDATE`, [clientFingerprint(token, 'webpay-token')])).rows[0];
        if (!r)
            throw new WebpayError('NOT_FOUND', 'Retorno no reconocido.', 404);
        if (['paid', 'review', 'cancelled', 'rejected'].includes(r.state))
            return r;
        if (!['ready', 'unknown'].includes(r.state) && !(r.state === 'confirming' && Date.now() - new Date(r.updated_at).getTime() > 120000))
            throw new WebpayError('PAYMENT_PENDING', 'El resultado se está verificando.', 409);
        await db.query(`UPDATE ${t('oc_client_webpay')} SET state='confirming',updated_at=now() WHERE id=$1`, [r.id]);
        return r;
    });
    if (['paid', 'review', 'cancelled', 'rejected'].includes(row.state))
        return row.id;
    let result: unknown;
    try {
        const sdk = webpaySdk();
        result = await sdk.status(token);
        if (!aborted && (result as {
            status?: string;
        }).status === 'INITIALIZED')
            result = await sdk.commit(token);
    }
    catch {
        await clientPool().query(`UPDATE ${t('oc_client_webpay')} SET state='unknown',updated_at=now() WHERE id=$1`, [row.id]);
        throw new WebpayError('PROVIDER_UNAVAILABLE', 'El pago está pendiente de verificación. No pagues nuevamente.', 503);
    }
    return tx(async (db) => {
        await db.query(`SELECT id FROM ${t('oc_client_user')} WHERE id=$1 FOR UPDATE`, [row.user_id]);
        if (row.sale_id)
            await db.query(`SELECT id FROM ${t('oc_client_sales')} WHERE id=$1 FOR UPDATE`, [row.sale_id]);
        const current = (await db.query<Row>(`SELECT ${fields} FROM ${t('oc_client_webpay')} WHERE id=$1 FOR UPDATE`, [row.id])).rows[0];
        if (current.state === 'paid' || current.state === 'review')
            return row.id;
        let approved;
        try {
            approved = validateAuthorization(result, { amount: Number(row.amount), buyOrder: row.buy_order, sessionId: row.session_id });
        }
        catch {
            await db.query(`UPDATE ${t('oc_client_webpay')} SET state='review',updated_at=now() WHERE id=$1`, [row.id]);
            await event(db, row.id, 'provider_response_mismatch');
            return row.id;
        }
        if (!approved.authorized) {
            const definitive = ['FAILED', 'REVERSED', 'NULLIFIED', 'PARTIALLY_NULLIFIED'].includes(approved.status);
            await db.query(`UPDATE ${t('oc_client_webpay')} SET state=$2,updated_at=now() WHERE id=$1`, [row.id, definitive ? (aborted ? 'cancelled' : 'rejected') : 'unknown']);
            await event(db, row.id, 'authorization_not_confirmed');
            return row.id;
        }
        let paymentId: string | null = null;
        if (row.kind === 'credit') {
            await db.query('SAVEPOINT webpay_ledger');
            try {
                paymentId = await recordSalePayment({ saleId: row.sale_id, requestKey: row.id, amount: Number(row.principal), interestAmount: Number(row.interest), paidOn: todayChile(), reference: 'Webpay Plus ' + row.buy_order }, 'webpay-plus', db);
            }
            catch (error) {
                await db.query('ROLLBACK TO SAVEPOINT webpay_ledger');
                if (!(error instanceof SaleError))
                    throw error;
                await db.query(`UPDATE ${t('oc_client_webpay')} SET state='review',authorized_at=now(),updated_at=now() WHERE id=$1`, [row.id]);
                await event(db, row.id, 'authorized_needs_ledger_review');
                return row.id;
            }
        }
        await db.query(`UPDATE ${t('oc_client_webpay')} SET state='paid',authorized_at=now(),payment_id=$2,updated_at=now() WHERE id=$1`, [row.id, paymentId]);
        await event(db, row.id, 'authorized_and_recorded');
        return row.id;
    });
}
// Status-only recovery: an administrator cannot authorize a purchase on behalf of a customer.
export async function reconcileWebpayPayment(id: string) {
    paymentIdentifier(id);
    const r = (await clientPool().query<Row>(`SELECT ${fields} FROM ${t('oc_client_webpay')} WHERE id=$1`, [id])).rows[0];
    if (!r?.token_enc)
        throw new WebpayError('MANUAL_REVIEW', 'Este intento requiere revisión con Transbank antes de liberar un nuevo pago.', 409);
    await returnWebpayPayment(revealClientValue(r.token_enc, 'webpay-token'), true);
    return getWebpayPayment(id, r.user_id);
}
