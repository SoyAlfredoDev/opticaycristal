import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { clientPool, clientTable as t } from "./db";
import { normalizeClientRut, validClientRut } from "./validation";
import { clientFingerprint } from "./privacy";
import { getStoredCommitment,prepareCommitment } from "./commitments";
import { calculateLateInterest } from "./loan-interest";
import { calculateFinancing, monthlyInstallments } from "./financing";
import type { CustomerSale, SaleInput, SaleProduct, SaleQuote } from "./sales-types";

export class SaleError extends Error {}
export function todayChile() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
export function whole(value: unknown, label: string, min = 0, max = 1_000_000_000): number {
 if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new SaleError(`${label}: ingresa un número entero válido.`);
 return value;
}
export function textValue(value: unknown, label: string, max = 120): string {
 if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new SaleError(`${label} no válido.`);
 return value.trim();
}
export function requestKey(value: unknown) {
 const key = textValue(value, "Identificador", 36);
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) throw new SaleError("Identificador no válido.");
 return key;
}
function categoryPolicy(raw: unknown) {
 if (raw === undefined) return undefined;
 if (raw !== "category") throw new SaleError("La regla de cálculo no es válida.");
 return "category" as const;
}
function validDate(value: unknown) {
 const date = textValue(value, "Fecha", 10);
 try { monthlyInstallments(1, 1, date); } catch { throw new SaleError("Fecha no válida."); }
 return date;
}
export function parseSale(raw: unknown): SaleInput {
 if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new SaleError("Datos no válidos.");
 const b = raw as Record<string, unknown>;
 const policy=categoryPolicy(b.pricingPolicy);
 return { customerId: textValue(b.customerId, "Cliente"), productId: textValue(b.productId, "Producto"),
 quantity: whole(b.quantity, "Cantidad", 1, 100), total: whole(b.total, "Total", 1), credit: whole(b.credit, "Crédito"),
 installmentCount: whole(b.installmentCount, "Cuotas", 0, 4), firstDueDate: typeof b.firstDueDate === "string" ? b.firstDueDate : "",
 identityChecked: b.identityChecked === true, depositReceived: b.depositReceived === true, requestKey: requestKey(b.requestKey),...(b.conditionsReviewed!==undefined?{conditionsReviewed:b.conditionsReviewed===true}:{}),...(b.unitProtectedCost!==undefined?{unitProtectedCost:whole(b.unitProtectedCost,"Costo protegido por unidad",1)}:{}),...(policy?{pricingPolicy:policy}:{}) };
}
export async function findCustomerByRut(rut: unknown) {
 const normalized = normalizeClientRut(textValue(rut, "RUT", 20));
 if (!validClientRut(normalized)) throw new SaleError("Revisa el RUT y su dígito verificador.");
 const r = await clientPool().query(`SELECT id FROM ${t("oc_client_user")} WHERE "rutHash"=$1`, [clientFingerprint(normalized,"rut")]);
 if (!r.rows[0]) throw new SaleError("El cliente no está registrado. Debe crear su cuenta antes de registrar la venta.");
 return String(r.rows[0].id);
}
export async function listSaleProducts(): Promise<SaleProduct[]> {
 const r = await clientPool().query(`SELECT id,name,protected_cost FROM ${t("oc_client_products")} ORDER BY name,id`);
 return r.rows.map(p => ({ id: p.id, name: p.name, protectedCost: p.protected_cost===null?null:Number(p.protected_cost) }));
}
export async function saveSaleProduct(raw: unknown, actor: string) {
 const b = raw as Record<string, unknown>;
 if (!b || typeof b !== "object") throw new SaleError("Producto no válido.");
 const id = b.id ? textValue(b.id,"Producto") : randomUUID();
 const name = textValue(b.name,"Nombre del producto");
 if (name.length < 2) throw new SaleError("El nombre debe tener al menos dos caracteres.");
 const cost = b.protectedCost===null?null:whole(b.protectedCost,"Costo protegido",1);
 try{await transaction(async db=>{
  await db.query("SELECT pg_advisory_xact_lock(hashtext($1))",[id]);
  const old=(await db.query(`SELECT name,protected_cost FROM ${t("oc_client_products")} WHERE id=$1 FOR UPDATE`,[id])).rows[0];
  await db.query(`INSERT INTO ${t("oc_client_products")}(id,name,protected_cost,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,protected_cost=EXCLUDED.protected_cost,updated_by=EXCLUDED.updated_by,updated_at=now()`,[id,name,cost,actor]);
  await db.query(`INSERT INTO ${t("oc_client_product_changes")}(id,product_id,old_name,old_cost,new_name,new_cost,actor) VALUES($1,$2,$3,$4,$5,$6,$7)`,[randomUUID(),id,old?.name??null,old?.protected_cost??null,name,cost,actor]);
 });}catch(error){if(cost===null&&error&&typeof error==="object"&&"code" in error&&error.code==="23502")throw new SaleError("El catálogo todavía no admite costos variables. Falta activar esta actualización.");throw error;}
 return id;
}
async function transaction<T>(work: (db: PoolClient) => Promise<T>) {
 const db = await clientPool().connect();
 try { await db.query("BEGIN"); const result = await work(db); await db.query("COMMIT"); return result; }
 catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
}
async function quoteWith(db: Pick<PoolClient,"query">, b: Pick<SaleInput,"customerId"|"productId"|"quantity"|"total"|"unitProtectedCost"|"pricingPolicy">, lock = false): Promise<SaleQuote & { productName: string; tierCode: string; maxPercent: number; maxAmount: number }> {
 const r = await db.query(`SELECT u."emailVerified",u.category,tier.max_percent,tier.max_amount,tier.max_installments,b.principal_outstanding
 FROM ${t("oc_client_user")} u JOIN ${t("oc_client_tiers")} tier ON tier.code=u.category
 JOIN ${t("oc_client_credit_balances")} b ON b.user_id=u.id WHERE u.id=$1 ${lock ? "FOR UPDATE OF u,b" : ""}`,[b.customerId]);
 const c = r.rows[0]; if (!c) throw new SaleError("Cliente no encontrado.");
 const p = (await db.query(`SELECT name,protected_cost FROM ${t("oc_client_products")} WHERE id=$1 ${lock ? "FOR SHARE" : ""}`,[b.productId])).rows[0];
 if (!p) throw new SaleError("Selecciona un producto configurado.");
 const categoryOnly=b.pricingPolicy==="category";
 const unitCost=categoryOnly?0:p.protected_cost===null?whole(b.unitProtectedCost,"Costo protegido por unidad",1):Number(p.protected_cost);
 const cost = categoryOnly?0:whole(unitCost * whole(b.quantity,"Cantidad",1,100),"Costo protegido",1);
 const total = whole(b.total,"Total",1);
 const tier = { maxPercent: Number(c.max_percent), maxAmount: Number(c.max_amount), maxInstallments: Number(c.max_installments) };
 const quote = calculateFinancing({ total, protectedCost: cost, outstanding: Number(c.principal_outstanding), tier });
 const active = Number(c.principal_outstanding) > 0;
 const enabled = c.emailVerified === true && !active;
 const net = Math.round(total * 100 / 119);
 return { total, net, vat: total-net, protectedCost: categoryOnly?null:cost, maximumCredit: enabled ? quote.maximumCredit : 0,
 minimumDeposit: enabled ? quote.minimumDeposit : total, maxInstallments: tier.maxInstallments, enabled,
 reason: !c.emailVerified ? "Debe verificar el correo para financiar." : active ? "Ya tiene un financiamiento pendiente; puede registrar una venta al contado." : "",
 productName: String(p.name), tierCode: String(c.category), maxPercent: tier.maxPercent, maxAmount: tier.maxAmount };
}
export async function quoteSale(raw: unknown): Promise<SaleQuote> {
 const b = raw as Record<string,unknown>;
 if (!b || typeof b !== "object") throw new SaleError("Datos no válidos.");
 const policy=categoryPolicy(b.pricingPolicy);
 return quoteWith(clientPool(), { customerId: textValue(b.customerId,"Cliente"), productId: textValue(b.productId,"Producto"), quantity: whole(b.quantity,"Cantidad",1,100), total: whole(b.total,"Total",1),...(b.unitProtectedCost!==undefined?{unitProtectedCost:whole(b.unitProtectedCost,"Costo protegido por unidad",1)}:{}),...(policy?{pricingPolicy:policy}:{}) });
}
export async function createSale(input: SaleInput, actor: string) {
 return transaction(async db => {
  // Serialize sales and payments for this customer before checking limits.
  const user = await db.query(`SELECT id FROM ${t("oc_client_user")} WHERE id=$1 FOR UPDATE`,[input.customerId]);
  if (!user.rows[0]) throw new SaleError("Cliente no encontrado.");
  const previous = (await db.query(`SELECT id,request_data FROM ${t("oc_client_sales")} WHERE request_key=$1`,[input.requestKey])).rows[0];
  const canonical = { ...input }; delete (canonical as Partial<SaleInput>).requestKey;
  if (previous) {
   if (JSON.stringify(Object.entries(previous.request_data).sort()) !== JSON.stringify(Object.entries(canonical).sort())) throw new SaleError("La solicitud ya se usó con otros datos.");
   return String(previous.id);
  }
  const q = await quoteWith(db,input,true);
  if (input.conditionsReviewed===false) throw new SaleError("Confirma la revisión de las condiciones con el cliente.");
  if (!input.depositReceived) throw new SaleError("Confirma el pago recibido del pie o del total al contado.");
  if (input.credit > q.maximumCredit) throw new SaleError(q.reason || "El crédito supera el máximo permitido. Vuelve a calcular.");
  if (input.credit > 0 && !input.identityChecked) throw new SaleError("Confirma la revisión presencial de cédula.");
  if (input.credit > 0 && (input.installmentCount < 1 || input.installmentCount > q.maxInstallments)) throw new SaleError("Las cuotas superan las condiciones del nivel.");
  if (input.credit === 0 && input.installmentCount !== 0) throw new SaleError("Una venta al contado no tiene cuotas.");
  const date = input.credit ? validDate(input.firstDueDate) : "";
  if (date && date <= todayChile()) throw new SaleError("La primera cuota debe vencer después de hoy.");
  const schedule = input.credit ? monthlyInstallments(input.credit,input.installmentCount,date) : [];
  const id = randomUUID();
  await db.query(`INSERT INTO ${t("oc_client_sales")}(id,user_id,request_key,request_data,product_id,product_name,quantity,protected_cost,total,net,vat,deposit,credit,remaining,tier_code,max_percent,max_amount,installment_count,identity_checked,commitment_version,created_by)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,$14,$15,$16,$17,$18,'2026-10-29-v1',$19)`,
  [id,input.customerId,input.requestKey,JSON.stringify(canonical),input.productId,q.productName,input.quantity,q.protectedCost,q.total,q.net,q.vat,q.total-input.credit,input.credit,q.tierCode,q.maxPercent,q.maxAmount,input.installmentCount,input.identityChecked,actor]);
  for (const i of schedule) await db.query(`INSERT INTO ${t("oc_client_installments")}(id,sale_id,number,due_date,amount) VALUES($1,$2,$3,$4,$5)`,[randomUUID(),id,i.number,i.dueDate,i.amount]);
  await db.query(`UPDATE ${t("oc_client_credit_balances")} SET principal_outstanding=principal_outstanding+$2,updated_at=now() WHERE user_id=$1`,[input.customerId,input.credit]);
  if(input.credit>0)await prepareCommitment(id,actor,db);
  return id;
 });
}
export async function recordSalePayment(raw: unknown, actor: string) {
 const b = raw as Record<string,unknown>;
 if (!b || typeof b !== "object") throw new SaleError("Pago no válido.");
 const saleId = textValue(b.saleId,"Venta"), key = requestKey(b.requestKey), amount = whole(b.amount,"Capital pagado",0);
 const interestAmount=whole(b.interestAmount??0,"Mora pagada",0),interestWaived=whole(b.interestWaived??0,"Mora condonada",0);
 if(amount+interestAmount+interestWaived<1)throw new SaleError("Ingresa un pago o una condonación mayor a cero.");
 const waiverReason=interestWaived?textValue(b.waiverReason,"Motivo de condonación",240):null;
 if(waiverReason&&waiverReason.length<3)throw new SaleError("Indica el motivo de la condonación.");
 const paidOn = validDate(b.paidOn), reference = textValue(b.reference,"Referencia del pago",160);
 if (paidOn > todayChile()) throw new SaleError("La fecha del pago no puede estar en el futuro.");
 return transaction(async db => {
  const owner = (await db.query(`SELECT user_id FROM ${t("oc_client_sales")} WHERE id=$1`,[saleId])).rows[0];
  if (!owner) throw new SaleError("Venta no encontrada.");
  await db.query(`SELECT id FROM ${t("oc_client_user")} WHERE id=$1 FOR UPDATE`,[owner.user_id]);
  const sale = (await db.query(`SELECT remaining,created_at,status,signed_at FROM ${t("oc_client_sales")} WHERE id=$1 FOR UPDATE`,[saleId])).rows[0];
  const previous = (await db.query(`SELECT id,sale_id,amount,paid_on::text,reference,COALESCE((to_jsonb(p)->>'interest_amount')::int,0) AS interest_amount,COALESCE((to_jsonb(p)->>'interest_waived')::int,0) AS interest_waived,to_jsonb(p)->>'interest_waiver_reason' AS interest_waiver_reason FROM ${t("oc_client_payments")} p WHERE request_key=$1`,[key])).rows[0];
  if (previous) {
   if (previous.sale_id !== saleId || Number(previous.amount)!==amount || previous.paid_on!==paidOn || previous.reference!==reference || Number(previous.interest_amount??0)!==interestAmount || Number(previous.interest_waived??0)!==interestWaived || (previous.interest_waiver_reason??null)!==waiverReason) throw new SaleError("La solicitud ya se usó con otros datos.");
   return String(previous.id);
  }
  if(sale.status!=="active") throw new SaleError("La venta está anulada.");
  if (amount > Number(sale.remaining)) throw new SaleError("El pago supera el saldo pendiente.");
  const createdDay = new Intl.DateTimeFormat("en-CA",{ timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit" }).format(new Date(sale.created_at));
  if (paidOn < createdDay) throw new SaleError("El pago no puede ser anterior a la venta.");
  const installments = await db.query(`SELECT id,amount,paid,due_date::text FROM ${t("oc_client_installments")} WHERE sale_id=$1 ORDER BY number FOR UPDATE`,[saleId]);
  const contract=await getStoredCommitment(saleId,owner.user_id,db);
  if(contract?.lateAnnualRate){
   if(!sale.signed_at)throw new SaleError("Confirma la firma presencial antes de liquidar la mora de este contrato.");
   const history=await db.query(`SELECT amount,paid_on::text,interest_amount,interest_waived FROM ${t("oc_client_payments")} WHERE sale_id=$1 AND reversed_at IS NULL ORDER BY paid_on,created_at,id`,[saleId]);
   if(history.rows.some(p=>p.paid_on>paidOn))throw new SaleError("La fecha no puede ser anterior al último pago registrado de este contrato.");
   const interest=calculateLateInterest(installments.rows.map(i=>({amount:Number(i.amount),dueDate:i.due_date})),history.rows.map(p=>({amount:Number(p.amount),paidOn:p.paid_on,interestAmount:Number(p.interest_amount),interestWaived:Number(p.interest_waived)})),paidOn,Math.min(contract.lateAnnualRate,contract.legalAnnualMaximum),contract.lateGraceDays,new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(sale.signed_at)));
   if(interestAmount+interestWaived>interest.due)throw new SaleError("La mora registrada supera el importe calculado para esa fecha.");
   if(amount===Number(sale.remaining)&&interestAmount+interestWaived!==interest.due)throw new SaleError(`Para cerrar el crédito debes pagar o condonar la mora pendiente: ${interest.due} pesos.`);
  }else if(interestAmount||interestWaived)throw new SaleError("Esta venta no tiene una cláusula de mora aplicable.");
  let rest = amount;
  for (const i of installments.rows) {
   const applied = Math.min(rest,Number(i.amount)-Number(i.paid));
   if (applied) await db.query(`UPDATE ${t("oc_client_installments")} SET paid=paid+$2 WHERE id=$1`,[i.id,applied]);
   rest -= applied;
  }
  if (rest) throw new SaleError("No se pudo conciliar el saldo de cuotas.");
  const id = randomUUID();
  await db.query(`INSERT INTO ${t("oc_client_payments")}(id,sale_id,request_key,amount,paid_on,reference,created_by,interest_amount,interest_waived,interest_waiver_reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[id,saleId,key,amount,paidOn,reference,actor,interestAmount,interestWaived,waiverReason]);
  await db.query(`UPDATE ${t("oc_client_sales")} SET remaining=remaining-$2 WHERE id=$1`,[saleId,amount]);
  await db.query(`UPDATE ${t("oc_client_credit_balances")} SET principal_outstanding=principal_outstanding-$2,updated_at=now() WHERE user_id=$1`,[owner.user_id,amount]);
  return id;
 });
}
/** Explicit public projection: costs, request payloads and staff identifiers never reach customers. */
export async function listCustomerSales(userId: string): Promise<CustomerSale[]> {
 const sales = await clientPool().query(`SELECT id,product_name,quantity,total,net,vat,deposit,credit,remaining,tier_code,created_at,commitment_version,status,signed_at FROM ${t("oc_client_sales")} WHERE user_id=$1 ORDER BY created_at DESC,id DESC`,[userId]);
 if (!sales.rows.length) return [];
 const ids = sales.rows.map(s=>s.id);
 const [installments,payments] = await Promise.all([
  clientPool().query(`SELECT id,sale_id,number,due_date::text,amount,paid FROM ${t("oc_client_installments")} WHERE sale_id=ANY($1::text[]) ORDER BY number`,[ids]),
  clientPool().query(`SELECT id,sale_id,amount,paid_on::text,reference,reversed_at,COALESCE((to_jsonb(pay)->>'interest_amount')::int,0) AS interest_amount,COALESCE((to_jsonb(pay)->>'interest_waived')::int,0) AS interest_waived FROM ${t("oc_client_payments")} pay WHERE sale_id=ANY($1::text[]) ORDER BY created_at`,[ids])
 ]);
 return sales.rows.map(s=>({ id:s.id,productName:s.product_name,quantity:Number(s.quantity),total:Number(s.total),net:Number(s.net),vat:Number(s.vat),deposit:Number(s.deposit),credit:Number(s.credit),remaining:Number(s.remaining),tierCode:s.tier_code,createdAt:new Date(s.created_at).toISOString(),status:s.status,signedAt:s.signed_at?new Date(s.signed_at).toISOString():null,commitmentVersion:s.commitment_version,
 installments:installments.rows.filter(i=>i.sale_id===s.id).map(i=>({id:i.id,number:Number(i.number),dueDate:i.due_date,amount:Number(i.amount),paid:Number(i.paid)})),
 payments:payments.rows.filter(p=>p.sale_id===s.id).map(p=>({id:p.id,amount:Number(p.amount),paidOn:p.paid_on,reference:p.reference,reversed:Boolean(p.reversed_at),interestAmount:Number(p.interest_amount??0),interestWaived:Number(p.interest_waived??0),totalAmount:Number(p.amount)+Number(p.interest_amount??0)})) }));
}

async function lockedSale(db: PoolClient, saleId: string) {
 const owner=(await db.query(`SELECT user_id FROM ${t("oc_client_sales")} WHERE id=$1`,[saleId])).rows[0];
 if(!owner)throw new SaleError("Venta no encontrada.");
 await db.query(`SELECT id FROM ${t("oc_client_user")} WHERE id=$1 FOR UPDATE`,[owner.user_id]);
 return (await db.query(`SELECT * FROM ${t("oc_client_sales")} WHERE id=$1 FOR UPDATE`,[saleId])).rows[0];
}
export async function changeSaleState(raw: unknown, actor: string) {
 const b=raw as Record<string,unknown>;
 if(!b||typeof b!=="object")throw new SaleError("Solicitud no válida.");
 const id=textValue(b.saleId,"Venta");
 return transaction(async db=>{
  const sale=await lockedSale(db,id);
  if(b.action==="sign") {
   if(sale.status!=="active"||!Number(sale.credit))throw new SaleError("Esta venta no admite firma.");
   await db.query(`UPDATE ${t("oc_client_sales")} SET signed_at=COALESCE(signed_at,now()),signed_by=COALESCE(signed_by,$2) WHERE id=$1`,[id,actor]);
  } else if(b.action==="cancel") {
   const reason=textValue(b.reason,"Motivo",240);
   if(sale.status==="cancelled")return id;
   const payments=await db.query(`SELECT id FROM ${t("oc_client_payments")} WHERE sale_id=$1 AND reversed_at IS NULL LIMIT 1`,[id]);
   if(payments.rows.length)throw new SaleError("Revierte los pagos de esta venta antes de anularla.");
   await db.query(`UPDATE ${t("oc_client_sales")} SET status='cancelled',remaining=0,cancelled_at=now(),cancelled_by=$2,cancel_reason=$3 WHERE id=$1`,[id,actor,reason]);
   await db.query(`UPDATE ${t("oc_client_credit_balances")} SET principal_outstanding=principal_outstanding-$2,updated_at=now() WHERE user_id=$1`,[sale.user_id,Number(sale.remaining)]);
  } else throw new SaleError("Acción no válida.");
  return id;
 });
}
export async function reverseSalePayment(raw: unknown,actor:string) {
 const b=raw as Record<string,unknown>;
 if(!b||typeof b!=="object")throw new SaleError("Solicitud no válida.");
 const id=textValue(b.paymentId,"Pago"),reason=textValue(b.reason,"Motivo",240);
 return transaction(async db=>{
  const payment=(await db.query(`SELECT * FROM ${t("oc_client_payments")} WHERE id=$1`,[id])).rows[0];
  if(!payment)throw new SaleError("Pago no encontrado.");
  const sale=await lockedSale(db,payment.sale_id);
  const current=(await db.query(`SELECT reversed_at FROM ${t("oc_client_payments")} WHERE id=$1 FOR UPDATE`,[id])).rows[0];
  if(current.reversed_at)return id;
  if(sale.status!=="active")throw new SaleError("La venta está anulada.");
  if(Number(sale.remaining)===0&&Number(payment.amount)===0&&(Number(payment.interest_amount)||Number(payment.interest_waived)))throw new SaleError("Reabre primero el último pago de capital antes de revertir una liquidación de mora de un crédito cerrado.");
  const other=await db.query(`SELECT id FROM ${t("oc_client_sales")} WHERE user_id=$1 AND id<>$2 AND remaining>0 LIMIT 1`,[sale.user_id,sale.id]);
  if(other.rows.length)throw new SaleError("Existe otro crédito activo. Resuélvelo antes de reabrir este saldo.");
  await db.query(`UPDATE ${t("oc_client_payments")} SET reversed_at=now(),reversed_by=$2,reverse_reason=$3 WHERE id=$1`,[id,actor,reason]);
  const sum=(await db.query(`SELECT COALESCE(sum(amount),0)::int AS paid FROM ${t("oc_client_payments")} WHERE sale_id=$1 AND reversed_at IS NULL`,[sale.id])).rows[0];
  let paid=Number(sum.paid);
  const installments=await db.query(`SELECT id,amount FROM ${t("oc_client_installments")} WHERE sale_id=$1 ORDER BY number FOR UPDATE`,[sale.id]);
  for(const i of installments.rows){const allocated=Math.min(paid,Number(i.amount));paid-=allocated;await db.query(`UPDATE ${t("oc_client_installments")} SET paid=$2 WHERE id=$1`,[i.id,allocated]);}
  const remaining=Number(sale.credit)-Number(sum.paid);
  await db.query(`UPDATE ${t("oc_client_sales")} SET remaining=$2 WHERE id=$1`,[sale.id,remaining]);
  await db.query(`UPDATE ${t("oc_client_credit_balances")} SET principal_outstanding=principal_outstanding+$2,updated_at=now() WHERE user_id=$1`,[sale.user_id,remaining-Number(sale.remaining)]);
  return id;
 });
}
