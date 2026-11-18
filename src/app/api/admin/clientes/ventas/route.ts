import { SaleControlError } from "@/lib/clients/sale-control";
import {saleControlNumber} from "@/lib/clients/sales-register";
import { recoverSaleOperation,prepareSaleOperation,executeSaleOperation } from "@/lib/clients/operations";
import { customerAdminSession,canManageProductCosts } from "@/lib/clients/admin";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
import { changeSaleState,reverseSalePayment, listSaleProducts, quoteSale, SaleError, saveSaleProduct } from "@/lib/clients/sales";
import { CustomerDocumentError, parseCustomerDocument } from "@/lib/clients/customer-document";
import { findCustomerByDocument } from "@/lib/clients/customer-document-store";
import { getCustomerSaleContext } from "@/lib/clients/store";
import { saleInterestQuote,CommitmentError } from "@/lib/clients/commitments";
import { todayChile } from "@/lib/clients/sales";
export const runtime = "nodejs";
export async function GET() {
 if (!await customerAdminSession(true)) return privateJson({error:"Acceso restringido."},401);
 try { return privateJson({products:await listSaleProducts()}); } catch { return privateJson({error:"No se pudieron cargar los productos."},503); }
}
export async function POST(request: Request) {
 const staff = await customerAdminSession(true);
 if (!staff) return privateJson({error:"Acceso restringido."},401);
 if (!sameClientOrigin(request)) return privateJson({error:"Origen no permitido."},403);
 let body: Record<string,unknown>;
 try { const raw = await readClientBody(request); if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(); body=raw as Record<string,unknown>; }
 catch { return privateJson({error:"Datos no válidos."},400); }
 if(staff.role==="seller" && ["product","cancel","reverse"].includes(String(body.action)))return privateJson({error:"Esta acción requiere un administrador."},403);
 try {
  switch(body.action) {
   case "interest": return privateJson({interest:await saleInterestQuote(body.saleId,typeof body.paidOn==="string"?body.paidOn:todayChile())});
   case "check-document": return privateJson({customerId:await findCustomerByDocument(parseCustomerDocument(body))});
   case "lookup": {
    const id=await findCustomerByDocument(parseCustomerDocument(body));
    return privateJson({customer:id?await getCustomerSaleContext(id):null});
   }
   case "product": if(!canManageProductCosts(staff.u))return privateJson({error:"Solo el responsable puede editar costos."},403); return privateJson({id:await saveSaleProduct(body,staff.u)});
   case "quote": return privateJson({quote:await quoteSale(body)});
   case "prepare": return privateJson({requestKey:await prepareSaleOperation(body.operation as Record<string,unknown>,staff.u)});
   case "execute": {const id=await executeSaleOperation(body.requestKey,staff.u);return privateJson({id,controlNumber:await saleControlNumber(id)});}
   case "recover": return privateJson({operation:await recoverSaleOperation(body.requestKey,staff.u)});
   case "cancel": case "sign": return privateJson({id:await changeSaleState(body,staff.u)});
   case "reverse": return privateJson({id:await reverseSalePayment(body,staff.u)});
   default: return privateJson({error:"Acción no válida."},400);
  }
 } catch(error) {
  if(error instanceof SaleControlError)return privateJson({error:error.message},error.status);
  if(error instanceof SaleError || error instanceof CommitmentError || error instanceof CustomerDocumentError)
   return privateJson({error:error.message},400);
  return privateJson({error:"No se pudo completar la operación. Revisa la conexión y vuelve a intentarlo con los mismos datos."},503);
 }
}
