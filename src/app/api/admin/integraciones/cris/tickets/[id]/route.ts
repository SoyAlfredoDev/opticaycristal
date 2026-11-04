import {customerAdminSession} from '@/lib/clients/admin';
import {privateJson} from '@/lib/clients/http';
import {clientPool,clientTable as t} from '@/lib/clients/db';
import {uuid} from '@/lib/integrations/cris/security';
import {IntegrationError} from '@/lib/integrations/whatsapp';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await customerAdminSession())return privateJson({error:'Acceso restringido.'},401);
 try{const id=uuid((await params).id);const r=await clientPool().query(`SELECT kind,state FROM ${t('oc_client_cris_receipts')} WHERE ticket_id=$1`,[id]);if(!r.rows[0])return privateJson({receipt:null,attachments:[]});const files=await clientPool().query(`SELECT id,mime,size,expires_at FROM ${t('oc_client_cris_attachments')} WHERE ticket_id=$1 AND expires_at>now() ORDER BY created_at LIMIT 3`,[id]);return privateJson({receipt:r.rows[0],attachments:files.rows.map(f=>({id:f.id,mime:f.mime,size:f.size,expiresAt:new Date(f.expires_at).toISOString(),scanStatus:'UNSCANNED',href:`/api/admin/integraciones/cris/adjuntos/${f.id}`}))});}catch(e){return privateJson({error:'Recepción de Cris no disponible.'},e instanceof IntegrationError?e.status:503);}
}
