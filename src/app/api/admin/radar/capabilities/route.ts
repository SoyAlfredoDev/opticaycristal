import {NextResponse} from "next/server";
import {hasRadarAccess} from "@/lib/radar/api";
import {radarRegions,industryOptions} from "@/lib/radar/catalog";
import {radarProviders} from "@/lib/radar/search";
export const runtime="nodejs";
export async function GET(request:Request){
 if(!await hasRadarAccess(request,"read"))return NextResponse.json({error:"No autorizado."},{status:401});
 return NextResponse.json({version:"3.0",authentication:"Sesión administrativa o Authorization: Bearer (RADAR_AGENT_API_KEY)",providers:radarProviders(),agentConfigured:Boolean(process.env.RADAR_AGENT_API_KEY?.trim()),regions:radarRegions,industries:industryOptions.map(([value,label])=>({value,label})),operations:[
  {method:"POST",path:"/api/admin/radar/search",scope:"search",body:{region:"string del catálogo",industry:"value del catálogo",commune:"string opcional",otherIndustry:"string obligatorio si industry=other"},returns:"companies: [{company, proof, assessment}], stats, partial, coverageWarning"},
  {method:"POST",path:"/api/admin/radar/prospects",scope:"save",body:{items:"Hasta 100 pares {company,proof} devueltos por search"},returns:"prospects, savedProviderIds, created, duplicates, failed, failures"},
  {method:"GET",path:"/api/admin/radar/prospects",scope:"read",returns:"prospects"},
  {method:"GET",path:"/api/admin/radar/prospects/{id}",scope:"read",returns:"prospect, assessment, activities"},
  {method:"POST",path:"/api/admin/radar/website",scope:"enrich",body:{prospectId:"string"},returns:"prospect, assessment, cached"},
  {method:"POST",path:"/api/admin/radar/enrich",scope:"enrich",body:{prospectId:"string",rut:"RUT conocido y validado"},returns:"prospect"},
  {method:"POST",path:"/api/admin/radar/analyze",scope:"analyze",body:{prospectId:"string"},returns:"analysis (estimación opcional de IA)"},
  {method:"PATCH",path:"/api/admin/radar/prospects/{id}",scope:"manage",body:{stage:"nuevo|contactado|oportunidad|ganado|descartado (opcional)",notes:"string opcional"}},
  {method:"POST",path:"/api/admin/radar/prospects",scope:"manage",body:{action:"activity",prospectId:"string",kind:"llamada|correo|reunion|nota",note:"string"}},
  {method:"GET",path:"/api/admin/radar/crm",scope:"read",returns:"CRM por empresa: contactos, tareas, oportunidades, campañas y métricas"},
  {method:"GET",path:"/api/admin/radar/crm/records",scope:"read",returns:"entity=contacts|tasks|deals|campaigns|deliveries|events, limit hasta 200, cursor por id"},
  {method:"POST",path:"/api/admin/radar/crm",scope:"manage",body:{action:"contact|task|taskStatus|deal|dealStage|conversation|reconcile",contract:"docs/RADAR-CRM-MARKETING.md"}},
  {method:"POST",path:"/api/admin/radar/crm",scope:"marketing",body:{action:"campaign|campaignStatus|enroll",approval:"Aprobar contenido solo con sesión administrativa"}},
  {method:"POST",path:"/api/admin/radar/crm",scope:"send",body:{action:"dispatch",campaignId:"string"},returns:"Hasta cinco envíos de campaña aprobada, presupuesto diario y supresiones"},
  {method:"GET",path:"/api/admin/radar/activities",scope:"read",returns:"Últimas 100 actividades"}
 ],limits:{searchesPerMinute:12,batchSize:100,websitePages:3,websiteCacheHours:24,searchCacheHours:6,aiAnalysesPerHour:10},automationNote:"Configurar Nominatim propio o contratado para ejecución autónoma. Los límites en memoria son por proceso; varios workers requieren una cola y rate limiting compartido.",emailMarketing:{implemented:true,provider:"Resend",sendingEnabled:process.env.RADAR_MARKETING_ENABLED==="true",consentRequired:true,primaryCTA:true,webhook:"/api/radar/resend/webhook",warning:"Aperturas y clics son orientativos; formulario o gestión confirma conversación. No existe bot conectado todavía."}});
}
