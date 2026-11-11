import { customerAdminSession } from "@/lib/clients/admin";
import {privateJson} from "@/lib/clients/http";
import {signedAgreement} from "@/lib/clients/agreement-acceptance";
export const runtime="nodejs";
export async function GET(request:Request){if(!await customerAdminSession())return privateJson({error:"Acceso restringido."},401);const id=new URL(request.url).searchParams.get("sale");if(!id||id.length>120)return privateJson({error:"Venta no válida."},400);try{const stored=await signedAgreement(id);if(!stored)return privateJson({error:"No hay respaldo firmado registrado."},404);return new Response(new Uint8Array(stored.bytes),{headers:{"content-type":"application/pdf","content-disposition":"attachment; filename=compromiso-firmado.pdf","cache-control":"private, no-store","x-content-type-options":"nosniff"}});}catch{return privateJson({error:"No se pudo verificar el respaldo."},503);}}
