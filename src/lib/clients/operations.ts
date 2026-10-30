import "server-only";
import { clientPool,clientTable as t } from "./db";
import { parseSale,recordSalePayment,createSale,requestKey,SaleError } from "./sales";
export async function prepareSaleOperation(raw: Record<string,unknown>,actor:string) {
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new SaleError("Datos no válidos.");
 const kind=raw.action;
 if(kind!=="create"&&kind!=="payment")throw new SaleError("Operación no válida.");
 const key=requestKey(raw.requestKey);
 const payload=kind==="create"?{...parseSale(raw),action:kind}:{action:kind,saleId:raw.saleId,requestKey:key,amount:raw.amount,paidOn:raw.paidOn,reference:raw.reference};
 await clientPool().query(`INSERT INTO ${t("oc_client_operations")}(request_key,actor,kind,payload) VALUES($1,$2,$3,$4) ON CONFLICT(request_key) DO NOTHING`,[key,actor,kind,JSON.stringify(payload)]);
 const stored=(await clientPool().query(`SELECT actor,payload FROM ${t("oc_client_operations")} WHERE request_key=$1`,[key])).rows[0];
 const canonical=(x:Record<string,unknown>)=>JSON.stringify(Object.entries(x).sort());
 if(!stored||stored.actor!==actor||canonical(stored.payload)!==canonical(payload))throw new SaleError("La operación pertenece a otro registro. Retoma la operación pendiente.");
 return key;
}
export async function recoverSaleOperation(keyValue: unknown,actor:string) {
 const key=requestKey(keyValue);
 const op=(await clientPool().query(`SELECT kind,payload FROM ${t("oc_client_operations")} WHERE request_key=$1 AND actor=$2`,[key,actor])).rows[0];
 if(!op)return null;
 const table=op.kind==="create"?"oc_client_sales":"oc_client_payments";
 const result=(await clientPool().query(`SELECT id FROM ${t(table)} WHERE request_key=$1`,[key])).rows[0];
 return {kind:op.kind,payload:op.payload,resultId:result?.id??null};
}

export async function executeSaleOperation(keyValue:unknown,actor:string) {
 const key=requestKey(keyValue);
 const op=(await clientPool().query(`SELECT kind,payload FROM ${t("oc_client_operations")} WHERE request_key=$1 AND actor=$2`,[key,actor])).rows[0];
 if(!op)throw new SaleError("Operación no encontrada.");
 return op.kind==="create"?createSale(parseSale(op.payload),actor):recordSalePayment(op.payload,actor);
}
export async function runSaleOperation(raw:Record<string,unknown>,actor:string){
 const key=await prepareSaleOperation(raw,actor);return executeSaleOperation(key,actor);
}
