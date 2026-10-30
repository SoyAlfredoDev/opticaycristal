import "server-only";
import { after } from "next/server";
import { drainSupportMail, type MailScope } from "./support-mail";
export function scheduleSupportMail(scope:MailScope={}) {
 after(async()=>{try{await drainSupportMail(scope);}catch{console.error("No se pudo procesar un aviso de soporte; permanece registrado para revisión.");}});
}
