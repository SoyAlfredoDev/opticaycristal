import "server-only";
import {randomBytes} from "node:crypto";
import {clientPool,clientTable as t} from "@/lib/clients/db";
import {clientFingerprint,revealClientValue} from "@/lib/clients/privacy";
import {normalizeIntegrationWhatsapp} from "./whatsapp-number";
export class WhatsappVerificationError extends Error{constructor(message:string,public status=400){super(message);}}
import {kapsoVerificationEnabled} from "./kapso-config";
export {kapsoVerificationEnabled,verifyKapsoSignature} from "./kapso-config";
export async function whatsappVerificationStatus(userId:string){const r=await clientPool().query(`SELECT "whatsappVerified" FROM ${t("oc_client_user")} WHERE id=$1`,[userId]);if(!r.rows[0])throw new WhatsappVerificationError("Cuenta no encontrada.",404);return{available:kapsoVerificationEnabled(),verified:r.rows[0].whatsappVerified===true};}
export async function createWhatsappChallenge(userId:string){
 if(!kapsoVerificationEnabled())throw new WhatsappVerificationError("La verificación de WhatsApp no está disponible por ahora.",503);
 const db=await clientPool().connect();try{await db.query("BEGIN");const u=await db.query(`SELECT "whatsappCipher","whatsappVerified" FROM ${t("oc_client_user")} WHERE id=$1 FOR UPDATE`,[userId]);if(!u.rows[0])throw new WhatsappVerificationError("Cuenta no encontrada.",404);if(u.rows[0].whatsappVerified){await db.query("COMMIT");return{verified:true};}
 const phone=normalizeIntegrationWhatsapp(revealClientValue(u.rows[0].whatsappCipher,"whatsapp"));const current=await db.query(`SELECT *,issued_at>now()-interval '60 seconds' AS cooldown,window_started_at>now()-interval '1 hour' AS recent FROM ${t("oc_client_whatsapp_challenges")} WHERE user_id=$1 FOR UPDATE`,[userId]);const row=current.rows[0];if(row?.cooldown||row?.recent&&Number(row.issued_count)>=3)throw new WhatsappVerificationError("Espera antes de generar otro código. Máximo tres por hora.",429);
 const code=randomBytes(16).toString("hex").toUpperCase(),hash=clientFingerprint(code,"whatsapp-verification-token"),phoneHash=clientFingerprint(phone,"whatsapp-verification-phone");
 const saved=await db.query(`INSERT INTO ${t("oc_client_whatsapp_challenges")} AS c(user_id,token_hash,phone_hash,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes') ON CONFLICT(user_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,phone_hash=EXCLUDED.phone_hash,issued_at=now(),expires_at=EXCLUDED.expires_at,consumed_at=NULL,cancelled_at=NULL,issued_count=CASE WHEN c.window_started_at>now()-interval '1 hour' THEN c.issued_count+1 ELSE 1 END,window_started_at=CASE WHEN c.window_started_at>now()-interval '1 hour' THEN c.window_started_at ELSE now() END RETURNING expires_at`,[userId,hash,phoneHash]);await db.query("COMMIT");
 const message=`OC-VERIFICAR ${code}`;return{verified:false,url:`https://wa.me/56922452080?text=${encodeURIComponent(message)}`,expiresAt:new Date(saved.rows[0].expires_at).toISOString()};
 }catch(e){await db.query("ROLLBACK");throw e;}finally{db.release();}
}
type Message={id:string;from:string;code:string;timestamp:number};
export function kapsoVerificationMessages(raw:unknown):Message[]{
 if(!raw||typeof raw!=="object")return[];const root=raw as Record<string,unknown>;const items=root.batch===true?root.data:[root];if(!Array.isArray(items)||items.length>10)throw new WhatsappVerificationError("Lote no admitido.",413);
 const result:Message[]=[];for(const item of items){if(!item||typeof item!=="object")continue;const p=item as Record<string,unknown>;if(p.phone_number_id!==process.env.KAPSO_PHONE_NUMBER_ID)continue;const m=p.message as Record<string,unknown>|undefined;if(!m||m.type!=="text"||(m.kapso as Record<string,unknown>|undefined)?.direction!=="inbound"||(m.kapso as Record<string,unknown>|undefined)?.status!=="received")continue;
 const text=(m.text as Record<string,unknown>|undefined)?.body;const match=typeof text==="string"?/^OC-VERIFICAR ([A-F0-9]{32})$/i.exec(text.trim()):null;if(!match||typeof m.id!=="string"||m.id.length>300||!m.id||typeof m.from!=="string"||typeof m.timestamp!=="string"||!/^\d{10,13}$/.test(m.timestamp))continue;
 const timestamp=Number(m.timestamp);if(!Number.isSafeInteger(timestamp))continue;try{result.push({id:m.id,from:normalizeIntegrationWhatsapp(m.from),code:match[1].toUpperCase(),timestamp});}catch{/* BSUID-only messages cannot verify a telephone number. */}
 }return result;
}
export async function acceptKapsoVerification(message:Message){
 const hash=clientFingerprint(message.code,"whatsapp-verification-token"),phoneHash=clientFingerprint(message.from,"whatsapp-verification-phone"),messageHash=clientFingerprint(`${process.env.KAPSO_PHONE_NUMBER_ID}:${message.id}`,"whatsapp-verification-message");
 const db=await clientPool().connect();try{await db.query("BEGIN");const candidate=await db.query(`SELECT user_id FROM ${t("oc_client_whatsapp_challenges")} WHERE token_hash=$1`,[hash]);const uid=candidate.rows[0]?.user_id;if(!uid){await db.query("COMMIT");return false;}
 const user=await db.query(`SELECT "whatsappCipher" FROM ${t("oc_client_user")} WHERE id=$1 FOR UPDATE`,[uid]);const challenge=await db.query(`SELECT *,expires_at>now() AS live,extract(epoch from issued_at)::bigint AS issued,extract(epoch from now())::bigint AS current FROM ${t("oc_client_whatsapp_challenges")} WHERE user_id=$1 FOR UPDATE`,[uid]);const c=challenge.rows[0];
 if(!user.rows[0]||!c||c.token_hash!==hash||c.phone_hash!==phoneHash||!c.live||c.consumed_at||c.cancelled_at||message.timestamp<Number(c.issued)-30||message.timestamp>Number(c.current)+60||clientFingerprint(normalizeIntegrationWhatsapp(revealClientValue(user.rows[0].whatsappCipher,"whatsapp")),"whatsapp-verification-phone")!==phoneHash){await db.query("COMMIT");return false;}
 const receipt=await db.query(`INSERT INTO ${t("oc_client_whatsapp_receipts")}(message_hash,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING message_hash`,[messageHash,uid]);if(!receipt.rows[0]){await db.query("COMMIT");return false;}
 await db.query(`UPDATE ${t("oc_client_user")} SET "whatsappVerified"=true,"updatedAt"=now() WHERE id=$1`,[uid]);await db.query(`UPDATE ${t("oc_client_whatsapp_challenges")} SET consumed_at=now() WHERE user_id=$1`,[uid]);await db.query("COMMIT");return true;
 }catch(e){await db.query("ROLLBACK");throw e;}finally{db.release();}
}
