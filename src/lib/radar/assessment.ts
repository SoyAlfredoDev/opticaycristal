import {getCommercialFit,type CompanyResult} from "./types";

/** Transparent rules for contact readiness; this is not a predicted sale probability. */
export function assessCompany(company:CompanyResult) {
 const facts:string[]=[],missing:string[]=[];let score=0;
 if(company.emails?.length){score+=40;facts.push("Correo comercial publicado; priorizado para contacto por email.")}else missing.push("Correo comercial");
 if(company.phone){score+=15;facts.push("Teléfono corporativo publicado.")}else missing.push("Teléfono corporativo");
 if(company.website){score+=10;facts.push("Sitio web publicado para verificar la empresa.")}else missing.push("Sitio web");
 if(company.address){score+=10;facts.push("Dirección publicada.")}else missing.push("Dirección");
 if(company.categories.length){score+=5;facts.push("Actividad etiquetada en la fuente.")}
 const fit=getCommercialFit(company.employeeEstimate);
 if(fit==="ambas"){score+=20;facts.push("Dotación publicada superior a 20: candidata a convenio y jornada; confirmar vigencia.")}
 else if(fit==="convenio"){score+=15;facts.push("Dotación publicada entre 5 y 20: candidata a convenio.")}
 else if(fit==="convenio_bajo"){score+=5;facts.push("Dotación publicada entre 1 y 4: convenio de baja escala.")}
 else missing.push("Cantidad de trabajadores (no se infiere del rubro)");
 const nextAction=!company.phone&&!company.emails?.length
  ?company.website?"Consultar la web corporativa para obtener un canal comercial publicado.":"Verificar un canal corporativo en una fuente adicional."
  :fit==="por_clasificar"?"Contactar por el canal publicado y confirmar dotación para elegir convenio o jornada."
  :fit==="ambas"?"Confirmar dotación y consultar interés en una jornada óptica y un convenio para trabajadores."
  :"Consultar interés en un convenio óptico para trabajadores y confirmar dotación.";
 return {score,priority:score>=65?"alta":score>=35?"media":"por_completar",commercialFit:fit,facts,missing,nextAction,label:"Prioridad orientativa · reglas de contactabilidad, no probabilidad de venta"};
}
