const normalizeHost=(host:string)=>host.toLowerCase().replace(/^www\./,"");
export function publicCommercialEmails(values:string[],website:string|null):string[]{
 let host="";try{host=normalizeHost(new URL(website||"").hostname)}catch{}
 return [...new Set(values.flatMap(value=>value.split(/[;,\s]+/)).map(value=>value.replace(/^mailto:/i,"").split("?")[0].trim().toLowerCase()).filter(value=>{
  if(!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)||value.length>254)return false;
  const [local,domain]=value.split("@");
  // Keep departmental/company inboxes, never infer individual decision makers.
  const role=/^(info|contacto|contact|ventas|venta|comercial|administracion|administración|admin|rrhh|recursoshumanos|recepcion|reservas|atencion|servicio|soporte|convenios|oficina|hello|hola|cotizaciones|gerencia)([._+-].*)?$/i.test(local);
  const brand=Boolean(host&&normalizeHost(domain)===host&&local===host.split(".")[0]);
  return (role||brand)&&(!host||normalizeHost(domain)===host||/^(gmail\.com|outlook\.com|hotmail\.com|yahoo\.com)$/.test(domain));
 }))].slice(0,12);
}
export function socialUrl(value:string):string|null {try{const url=new URL(/^https?:\/\//i.test(value)?value:`https://${value}`);return /^https?:$/.test(url.protocol)&&/(^|\.)(linkedin\.com|facebook\.com|instagram\.com|youtube\.com|x\.com|twitter\.com)$/.test(url.hostname)&&!url.username&&!url.password?url.toString():null}catch{return null}}
