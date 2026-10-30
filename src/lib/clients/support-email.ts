import "server-only";
import { CONTACTO_EMAIL } from "@/lib/solicitudes/types";
import { CLIENT_MAIL_COMPANY, corporateEmailHtml } from "./mail";
export type SupportMailKind = "ticket_created" | "staff_reply";
export function supportEmailContent({kind,ticketId,folio}:{kind:SupportMailKind;ticketId:string;folio:string}) {
 const created=kind==="ticket_created",company=CLIENT_MAIL_COMPANY;
 const heading=created?"Nuevo ticket de ayuda":"Tiene una respuesta";
 const title=`${created?"Nuevo ticket":"Respuesta a su ticket"} ${folio} · Óptica & Cristal`;
 const purpose=created?`Un cliente ha creado el ticket ${folio}. Ingrese al panel para revisar su solicitud y responder.`:`Nuestro equipo ha respondido a su ticket ${folio}. Ingrese a su cuenta para consultar la respuesta.`;
 const action=created?"Atender ticket":"Ver mi respuesta";
 const url=`${company.website}/${created?"admin/login":"mi-cuenta/ingresar"}?ticket=${encodeURIComponent(ticketId)}`;
 const security="Por privacidad, la conversación está disponible solo al iniciar sesión. Para continuar, responda dentro del ticket.";
 const html=corporateEmailHtml({title,heading,purpose,action,url,eyebrow:"Soporte · Óptica & Cristal",security,note:"Este aviso no contiene el mensaje privado de la conversación."});
 const text=`${heading}\n\n${purpose}\n\n${action}: ${url}\n\n${security}\n\n${company.name}\nRUT ${company.rut}\n${company.address}\n${CONTACTO_EMAIL}\n${company.phone}\n${company.website}`;
 return {subject:title,html,text,replyTo:CONTACTO_EMAIL};
}
