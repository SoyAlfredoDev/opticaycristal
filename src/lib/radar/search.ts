import "server-only";
import type {CompanyResult} from "./types";
import {deduplicateCompanies} from "./identity";

export type SearchStats={raw:number;outsideRegion:number;merged:number;returned:number;cacheHit:boolean};
export type StructuredSearchResult={companies:CompanyResult[];partial:boolean;warning:string|null;stats:SearchStats};
type CacheEntry={expiresAt:number;companies:CompanyResult[];warning?:string|null;stats?:SearchStats};
type OverpassElement={type:"node"|"way"|"relation";id:number;lat?:number;lon?:number;center?:{lat:number;lon:number};tags?:Record<string,string>};
type SearchBounds={south:number;west:number;north:number;east:number};
type GeoPolygon={type:"Polygon";coordinates:number[][][]} | {type:"MultiPolygon";coordinates:number[][][][]};
import {radarRegions,radarIndustries,type RadarIndustry,type RadarSearchFilters} from "./catalog";
export {radarRegions,radarIndustries,type RadarIndustry,type RadarSearchFilters} from "./catalog";
import {publicCommercialEmails,socialUrl} from "./contacts";
export type SearchIntent={category:"transport"|"industrial"|"school"|"occupational-health"|"company";location:string|null;regionCode:string|null;privateOnly:boolean;employeeThreshold:number|null};
const queryCache=new Map<string,CacheEntry>();
const boundsCache=new Map<string,{expiresAt:number;bounds:SearchBounds;polygon:GeoPolygon}>();
const cacheTtlMs=6*60*60*1000;
const inFlight=new Map<string,Promise<StructuredSearchResult>>();
let requestQueue:Promise<void>=Promise.resolve();
let nextRequestAt=0;
const wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-CL");
const knownPlaces=["Santiago","Quilicura","Colina","Lampa","Pudahuel","Maipu","San Bernardo","Las Condes","Providencia","Nunoa","La Florida","Puente Alto","Valparaiso","Vina del Mar","Concepcion","Antofagasta","Temuco","Rancagua","Talca","Chillan","La Serena","Coquimbo","Puerto Montt","Osorno","Arica","Iquique","Copiapo","Calama","Punta Arenas"];

export function parseSearchIntent(input:string):SearchIntent{
 const text=normalize(input);
 const healthNeed=/salud ocupacional|medicina laboral|salud laboral|servicios? de salud/.test(text);
 const category:SearchIntent["category"]=healthNeed?"occupational-health":/colegio|escuela|liceo/.test(text)?"school":/transporte|transportes|logistica|flete|carga/.test(text)?"transport":/industrial|industria|fabrica|manufactur|produccion|bodega/.test(text)?"industrial":"company";
 const regionMatch=text.match(/region metropolitana|metropolitana de santiago|\brm\b/);
 let location:string|null=null;
 if(!regionMatch){const place=knownPlaces.find(candidate=>text.includes(normalize(candidate)));if(place)location=place;else{const match=input.match(/\ben\s+(?:(?:la|el)\s+)?(?:(?:comuna|ciudad|region|región)\s+de\s+)?([^,.;]+?)(?=\s+(?:con|que|y|mas|más|sobre|a partir|para)\b|$)/iu);if(match){const candidate=match[1].trim().replace(/^(?:la|el)\s+/i,"");if(!/^(?:chile|todo chile)$/i.test(candidate))location=candidate.slice(0,80)}}}
 const threshold=input.match(/(?:mas|más)\s+de\s+(\d{1,6})\s+trabajadores?/i);
 return{category,location:regionMatch?"Región Metropolitana":location,regionCode:regionMatch?"CL-RM":null,privateOnly:category==="school"&&/privad|particular/.test(text),employeeThreshold:threshold?Number(threshold[1]):null};
}
export function mergeSearchIntents(input:string,interpretedQuery?:string):SearchIntent{
 const original=parseSearchIntent(input);if(!interpretedQuery||interpretedQuery.trim()===input.trim())return original;
 const interpreted=parseSearchIntent(interpretedQuery);
 return{category:original.category==="company"?interpreted.category:original.category,location:original.location||interpreted.location,regionCode:original.regionCode||interpreted.regionCode,privateOnly:original.privateOnly||interpreted.privateOnly,employeeThreshold:original.employeeThreshold};
}

