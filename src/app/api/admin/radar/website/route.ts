import {NextResponse} from "next/server";
import {allowAttempt,clientIp} from "@/lib/auth";
import {hasRadarAccess,readRadarBody,RadarApiError,apiFailure} from "@/lib/radar/api";
import {getProspect,saveWebData} from "@/lib/radar/db";
import {enrichCompanyWebsite} from "@/lib/radar/website";
import {assessCompany} from "@/lib/radar/assessment";
export const runtime="nodejs";
export const maxDuration=120;
export async function POST(request:Request){
 if(!await hasRadarAccess(request,"enrich"))return NextResponse.json({error:"No autorizado."},{status:401});
 if(!allowAttempt(`radar-web:${clientIp(request)}`,20,60_000))return NextResponse.json({error:"Espera un minuto antes de consultar más webs."},{status:429});
 try{const body=await readRadarBody(request);if(typeof body.prospectId!=="string"||body.prospectId.length>100)throw new RadarApiError("Prospecto inválido.");
  const prospect=await getProspect(body.prospectId);if(!prospect)throw new RadarApiError("No existe el prospecto.",404);
  const age=prospect.webCheckedAt?Date.now()-new Date(prospect.webCheckedAt).getTime():Infinity;
  if(body.refresh===true&&age<60_000)throw new RadarApiError("Espera un minuto antes de actualizar esta web.",429);
  if(body.refresh!==true&&age<24*60*60*1000)return NextResponse.json({prospect,assessment:assessCompany(prospect),cached:true});
  const data=await enrichCompanyWebsite(prospect),saved=await saveWebData(prospect.id,data);if(!saved)throw new RadarApiError("No existe el prospecto.",404);
  return NextResponse.json({prospect:saved,assessment:assessCompany(saved),pagesWithEvidence:[...new Set(data.evidence.map(entry=>entry.url))],cached:false});
 }catch(error){const failure=apiFailure(error);return NextResponse.json(failure.body,{status:failure.status})}
}
