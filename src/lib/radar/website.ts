import "server-only";
import {parse} from "node-html-parser";
import {publicCommercialEmails,socialUrl} from "./contacts";
import {publicWebUrl,readPublicPage,robotsAllows} from "./public-web";
import type {CompanyResult,FieldEvidence} from "./types";
import type {WebEnrichment} from "./db";

export function extractWebsiteFacts(html:string,url:string,fetchedAt:string){
 const root=parse(html);root.querySelectorAll("script,style,noscript,svg").forEach(node=>node.remove());
 const text=root.textContent.replace(/\s+/g," ").trim(),links=root.querySelectorAll("a[href]").map(node=>({href:node.getAttribute("href")||"",label:node.textContent.trim()}));
 const emails=publicCommercialEmails([...links.filter(link=>/^mailto:/i.test(link.href)).map(link=>link.href),...(text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)||[])],url);
 const plainPhones=(text.match(/(?<!\d)\+?\(?56[\s.-]*\)?[\s.-]*\(?[2-9]\)?[\s.-]*\d{4}[\s.-]*\d{4}(?!\d)/g)||[]).map(value=>`+${value.replace(/\D/g,"")}`);
 const phones=[...new Set([...links.filter(link=>/^tel:/i.test(link.href)).map(link=>decodeURIComponent(link.href.slice(4)).replace(/[^+\d]/g,"")),...plainPhones].filter(phone=>/^\+?56\d{9}$/.test(phone)||/^\d{9}$/.test(phone)))].slice(0,8);
 const socialLinks=[...new Set(links.map(link=>{try{return socialUrl(new URL(link.href,url).toString())}catch{return null}}).filter((value):value is string=>Boolean(value)))].slice(0,12);
 // A literal self-description only, never numbers of customers, jobs, seats or company age.
 const count=text.match(/(?:somos|contamos con|tenemos|equipo de|dotación de|dotacion de)\s+(?:un equipo de\s+)?(?:más de\s+|mas de\s+|aproximadamente\s+)?(\d{1,3}(?:[.,]\d{3})+|\d+)\s+(?:trabajadores|empleados|colaboradores|personas en nuestro equipo)\b/i);
 const employeeEstimate=count?Number(count[1].replace(/[.,]/g,"")):null;
 const validCount=employeeEstimate!=null&&Number.isSafeInteger(employeeEstimate)&&employeeEstimate>0&&employeeEstimate<=10_000_000?employeeEstimate:null;
 const evidence:FieldEvidence[]=[...emails.map(value=>({field:"email",value,url,fetchedAt})),...phones.map(value=>({field:"phone",value,url,fetchedAt})),...socialLinks.map(value=>({field:"socialLink",value,url,fetchedAt})),...(validCount!=null?[{field:"employeeEstimate",value:String(validCount),url,fetchedAt,excerpt:count![0]}]:[])];
 const pages=links.flatMap(link=>{try{const page=new URL(link.href,url);if(page.origin!==new URL(url).origin||page.search||!/contact|nosotros|about|empresa/i.test(`${page.pathname} ${link.label}`)||/login|registro|wp-admin|logout|\.(pdf|jpg|png|zip)$/i.test(page.pathname))return[];page.hash="";return[page.toString()]}catch{return[]}});
 return {emails,phones,socialLinks,employeeEstimate:validCount,evidence,pages:[...new Set(pages)].slice(0,2)};
}
const running=new Map<string,Promise<WebEnrichment>>();
export async function enrichCompanyWebsite(company:CompanyResult):Promise<WebEnrichment>{
 if(!company.website)throw new Error("Esta empresa no tiene un sitio web publicado.");
 const site=publicWebUrl(company.website);
 if(/(^|\.)(facebook\.com|instagram\.com|linkedin\.com|google\.com|google\.cl|linktr\.ee)$/.test(site.hostname))throw new Error("La ficha contiene una red social o directorio. Se necesita la web corporativa para enriquecerla.");
 const pending=running.get(site.origin);if(pending)return pending;
 const task=crawlWebsite(site).finally(()=>running.delete(site.origin));running.set(site.origin,task);return task;
}
async function crawlWebsite(site:URL):Promise<WebEnrichment>{
 const deadline=Date.now()+25_000,fetchedAt=new Date().toISOString(),robots=await readPublicPage(new URL("/robots.txt",site).toString(),site,deadline);
 if(robots.status!==404&&robots.status!==410&&robots.status!==200)throw new Error("No se pudo comprobar robots.txt. La consulta web se detuvo.");
 const rules=robots.status===200?robots.body:"",allowed=(url:URL)=>robotsAllows(rules,url.pathname+url.search);
 if(!allowed(site))throw new Error("La web restringe esta consulta en robots.txt.");
 const result:WebEnrichment={emails:[],phones:[],socialLinks:[],evidence:[],employeeEstimate:null,fetchedAt,status:"completo"},pages=[site.toString()];let fetched=0;
 for(let i=0;i<pages.length&&i<3;i++){
  await new Promise(resolve=>setTimeout(resolve,1100));
  const pageUrl=new URL(pages[i]);if(!allowed(pageUrl)){result.status="parcial · robots.txt restringe una página";continue}
  try{const page=await readPublicPage(pageUrl.toString(),site,deadline,0,allowed);if(page.status!==200){result.status=`parcial · una página respondió ${page.status}`;continue}
   if(!allowed(new URL(page.url))){result.status="parcial · redirección restringida por robots.txt";continue}
   const facts=extractWebsiteFacts(page.body,page.url,fetchedAt);fetched++;
   result.emails.push(...facts.emails);result.phones.push(...facts.phones);result.socialLinks.push(...facts.socialLinks);result.evidence.push(...facts.evidence);
   if(result.employeeEstimate==null)result.employeeEstimate=facts.employeeEstimate;
   if(i===0)pages.push(...facts.pages.filter(url=>url!==page.url));
  }catch(error){if(i===0)throw error;result.status="parcial · no se pudieron completar todas las páginas"}
 }
 if(!fetched)throw new Error("La web no entregó páginas consultables.");
 result.emails=[...new Set(result.emails)];result.phones=[...new Set(result.phones)];result.socialLinks=[...new Set(result.socialLinks)];
 if(!result.evidence.length)result.status+=" · sin contactos o dotación publicados";
 return result;
}
