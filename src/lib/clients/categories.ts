import "server-only";
import { randomUUID } from "node:crypto";
import { queueLevelUpgradeMail, levelMailEnabled } from "./level-mail";
import { clientPool,clientTable } from "./db";
import type { CategorySettings } from "./category-types";
export class CategoryError extends Error{constructor(message:string,public status=400){super(message);}}
function customerId(id:string){if(!id||id.length>100)throw new CategoryError("Cliente no válido.");return id;}
function code(value:unknown){if(typeof value!=="string"||!["start","vip","premium","elite"].includes(value))throw new CategoryError("Selecciona un nivel válido.");return value;}
export async function getCategorySettings(id:string):Promise<CategorySettings>{
 const user=await clientPool().query<{category:string}>(`SELECT category FROM ${clientTable("oc_client_user")} WHERE id=$1`,[customerId(id)]);
 if(!user.rows[0])throw new CategoryError("Cliente no encontrado.",404);
 const [tiers,history]=await Promise.all([
  clientPool().query(`SELECT code,name,max_percent,max_amount,max_installments FROM ${clientTable("oc_client_tiers")} ORDER BY position`),
  clientPool().query(`SELECT h.id,a.name AS old_name,b.name AS new_name,h.actor,h.created_at,h.source,m.state AS mail_state FROM ${clientTable("oc_client_category_changes")} h JOIN ${clientTable("oc_client_tiers")} a ON a.code=h.old_category JOIN ${clientTable("oc_client_tiers")} b ON b.code=h.new_category LEFT JOIN ${clientTable("oc_client_level_mail")} m ON m.change_id=h.id WHERE h.customer_id=$1 ORDER BY h.created_at DESC,h.id DESC LIMIT 5`,[id]),
 ]);
 return {mailDeliveryEnabled:levelMailEnabled(),currentCategory:user.rows[0].category,tiers:tiers.rows.map(t=>({code:String(t.code),name:String(t.name),maxPercent:Number(t.max_percent),maxAmount:Number(t.max_amount),maxInstallments:Number(t.max_installments)})),history:history.rows.map(h=>({id:String(h.id),from:String(h.old_name),to:String(h.new_name),actor:String(h.actor),source:h.source,mailState:h.mail_state,createdAt:new Date(h.created_at).toISOString()}))};
}
export async function changeCustomerCategory(id:string,raw:unknown,actor:string,options:{source?:"manual"|"automatic"}={}){
 customerId(id);
 if(!actor.trim()||actor.length>200)throw new CategoryError("Responsable no válido.",403);
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new CategoryError("Datos no válidos.");
 const input=raw as Record<string,unknown>,category=code(input.category),expected=code(input.expectedCategory),key=input.requestKey;
 if(typeof key!=="string"||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key))throw new CategoryError("Identificador de envío no válido.");
 const db=await clientPool().connect();let changed=false,replayed=false;
 try{
  await db.query("BEGIN");
  // Sales lock the same customer row: a sale and a category change cannot use half-updated conditions.
  const user=await db.query<{category:string}>(`SELECT category FROM ${clientTable("oc_client_user")} WHERE id=$1 FOR UPDATE`,[id]);
  if(!user.rows[0])throw new CategoryError("Cliente no encontrado.",404);
  const previous=await db.query(`SELECT customer_id,old_category,new_category,actor FROM ${clientTable("oc_client_category_changes")} WHERE request_key=$1`,[key]);
  if(previous.rows[0]){
   const p=previous.rows[0];if(p.customer_id!==id||p.actor!==actor||p.old_category!==expected||p.new_category!==category)throw new CategoryError("Este envío ya se usó para otro cambio.",409);replayed=true;
  }else{
   if(user.rows[0].category!==expected)throw new CategoryError("El nivel cambió mientras editabas. Revisa el nivel actual y vuelve a guardar.",409);
   if(category!==expected){
    const tier=await db.query(`SELECT code FROM ${clientTable("oc_client_tiers")} WHERE code=$1`,[category]);if(!tier.rows.length)throw new CategoryError("Nivel no disponible.");
    await db.query(`UPDATE ${clientTable("oc_client_user")} SET category=$2,"updatedAt"=now() WHERE id=$1`,[id,category]);
    const changeId=randomUUID();
    await db.query(`INSERT INTO ${clientTable("oc_client_category_changes")}(id,customer_id,old_category,new_category,actor,request_key,source) VALUES($1,$2,$3,$4,$5,$6,$7)`,[changeId,id,expected,category,actor,key,options.source??"manual"]);
    await queueLevelUpgradeMail(db,{changeId,customerId:id,previousCode:expected,newCode:category});changed=true;
   }
  }
  await db.query("COMMIT");
 }catch(error){await db.query("ROLLBACK");throw error;}finally{db.release();}
 return {settings:await getCategorySettings(id),changed,replayed};
}