export function buildOverpassQuery(intent:SearchIntent,bounds:SearchBounds):string{
 const bbox=`${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
 const selectors:Record<SearchIntent["category"],string[]>= {
  transport:[`nwr(${bbox})["office"="logistics"];`],
  industrial:[`nwr(${bbox})["industrial"="manufacturing"]["name"];`],
  school:intent.privateOnly?[`nwr(${bbox})["amenity"="school"]["operator:type"="private"];`]:[`nwr(${bbox})["amenity"="school"];`],
  "occupational-health":[
   `nwr(${bbox})["industrial"="manufacturing"]["name"];`,
  ],
  company:[`nwr(${bbox})["office"="company"]["name"];`],
 };
 return`[out:json][timeout:12];\n(${selectors[intent.category].join("\n")});\nout center tags;`;
}

const industrySelectors:Record<Exclude<RadarIndustry,"other">,string[]>={
 transport:['["office"~"^(logistics|transport|shipping)$"]'],industrial:['["industrial"~"^(manufacturing|warehouse)$"]','["craft"~"^(brewery|carpenter|metal_construction|painter|plumber|manufacturer)$"]'],construction:['["office"~"^(construction|architect|estate_agent)$"]','["craft"~"^(builder|plumber|electrician|roofer|glazier)$"]'],agriculture:['["office"="agricultural"]','["landuse"="farmyard"]','["craft"="agricultural_engines"]'],mining:['["office"="energy_supplier"]','["industrial"~"^(mining|oil|gas)$"]'],school:['["amenity"~"^(school|college|university|kindergarten)$"]'],"occupational-health":['["healthcare"~"^(occupational_health|clinic|doctor)$"]'],professional:['["office"~"^(lawyer|accountant|consulting|architect|engineer)$"]'],technology:['["office"~"^(it|telecommunication|software)$"]'],finance:['["office"~"^(financial|insurance|accountant|bank)$"]','["amenity"="bank"]'],retail:['["shop"]'],food:['["shop"~"^(supermarket|grocery|bakery|butcher|greengrocer|dairy)$"]','["craft"="food"]'],restaurant:['["amenity"~"^(restaurant|cafe|fast_food|bar)$"]'],hospitality:['["tourism"~"^(hotel|hostel|guest_house|camp_site)$"]'],automotive:['["shop"~"^(car|car_repair|tyres|motorcycle|car_parts)$"]','["craft"="car_repair"]'],healthcare:['["amenity"~"^(hospital|clinic|doctors|dentist)$"]','["healthcare"~"^(clinic|hospital|doctor)$"]'],beauty:['["shop"~"^(hairdresser|beauty|cosmetics)$"]'],sports:['["leisure"~"^(sports_centre|fitness_centre|stadium)$"]'],logistics:['["office"~"^(logistics|warehouse|shipping)$"]','["building"="warehouse"]'],environment:['["office"="environmental_consulting"]','["recycling"="centre"]'],security:['["office"="security"]'],cleaning:['["office"="cleaning"]','["craft"="cleaning"]'],printing:['["shop"="copyshop"]','["craft"="printing"]'],legal:['["office"="lawyer"]'],"real-estate":['["office"="estate_agent"]'],nonprofit:['["office"="ngo"]'],company:['["office"="company"]']
};
export function buildStructuredOverpassQuery(filters:RadarSearchFilters,bounds:SearchBounds):string{
 const bbox=`${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
 const selectors=filters.industry==="other"
  ?(()=>{const word=filters.otherIndustry?.trim();if(!word||word.length>80)throw new Error("Especifica el rubro que quieres buscar.");const safe=word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").slice(0,80);const quoted=JSON.stringify(safe);return[`nwr(${bbox})[name][~"^(office|shop|craft|amenity|industrial|healthcare|tourism|leisure)$"~${quoted},i];`,`nwr(${bbox})[name~${quoted},i][~"^(office|shop|craft|amenity|industrial|healthcare|tourism|leisure)$"~"."];`]})()
  :industrySelectors[filters.industry].map(selector=>`nwr(${bbox})${selector}[name];`);
 return`[out:json][timeout:25];\n(${selectors.join("\n")});\nout center tags;`;
}

function pointInRing(lon:number,lat:number,ring:number[][]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j],crosses=(yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi;if(crosses)inside=!inside}return inside}
function pointInPolygon(lon:number,lat:number,polygon:GeoPolygon){const polygons=polygon.type==="Polygon"?[polygon.coordinates]:polygon.coordinates;return polygons.some(rings=>pointInRing(lon,lat,rings[0])&&!rings.slice(1).some(ring=>pointInRing(lon,lat,ring)))}

function cloneCompanies(companies:CompanyResult[]){return structuredClone(companies)}
function companyWebsite(value:string|undefined):string|null{
 if(!value)return null;const candidate=/^https?:\/\//i.test(value)?value:`https://${value}`;
 try{const url=new URL(candidate);return url.protocol==="http:"||url.protocol==="https:"?url.toString():null}catch{return null}
}
function mapElements(elements:OverpassElement[],fetchedAt:string):CompanyResult[]{
 const categoryKeys=new Set(["office","shop","craft","amenity","healthcare","industrial","man_made","landuse","tourism","leisure"]);
 const companies=elements.flatMap(element=>{
  const tags=element.tags??{},name=tags.name||tags.brand||tags.operator;
  if(!name?.trim())return[];
  const street=[tags["addr:street"],tags["addr:housenumber"]].filter(Boolean).join(" ");
  const locality=tags["addr:suburb"]||tags["addr:city"]||tags["addr:district"]||tags["addr:state"];
  const address=[street,locality].filter(Boolean).join(", ")||null;
  const categories=[...categoryKeys].flatMap(key=>tags[key]?[`${key}: ${tags[key]}`]:[]);
  const rawEmployees=tags.employees||tags["staff_count"]||tags["staff:count"]||tags["company:employees"]||tags["employee_count"];
  const employeeEstimate=rawEmployees&&/^\s*\d+(?:[.,]\d+)?\s*$/.test(rawEmployees)?Math.floor(Number(rawEmployees.replace(",","."))):null;
  const site=companyWebsite(tags.website||tags["contact:website"]);
  const company:CompanyResult={providerId:`osm:${element.type}:${element.id}`,name:name.trim(),address,website:site,phone:tags.phone||tags["contact:phone"]||null,mapsUrl:`https://www.openstreetmap.org/${element.type}/${element.id}`,categories,source:"OpenStreetMap · Overpass",fetchedAt,employeeEstimate:employeeEstimate&&employeeEstimate>0?employeeEstimate:null,employeeEstimateSource:employeeEstimate&&employeeEstimate>0?"OpenStreetMap · etiqueta de dotación":null};
  company.emails=publicCommercialEmails([tags.email||tags["contact:email"]||""],site);
  company.socialLinks=[...new Set(["contact:facebook","contact:instagram","contact:linkedin","facebook","instagram","linkedin"].map(key=>socialUrl(tags[key]||"")).filter((url):url is string=>Boolean(url)))];
  company.evidence=[...company.emails.map(value=>({field:"email",value,url:company.mapsUrl!,fetchedAt})),...(company.employeeEstimate?[{field:"employeeEstimate",value:String(company.employeeEstimate),url:company.mapsUrl!,fetchedAt}]:[])];
  return[company];
 });
 return[...new Map(companies.map(company=>[company.providerId,company])).values()];
}

export function radarProviders(){return{openStreetMap:true,neon:Boolean(process.env.DATABASE_URL?.trim()),ai:Boolean(process.env.RADAR_AI_API_KEY?.trim()&&process.env.RADAR_AI_BASE_URL?.trim()&&process.env.RADAR_AI_MODEL?.trim())}}

/** IA only normalizes the user's words. It never generates companies or contact facts. */
export async function interpretSearch(input:string):Promise<{query:string;explanation:string}>{
 const key=process.env.RADAR_AI_API_KEY?.trim(),base=process.env.RADAR_AI_BASE_URL?.trim(),model=process.env.RADAR_AI_MODEL?.trim();
 const intent=parseSearchIntent(input);
 const categoryDescription=intent.category==="occupational-health"?"sectores objetivo: industria, transporte y logística":`rubro: ${intent.category}`;
 const locationDescription=intent.location?`ubicación: ${intent.location}`:"cobertura: Chile";
  const sizeDescription=intent.employeeThreshold?`tamaño solicitado: más de ${intent.employeeThreshold} trabajadores (no verificable en OpenStreetMap)`:"tamaño: no publicado por la fuente";
 const facts=[categoryDescription,locationDescription,sizeDescription];
 const fallback={query:input,explanation:`Criterios locales: ${facts.join("; ")}.`};
 if(!key||!base||!model)return fallback;
 try{
  const endpoint=base.replace(/\/$/,"")+(base.replace(/\/$/,"").endsWith("/chat/completions")?"":"/chat/completions");
  const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify({model,temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:"Reduce la consulta en español a una frase corta con rubro y ubicación para buscar entidades públicas de OpenStreetMap. Devuelve JSON con query y explanation. Nunca generes empresas, contactos, hechos ni cifras. No elimines ubicación. Indica si el usuario pidió trabajadores: OpenStreetMap no contiene esa métrica."},{role:"user",content:input}]}),cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!response.ok)return{...fallback,explanation:`La IA no respondió (${response.status}); se usaron criterios locales. ${fallback.explanation}`};
  const data=await response.json() as {choices?:Array<{message?:{content?:string}}>} ;
  const parsed=JSON.parse(data.choices?.[0]?.message?.content??"") as {query?:unknown;explanation?:unknown};
  return{query:typeof parsed.query==="string"&&parsed.query.trim()?parsed.query.trim().slice(0,300):input,explanation:typeof parsed.explanation==="string"?parsed.explanation.slice(0,240):fallback.explanation};
 }catch{return{...fallback,explanation:`La IA no está disponible; se usaron criterios locales. ${fallback.explanation}`}}
}

