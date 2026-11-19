import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { clientPool, clientTable as t } from "./db";
import { SaleControlError } from "./sale-control";
import { SALES_PAGE_SIZE, type AdminSalePage } from "./sales-register-types";

export async function listAdminSales(search: string, offset: number, seller: string | null): Promise<AdminSalePage> {
  if (search.length > 100 || !Number.isSafeInteger(offset) || offset < 0 || offset > 10000)
    throw new SaleControlError("Revisa la búsqueda o la página.");
  const term = search.trim().toLowerCase().replace(/[\\%_]/g, "\\$&");
  const result = await clientPool().query(`
    SELECT s.id,s.user_id,u.name,s.product_name,s.total,s.deposit,s.credit,s.remaining,s.status,s.created_at,
      c.control_number,COALESCE(c.version,0)::text AS control_version,
      o.reason AS override_reason,o.percent_maximum,o.applied_credit,o.actor AS override_actor,o.created_at AS override_at,
      a.confirmed_by AS signed_by,a.confirmed_at AS signed_at,
      f.uploaded_by,f.uploaded_at,f.pages AS uploaded_pages
    FROM ${t("oc_client_sales")} s
    JOIN ${t("oc_client_user")} u ON u.id=s.user_id
    LEFT JOIN ${t("oc_client_sale_controls")} c ON c.sale_id=s.id
    LEFT JOIN ${t("oc_client_sale_credit_overrides")} o ON o.sale_id=s.id
    LEFT JOIN ${t("oc_client_agreement_acceptances")} a ON a.sale_id=s.id
    LEFT JOIN ${t("oc_client_sale_commitment_uploads")} f ON f.sale_id=s.id
    WHERE ($1::text IS NULL OR s.created_by=$1)
      AND ($2='' OR lower(u.name) LIKE '%'||$2||'%' OR lower(s.product_name) LIKE '%'||$2||'%'
        OR lower(COALESCE(c.control_number,'')) LIKE '%'||$2||'%' OR s.id=$3)
    ORDER BY s.created_at DESC,s.id DESC LIMIT $4 OFFSET $5`,
    [seller, term, search.trim(), SALES_PAGE_SIZE + 1, offset]);
  return {
    sales: result.rows.slice(0, SALES_PAGE_SIZE).map(row => ({
      id: row.id, customerId: row.user_id, customerName: row.name, productName: row.product_name,
      total: Number(row.total), deposit: Number(row.deposit), credit: Number(row.credit),
      remaining: Number(row.remaining), status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
      controlNumber: row.control_number ?? null, controlVersion: row.control_version,
      commitmentFile: row.signed_at ? {source:"signed",uploadedBy:row.signed_by,uploadedAt:new Date(row.signed_at).toISOString()} :
        row.uploaded_at ? {source:"upload",uploadedBy:row.uploaded_by,uploadedAt:new Date(row.uploaded_at).toISOString(),pages:Number(row.uploaded_pages)} : null,
      creditOverride:row.override_reason?{reason:row.override_reason,standardCredit:Number(row.percent_maximum),appliedCredit:Number(row.applied_credit),actor:row.override_actor,createdAt:new Date(row.override_at).toISOString()}:null,
    })),
    hasMore: result.rows.length > SALES_PAGE_SIZE,
  };
}

export async function insertAutomaticSaleControl(db: PoolClient, saleId: string, actor: string) {
  const {rows:[row]} = await db.query(`INSERT INTO ${t("oc_client_sale_controls")}(sale_id) VALUES($1) RETURNING control_number`,[saleId]);
  if(!row?.control_number)throw new SaleControlError("No pudimos generar el control interno.",503);
  await db.query(`INSERT INTO ${t("oc_client_sale_control_changes")}(id,sale_id,previous_number,control_number,actor)
    VALUES($1,$2,NULL,$3,$4)`,[randomUUID(),saleId,row.control_number,actor]);
  return String(row.control_number);
}

export async function saleControlNumber(saleId:string) {
  const {rows:[row]}=await clientPool().query(`SELECT control_number FROM ${t("oc_client_sale_controls")} WHERE sale_id=$1`,[saleId]);
  return row?.control_number??null;
}
