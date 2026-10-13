import {NextResponse} from "next/server";
import {allowAttempt,clientIp} from "@/lib/auth";
import {searchCompaniesByFilters} from "@/lib/radar/search";
import {hasRadarAccess,readRadarBody,validateSearchFilters,apiFailure} from "@/lib/radar/api";
import {assessCompany} from "@/lib/radar/assessment";
import {signResult} from "@/lib/radar/integrity";
export const runtime="nodejs";
export const maxDuration=300;
export async function POST(request:Request){
 if(!(await hasRadarAccess(request,"search")))return NextResponse.json({error:"La sesión expiró o el agente no tiene permiso de búsqueda."},{status:401});
 const ip=clientIp(request);if(!allowAttempt(`radar-search:${ip}`,12,60_000)||!allowAttempt(`radar-search-rate:${ip}`,1,1_000))return NextResponse.json({error:"Límite de consultas alcanzado. Espera un momento."},{status:429});
 try{const body=await readRadarBody(request);const filters=validateSearchFilters(body);if(body.emailOnly!==undefined&&typeof body.emailOnly!=="boolean")return NextResponse.json({error:"El filtro de email debe ser verdadero o falso."},{status:400});const emailOnly=body.emailOnly===true;
  if(request.headers.has("authorization")&&(!process.env.NOMINATIM_BASE_URL?.trim()||process.env.NOMINATIM_BASE_URL.includes("nominatim.openstreetmap.org")))return NextResponse.json({error:"Para búsquedas autónomas configura NOMINATIM_BASE_URL con una instancia propia o un proveedor que autorice automatización."},{status:503});
  const result=await searchCompaniesByFilters(filters),matches=emailOnly?result.companies.filter(company=>Boolean(company.emails?.length)):result.companies,coverageWarning=emailOnly&&!matches.length?"No se encontraron correos publicados por OpenStreetMap para estos criterios. Prueba buscar todas y completar datos desde sus webs.":result.warning,criteria=`${filters.region} · ${filters.commune||"toda la región"} · ${filters.industry==="other"?filters.otherIndustry:filters.industry}`;
  return NextResponse.json({companies:matches.map(company=>({company,proof:signResult(company),assessment:assessCompany(company)})),criteria,coverageWarning,partial:result.partial,stats:{...result.stats,returned:matches.length},employeeData:"La cantidad de trabajadores solo se muestra cuando la fuente la publica; una empresa sin cifra se conserva y queda pendiente de clasificar.",providers:{openStreetMap:true,ai:false}})
 }catch(error){const failure=apiFailure(error);return NextResponse.json(failure.body,{status:failure.status})}
}
