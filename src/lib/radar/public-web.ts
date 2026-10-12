import "server-only";
import {lookup} from "node:dns/promises";
import {BlockList,isIP} from "node:net";
import http from "node:http";
import https from "node:https";

const blocked=new BlockList();
for(const [address,prefix] of [["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],["192.168.0.0",16],["198.18.0.0",15],["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",4],["240.0.0.0",4]] as const)blocked.addSubnet(address,prefix,"ipv4");
const globalV6=new BlockList();globalV6.addSubnet("2000::",3,"ipv6");
for(const [address,prefix] of [["2001:db8::",32],["2001::",32],["2002::",16]] as const)blocked.addSubnet(address,prefix,"ipv6");
export function isPublicAddress(address:string){const family=isIP(address);return family===4?!blocked.check(address,"ipv4"):family===6&&globalV6.check(address,"ipv6")&&!blocked.check(address,"ipv6")}
export function publicWebUrl(value:string){
 const url=new URL(value);
 if(!["http:","https:"].includes(url.protocol)||url.username||url.password||url.port&&!((url.protocol==="https:"&&url.port==="443")||(url.protocol==="http:"&&url.port==="80")))throw new Error("Solo se permiten webs públicas HTTP/HTTPS en puertos habituales.");
 if(url.hostname==="localhost"||url.hostname.endsWith(".local")||url.hostname.endsWith(".internal"))throw new Error("No se permite consultar redes privadas.");
 url.hash="";return url;
}
const hostKey=(url:URL)=>url.hostname.toLowerCase().replace(/^www\./,"");
export type PublicPage={url:string;status:number;body:string;contentType:string};
/** Validate all DNS answers, then pin the connection to the validated address (DNS rebinding protection). */
export async function readPublicPage(value:string,root:URL,deadline:number,redirects=0,allowed?:(url:URL)=>boolean):Promise<PublicPage>{
 const url=publicWebUrl(value);if(hostKey(url)!==hostKey(root))throw new Error("La web redirige a otro dominio; verifica la ficha antes de consultar.");
 if(allowed&&!allowed(url))throw new Error("La web restringe una redirección en robots.txt.");
 if(deadline-Date.now()<500)throw new Error("La consulta web alcanzó su tiempo máximo.");
 let dnsTimer:ReturnType<typeof setTimeout>|undefined;
 const answers=await Promise.race([lookup(url.hostname.replace(/^\[|\]$/g,""),{all:true}),new Promise<never>((_resolve,reject)=>{dnsTimer=setTimeout(()=>reject(new Error("Se agotó el tiempo de resolución de la web.")),Math.min(5000,Math.max(500,deadline-Date.now())))})]).finally(()=>clearTimeout(dnsTimer));
 if(!answers.length||answers.some(answer=>!isPublicAddress(answer.address)))throw new Error("La dirección de la web no es pública.");
 const target=answers.find(answer=>answer.family===4)||answers[0];
 const result=await new Promise<PublicPage&{location?:string}>((resolve,reject)=>{
  const transport=url.protocol==="https:"?https:http;
  const req=transport.request(url,{method:"GET",family:target.family,headers:{"User-Agent":"OpticaCristalRadar/2.0 (corporate public contacts)",Accept:"text/html,text/plain;q=0.9","Accept-Encoding":"identity"},lookup:(_hostname,_options,callback)=>callback(null,target.address,target.family),signal:AbortSignal.timeout(Math.min(8000,Math.max(500,deadline-Date.now())))},response=>{
   const status=response.statusCode||500;
   if(status>=300&&status<400){response.resume();resolve({url:url.toString(),status,body:"",contentType:"",location:response.headers.location});return}
   const type=String(response.headers["content-type"]||""),chunks:Buffer[]=[];let bytes=0;
   if(type&&!/text\/html|text\/plain|application\/xhtml\+xml/i.test(type)){response.resume();reject(new Error("La web no devolvió una página HTML o texto."));return}
   response.on("data",(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>1_000_000){response.destroy();reject(new Error("La página supera el límite de descarga (1 MB)."))}else chunks.push(chunk)});
   response.on("error",reject);response.on("end",()=>resolve({url:url.toString(),status,body:Buffer.concat(chunks).toString("utf8"),contentType:type}));
  });req.on("error",reject);req.end();
 });
 if(result.status>=300&&result.status<400){if(!result.location||redirects>=3)throw new Error("La web excedió el límite de redirecciones.");return readPublicPage(new URL(result.location,url).toString(),root,deadline,redirects+1,allowed)}
 return result;
}

export function robotsAllows(text:string,path:string,agent="opticacristalradar"){
 const groups:Array<{agents:string[];rules:Array<{allow:boolean;path:string}>}>=[];let group={agents:[] as string[],rules:[] as Array<{allow:boolean;path:string}>},hasRules=false;
 for(const line of text.split(/\r?\n/)){const entry=line.split("#")[0].trim().match(/^([^:]+):\s*(.*)$/);if(!entry)continue;const key=entry[1].trim().toLowerCase(),value=entry[2].trim();
  if(key==="user-agent"){if(hasRules){groups.push(group);group={agents:[],rules:[]};hasRules=false}group.agents.push(value.toLowerCase())}
  else if((key==="allow"||key==="disallow")&&group.agents.length){hasRules=true;if(value)group.rules.push({allow:key==="allow",path:value})}
 }groups.push(group);
 const specificity=(g:typeof group)=>Math.max(-1,...g.agents.map(value=>value==="*"?0:agent.includes(value)?value.length:-1)),best=Math.max(-1,...groups.map(specificity));
 const matches=groups.filter(g=>specificity(g)===best&&best>=0).flatMap(g=>g.rules).filter(rule=>{const end=rule.path.endsWith("$"),pattern=rule.path.replace(/\$$/,"").split("*").map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join(".*");return new RegExp(`^${pattern}${end?"$":""}`).test(path)}).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
 return matches[0]?.allow??true;
}
