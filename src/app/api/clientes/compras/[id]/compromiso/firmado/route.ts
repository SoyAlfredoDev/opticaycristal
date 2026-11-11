import {customerSession} from "@/lib/clients/auth";
import {getCustomerDocumentSale} from "@/lib/clients/history";
import {signedAgreement} from "@/lib/clients/agreement-acceptance";
import {privateJson} from "@/lib/clients/http";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{const session=await customerSession();if(!session)return privateJson({error:"Inicia sesión."},401);const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))return privateJson({error:"Venta no válida."},400);const sale=await getCustomerDocumentSale(session.user.id,id);if(!sale?.credit)return privateJson({error:"Documento no encontrado."},404);const stored=await signedAgreement(id);if(!stored)return privateJson({error:"Aún no hay una copia firmada disponible."},404);return new Response(new Uint8Array(stored.bytes),{headers:{"content-type":"application/pdf","content-disposition":"attachment; filename=compromiso-firmado.pdf","cache-control":"private, no-store","x-content-type-options":"nosniff"}});}catch{return privateJson({error:"No se pudo verificar el respaldo del documento."},503);}}
