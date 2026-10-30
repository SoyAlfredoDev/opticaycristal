"use client";
export class SalesRequestError extends Error { constructor(message:string,public status:number){super(message);} }
export async function salesAction(body:Record<string,unknown>){
 const r=await fetch("/api/admin/clientes/ventas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await r.json();if(!r.ok)throw new SalesRequestError(data.error||"No pudimos guardar.",r.status);return data;
}
export const operationSlot=(kind:string)=>`oc_pending_${kind}`;
export async function durableAction(body:Record<string,unknown>){
 const slot=operationSlot(String(body.action)),key=String(body.requestKey);
 const pending=sessionStorage.getItem(slot);
 if(pending&&pending!==key)throw new SalesRequestError("Retoma primero la operación pendiente.",409);
 sessionStorage.setItem(slot,key);
 try{await salesAction({action:"prepare",operation:body});const result=await salesAction({action:"execute",requestKey:key});sessionStorage.removeItem(slot);return result;}
 catch(error){if(error instanceof SalesRequestError&&error.status===400)sessionStorage.removeItem(slot);throw error;}
}
