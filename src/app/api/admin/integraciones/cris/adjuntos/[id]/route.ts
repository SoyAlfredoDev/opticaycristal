import {randomUUID} from 'node:crypto';
import {customerAdminSession} from '@/lib/clients/admin';
import {privateJson} from '@/lib/clients/http';
import {privateAttachment} from '@/lib/integrations/cris/receipts';
import {IntegrationError,integrationAudit} from '@/lib/integrations/whatsapp';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await customerAdminSession())return privateJson({error:'Acceso restringido.'},401);
 try{const{id}=await params;const file=await privateAttachment(id);await integrationAudit(randomUUID(),'admin','download-cris-attachment','ok');return new Response(file.bytes,{headers:{'Content-Type':file.mime,'Content-Disposition':`attachment; filename="adjunto-${id}.${file.mime==='application/pdf'?'pdf':file.mime==='image/png'?'png':'jpg'}"`,'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",'Referrer-Policy':'no-referrer'}});}catch(e){return privateJson({error:'Adjunto no disponible.'},e instanceof IntegrationError?e.status:503);}
}
