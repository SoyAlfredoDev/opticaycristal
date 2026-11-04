import "server-only";
import {createHmac} from "node:crypto";
import {betterAuth} from "better-auth";
import {APIError} from "better-auth/api";
import {PostgresDialect} from "kysely";
import type {Pool} from "pg";
import {clientPool,clientSchema} from "@/lib/clients/db";
import {staffRegistration} from "./registration-context";
import {sendStaffPasswordReset} from "./mail";
export function staffOrigin(){const url=new URL(process.env.CLIENT_APP_URL||"https://opticaycristal.cl");if(url.protocol!=="https:"&&!(process.env.NODE_ENV!=="production"&&url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname)))throw new Error("El origen del personal debe ser HTTPS.");return url.origin;}
export function createStaffAuth(database:Pool,reset=sendStaffPasswordReset){
 const seed=process.env.STAFF_AUTH_SECRET||process.env.CLIENT_AUTH_SECRET||process.env.SESSION_SECRET||"";if(seed.length<32)throw new Error("Falta una clave segura para el personal.");
 return betterAuth({appName:"Equipo Óptica & Cristal",logger:{disabled:true},secret:createHmac("sha256",seed).update("oc-staff-auth-v1").digest("hex"),baseURL:staffOrigin(),basePath:"/api/admin/auth",
 database:{dialect:new PostgresDialect({pool:database}),type:"postgres",schemaName:clientSchema(),transaction:true},trustedOrigins:[staffOrigin()],
 advanced:{cookiePrefix:"oc_staff",useSecureCookies:process.env.NODE_ENV==="production",defaultCookieAttributes:{httpOnly:true,sameSite:"lax"}},
 user:{modelName:"oc_client_staff_user",additionalFields:{rutCipher:{type:"string",input:false,returned:false},rutHash:{type:"string",input:false,returned:false},invitationId:{type:"string",input:false,returned:false},role:{type:"string",input:false,defaultValue:"administrator"},status:{type:"string",input:false,defaultValue:"active"}}},
 account:{modelName:"oc_client_staff_account"},verification:{modelName:"oc_client_staff_verification",storeIdentifier:"hashed"},session:{modelName:"oc_client_staff_session",expiresIn:60*60*12,updateAge:60*60,cookieCache:{enabled:false}},
 emailAndPassword:{enabled:true,minPasswordLength:8,maxPasswordLength:128,autoSignIn:false,resetPasswordTokenExpiresIn:1800,revokeSessionsOnPasswordReset:true,sendResetPassword:async({user,url})=>reset(user.email,url)},
 emailVerification:{sendOnSignUp:false},
 databaseHooks:{user:{create:{before:async(user)=>{const invite=staffRegistration.getStore();if(!invite||invite.email!==user.email.toLowerCase())throw new APIError("FORBIDDEN",{message:"El registro del personal requiere una invitación válida."});return{data:{...user,emailVerified:true,role:invite.role??"administrator",status:"active",invitationId:invite.id,rutCipher:invite.rutCipher,rutHash:invite.rutHash}};}}}},
 rateLimit:{enabled:true,storage:"database",modelName:"oc_client_staff_rate_limit",window:60,max:30,customRules:{"/sign-in/email":{window:900,max:8},"/request-password-reset":{window:3600,max:3}}}
 });
}
let auth:ReturnType<typeof createStaffAuth>|undefined;
export function staffAuth(){return auth??=createStaffAuth(clientPool());}
export async function staffSession(headers:Headers){const session=await staffAuth().api.getSession({headers});if(!session||session.user.status!=="active"||!["administrator","seller"].includes(session.user.role)||!session.user.emailVerified)return null;return{u:session.user.email,exp:new Date(session.session.expiresAt).getTime(),v:"staff-db",staffId:session.user.id,role:session.user.role as "administrator"|"seller"};}
