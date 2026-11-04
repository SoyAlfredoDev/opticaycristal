import {staffAuth,staffOrigin} from "@/lib/staff/auth";
import {privateJson,readClientBody,sameClientOrigin} from "@/lib/clients/http";
export const runtime="nodejs";
async function handle(request:Request){
 const path=new URL(request.url).pathname.replace(/^\/api\/admin\/auth\//,"");
 const allowed=new Set(["sign-in/email","sign-out","get-session","request-password-reset","reset-password"]);
 if(!allowed.has(path)&&!(request.method==="GET"&&/^reset-password\/[A-Za-z0-9_-]+$/.test(path)))return privateJson({error:"Acción no disponible."},404);
 try{if(request.method==="POST"){
  if(!sameClientOrigin(request))return privateJson({error:"Origen no permitido."},403);
  const body=await readClientBody(request.clone());
  if(path==="request-password-reset"){
   const email=body&&typeof body==="object"&&"email" in body?body.email:"";
   const headers=new Headers(request.headers);headers.delete("content-length");
   request=new Request(request.url,{method:"POST",headers,body:JSON.stringify({email,redirectTo:staffOrigin()+"/admin/restablecer"})});
  }
 }const response=await staffAuth().handler(request);response.headers.set("Cache-Control","no-store, private");response.headers.set("Referrer-Policy","no-referrer");return response;}catch{return privateJson({error:"El acceso no está disponible temporalmente."},503);}
}
export const GET=handle;export const POST=handle;
