import "server-only";
import { clientPool, clientTable as t } from "./db";
import { InvalidHistoryCursor } from "./private-read";
import type { CustomerHistoryPage, CustomerPaymentPage } from "./history-types";
import type { SalePayment } from "./sales-types";

export const HISTORY_PAGE_SIZE = 10;
type Row = Record<string, unknown>;
function cursor(row: Row) { return Buffer.from(JSON.stringify([row.cursor_date, row.id])).toString("base64url"); }
function position(value: string | null): [string | null, string | null] {
  if (!value) return [null, null];
  if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new InvalidHistoryCursor();
  try {
    const decoded: unknown = JSON.parse(Buffer.from(value, "base64url").toString());
    if (!Array.isArray(decoded) || decoded.length !== 2 || typeof decoded[0] !== "string" || decoded[0].length > 64 || !Number.isFinite(Date.parse(decoded[0])) || typeof decoded[1] !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(decoded[1])) throw new Error();
    return [decoded[0], decoded[1]];
  } catch { throw new InvalidHistoryCursor(); }
}
function payment(p: Row): SalePayment { return { id:String(p.id), amount:Number(p.amount), paidOn:String(p.paid_on), reference:String(p.reference), reversed:Boolean(p.reversed_at),interestAmount:Number(p.interest_amount??0),interestWaived:Number(p.interest_waived??0),totalAmount:Number(p.amount)+Number(p.interest_amount??0) }; }
/** Every page, including its nested rows, is scoped to the authenticated owner. */
export async function getCustomerHistoryPage(userId: string, creditOnly: boolean, after: string | null, onlySale: string | null = null): Promise<CustomerHistoryPage> {
  const [date,id] = position(after);
  const result = await clientPool().query(`WITH page AS (
    SELECT id,product_name,quantity,total,net,vat,deposit,credit,remaining,tier_code,created_at,commitment_version,status,signed_at
    FROM ${t("oc_client_sales")} WHERE user_id=$1 AND (NOT $2::boolean OR credit>0)
    AND ($3::timestamptz IS NULL OR (created_at,id)<($3::timestamptz,$4::text)) AND ($5::text IS NULL OR id=$5) ORDER BY created_at DESC,id DESC LIMIT 11
  ) SELECT s.*,s.created_at::text AS cursor_date,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'number',i.number,'dueDate',i.due_date::text,'amount',i.amount,'paid',i.paid) ORDER BY i.number) FROM ${t("oc_client_installments")} i WHERE i.sale_id=s.id),'[]') AS installments,
    COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC,p.id DESC) FROM (
      SELECT id,amount,paid_on::text,reference,reversed_at,COALESCE((to_jsonb(pay)->>'interest_amount')::int,0) AS interest_amount,COALESCE((to_jsonb(pay)->>'interest_waived')::int,0) AS interest_waived,created_at,created_at::text AS cursor_date FROM ${t("oc_client_payments")} pay WHERE sale_id=s.id ORDER BY created_at DESC,id DESC LIMIT 11
    ) p),'[]') AS payments FROM page s ORDER BY s.created_at DESC,s.id DESC`, [userId,creditOnly,date,id,onlySale]);
  const rows: Row[] = result.rows;
  return { sales: rows.slice(0,HISTORY_PAGE_SIZE).map(s => {
    const payments = s.payments as Row[];
    return { id:String(s.id),productName:String(s.product_name),quantity:Number(s.quantity),total:Number(s.total),net:Number(s.net),vat:Number(s.vat),deposit:Number(s.deposit),credit:Number(s.credit),remaining:Number(s.remaining),tierCode:String(s.tier_code),createdAt:new Date(String(s.created_at)).toISOString(),status:s.status as "active" | "cancelled",signedAt:s.signed_at?new Date(String(s.signed_at)).toISOString():null,commitmentVersion:String(s.commitment_version),installments:s.installments as CustomerHistoryPage["sales"][number]["installments"],payments:payments.slice(0,HISTORY_PAGE_SIZE).map(payment),paymentsNextCursor:payments.length>HISTORY_PAGE_SIZE?cursor(payments[HISTORY_PAGE_SIZE-1]):null };
  }), nextCursor:rows.length>HISTORY_PAGE_SIZE?cursor(rows[HISTORY_PAGE_SIZE-1]):null };
}
export async function getCustomerPaymentPage(userId: string, saleId: string, after: string | null): Promise<CustomerPaymentPage | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(saleId)) throw new InvalidHistoryCursor();
  const [date,id] = position(after);
  const result = await clientPool().query(`SELECT COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC,p.id DESC) FROM (
    SELECT id,amount,paid_on::text,reference,reversed_at,COALESCE((to_jsonb(pay)->>'interest_amount')::int,0) AS interest_amount,COALESCE((to_jsonb(pay)->>'interest_waived')::int,0) AS interest_waived,created_at,created_at::text AS cursor_date FROM ${t("oc_client_payments")} pay
    WHERE sale_id=s.id AND ($3::timestamptz IS NULL OR (created_at,id)<($3::timestamptz,$4::text)) ORDER BY created_at DESC,id DESC LIMIT 11
  ) p),'[]') AS payments FROM ${t("oc_client_sales")} s WHERE s.id=$2 AND s.user_id=$1`, [userId,saleId,date,id]);
  if (!result.rows[0]) return null;
  const rows: Row[] = result.rows[0].payments;
  return { payments:rows.slice(0,HISTORY_PAGE_SIZE).map(payment),nextCursor:rows.length>HISTORY_PAGE_SIZE?cursor(rows[HISTORY_PAGE_SIZE-1]):null };
}

export async function getCustomerDocumentSale(userId:string, saleId:string) {
 if (!/^[A-Za-z0-9_-]{1,128}$/.test(saleId)) return null;
 return (await getCustomerHistoryPage(userId,false,null,saleId)).sales[0] ?? null;
}
