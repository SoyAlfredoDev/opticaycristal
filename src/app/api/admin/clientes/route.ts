import {getSession} from "@/lib/auth";
import {customerAdminSession} from "@/lib/clients/admin";
import {privateJson,readClientBody,sameClientOrigin} from "@/lib/clients/http";
import {searchCustomerSummaries} from "@/lib/clients/store";
export const runtime="nodejs";
async function access(){if(!await getSession())return privateJson({error:"Tu sesión venció. Vuelve a ingresar."},401);if(!await customerAdminSession())return privateJson({error:"No tienes permiso para consultar clientes."},403);return null;}
async function search(q:unknown,offset:unknown){if(typeof q!=="string"||q.length>100||typeof offset!=="number"||!Number.isSafeInteger(offset)||offset<0||offset>10000)return privateJson({error:"Búsqueda o página no válida."},400);try{return privateJson(await searchCustomerSummaries(q,offset));}catch{return privateJson({error:"No pudimos consultar los clientes. Inténtalo de nuevo."},503);}}
export async function GET(request:Request){const denied=await access();if(denied)return denied;const query=new URL(request.url).searchParams;return search(query.get("q")||"",Number(query.get("offset")||0));}
export async function POST(request:Request){const denied=await access();if(denied)return denied;if(!sameClientOrigin(request))return privateJson({error:"Origen no permitido."},403);let body;try{body=await readClientBody(request);}catch{return privateJson({error:"Datos no válidos."},400);}if(!body||typeof body!=="object"||Array.isArray(body))return privateJson({error:"Datos no válidos."},400);const b=body as Record<string,unknown>;return search(b.q??"",b.offset??0);}