async function scheduleSourceRequest<T>(request:()=>Promise<T>):Promise<T>{
 const task=requestQueue.then(async()=>{await wait(Math.max(0,nextRequestAt-Date.now()));nextRequestAt=Date.now()+1100;return request()});requestQueue=task.then(()=>undefined,()=>undefined);return task;
}
async function geocodeLocation(location:string):Promise<{bounds:SearchBounds;polygon:GeoPolygon}>{
 const key=normalize(location),cached=boundsCache.get(key);if(cached&&cached.expiresAt>Date.now())return{bounds:cached.bounds,polygon:cached.polygon};
 const endpoint=process.env.NOMINATIM_BASE_URL?.trim()||"https://nominatim.openstreetmap.org/search",url=new URL(endpoint);
 url.search=new URLSearchParams({q:`${location}, Chile`,countrycodes:"cl",format:"jsonv2",limit:"1",polygon_geojson:"1"}).toString();
 const response=await scheduleSourceRequest(()=>fetch(url,{headers:{"Accept-Language":"es-CL,es;q=0.9","User-Agent":"OpticaCristalRadar/1.0 (private B2B company search)"},signal:AbortSignal.timeout(12000),cache:"no-store"}));
 if(!response.ok){if(response.status===429)throw new Error("OpenStreetMap limitó temporalmente la geocodificación. Espera un momento e inténtalo de nuevo.");throw new Error(`No se pudo ubicar la comuna o región en OpenStreetMap (estado ${response.status}).`)}
 const records=await response.json() as Array<{boundingbox?:string[];geojson?:GeoPolygon}>;const box=records[0]?.boundingbox?.map(Number),polygon=records[0]?.geojson;
 if(!box||box.length!==4||box.some(value=>!Number.isFinite(value))||!polygon||!["Polygon","MultiPolygon"].includes(polygon.type))throw new Error(`No encontré el límite geográfico de “${location}” en Chile.`);
 const [south,north,west,east]=box;if(north<=south||east<=west||south< -90||north>90||west< -180||east>180)throw new Error("La fuente devolvió límites geográficos inválidos.");
 const bounds={south,west,north,east};if(boundsCache.size>=200){const oldest=boundsCache.keys().next().value;if(oldest)boundsCache.delete(oldest)}boundsCache.set(key,{expiresAt:Date.now()+24*60*60*1000,bounds,polygon});return{bounds,polygon};
}
async function fetchOverpass(query:string,budgetMs=52000){
 const deadline=Date.now()+budgetMs;
 const primary=process.env.OVERPASS_API_URL?.trim()||"https://overpass-api.de/api/interpreter",fallback=process.env.OVERPASS_FALLBACK_API_URL?.trim()??"https://overpass.private.coffee/api/interpreter",endpoints=[...new Set([primary,...(fallback?[fallback]:[])])];let lastError:unknown;
 for(const endpoint of endpoints){if(deadline-Date.now()<1000)break;try{const response=await scheduleSourceRequest(()=>fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8","Accept":"application/json","User-Agent":"OpticaCristalRadar/1.0 (private B2B company search)"},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(Math.min(26000,Math.max(1000,deadline-Date.now()))),cache:"no-store"}));if(response.ok||endpoint===endpoints.at(-1))return response;lastError=new Error(`OpenStreetMap respondió ${response.status}.`)}catch(error){lastError=error}}
 throw lastError instanceof Error&&/abort|timeout/i.test(`${lastError.name} ${lastError.message}`)?new Error("OpenStreetMap agotó el tiempo de espera en sus servidores. Intenta con otra búsqueda más acotada o vuelve a consultar más tarde."):lastError instanceof Error?lastError:new Error("No se pudo conectar con Overpass.");
}

export async function searchCompanies(query:string,interpretedQuery?:string):Promise<CompanyResult[]>{
 const key=normalize(`${query.trim()}\n${interpretedQuery?.trim()||""}`),cached=queryCache.get(key);
 if(cached&&cached.expiresAt>Date.now())return cloneCompanies(cached.companies);
 if(cached)queryCache.delete(key);
 const intent=mergeSearchIntents(query,interpretedQuery);if(!intent.location)throw new Error("Indica una comuna o región para acotar la búsqueda de empresas.");
 const area=await geocodeLocation(intent.location);if(area.bounds.north-area.bounds.south>14||area.bounds.east-area.bounds.west>14)throw new Error("Especifica una comuna para acotar esta zona geográfica.");const overpassQuery=buildOverpassQuery(intent,area.bounds),response=await fetchOverpass(overpassQuery);
 if(!response.ok){if(response.status===429)throw new Error("OpenStreetMap alcanzó temporalmente su límite de consultas. Espera un momento e inténtalo de nuevo.");if(response.status===504)throw new Error("OpenStreetMap tardó demasiado en responder. Prueba con una comuna o rubro más específico.");throw new Error(`La búsqueda de OpenStreetMap respondió con estado ${response.status}.`)}
 const payload=await response.json() as {elements?:OverpassElement[]},fetchedAt=new Date().toISOString(),companies=mapElements((payload.elements??[]).filter(element=>{const point=element.center??(element.lat!==undefined&&element.lon!==undefined?{lat:element.lat,lon:element.lon}:null);return Boolean(point&&pointInPolygon(point.lon,point.lat,area.polygon))}),fetchedAt);
 if(queryCache.size>=200){const oldest=queryCache.keys().next().value;if(oldest)queryCache.delete(oldest)}
 queryCache.set(key,{expiresAt:Date.now()+cacheTtlMs,companies});
 return cloneCompanies(companies);
}

export async function searchCompaniesByFilters(filters:RadarSearchFilters):Promise<StructuredSearchResult>{
 if(!radarRegions.includes(filters.region as typeof radarRegions[number]))throw new Error("Selecciona una región válida de Chile.");
 if(!radarIndustries.includes(filters.industry))throw new Error("Selecciona un rubro válido.");
 const cacheKey=normalize(JSON.stringify(filters)),cached=queryCache.get(cacheKey);
 if(cached&&cached.expiresAt>Date.now())return {companies:cloneCompanies(cached.companies),partial:Boolean(cached.warning),warning:cached.warning??null,stats:{...(cached.stats||{raw:cached.companies.length,outsideRegion:0,merged:0,returned:cached.companies.length}),cacheHit:true}};
 const pending=inFlight.get(cacheKey);if(pending)return pending.then(result=>({...result,companies:cloneCompanies(result.companies)}));
 const task=runStructuredSearch(filters).then(result=>{if(queryCache.size>=200){const oldest=queryCache.keys().next().value;if(oldest)queryCache.delete(oldest)}queryCache.set(cacheKey,{...result,expiresAt:Date.now()+(result.partial?60_000:cacheTtlMs)});return result}).finally(()=>inFlight.delete(cacheKey));
 inFlight.set(cacheKey,task);return task;
}
async function runStructuredSearch(filters:RadarSearchFilters):Promise<StructuredSearchResult>{
 const location=filters.region==="Metropolitana de Santiago"?"Región Metropolitana de Santiago":filters.region;
 const region=await geocodeLocation(location),area=filters.commune?await geocodeLocation(`${filters.commune}, ${location}`):region;
 if(area.bounds.north-area.bounds.south>14||area.bounds.east-area.bounds.west>14)throw new Error("Esta región tiene límites muy extensos o territorios insulares. Especifica una comuna para consultar una zona acotada.");
 const deadline=Date.now()+75_000;
 let elements:OverpassElement[]=[],partial=false,warning:string|null=null;
 const fetchPart=async(bounds:SearchBounds,budget:number)=>{const response=await fetchOverpass(buildStructuredOverpassQuery(filters,bounds),budget);if(!response.ok)throw new Error(response.status===429?"OpenStreetMap alcanzó temporalmente su límite de consultas.":"OpenStreetMap tardó demasiado en responder.");const payload=await response.json() as {elements?:OverpassElement[];remark?:string};if(!Array.isArray(payload.elements))throw new Error("La fuente devolvió una respuesta sin registros válidos.");return payload};
 try{const payload=await fetchPart(area.bounds,40_000);elements=payload.elements!;partial=Boolean(payload.remark)}catch{partial=true}
 if(partial){
  const {south,west,north,east}=area.bounds,mid=(west+east)/2;let recovered=0;
  for(const bounds of [{south,west,north,east:mid},{south,west:mid,north,east}]){const budget=Math.min(16_000,deadline-Date.now());if(budget<2000)break;try{const payload=await fetchPart(bounds,budget);elements.push(...payload.elements!);if(!payload.remark)recovered++}catch{}}
  partial=recovered<2;warning=partial?"Cobertura parcial: el proveedor no completó toda la zona. Se conservan los resultados recibidos; puedes acotar por comuna y reintentar.":null;
 }
 if(partial&&!elements.length)throw new Error("La fuente no pudo completar la consulta. Acota por comuna o vuelve a intentar más tarde.");
 const uniqueElements=[...new Map(elements.map(element=>[`${element.type}:${element.id}`,element])).values()];
 const inside=uniqueElements.filter(element=>{const point=element.center??(element.lat!==undefined&&element.lon!==undefined?{lat:element.lat,lon:element.lon}:null);return Boolean(point&&pointInPolygon(point.lon,point.lat,area.polygon)&&pointInPolygon(point.lon,point.lat,region.polygon))});
 const fetchedAt=new Date().toISOString(),mapped=mapElements(inside,fetchedAt).map(company=>({...company,region:filters.region})),companies=deduplicateCompanies(mapped);
 return {companies,partial,warning,stats:{raw:uniqueElements.length,outsideRegion:uniqueElements.length-inside.length,merged:mapped.length-companies.length,returned:companies.length,cacheHit:false}};
}
