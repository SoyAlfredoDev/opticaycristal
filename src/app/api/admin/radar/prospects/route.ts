import {hasRadarAccess,readRadarBody,apiFailure,RadarApiError} from "@/lib/radar/api";
import {NextResponse} from "next/server";

import {addActivity,listProspects,listProspectPage,saveProspect,saveProspectWithStatus} from "@/lib/radar/db";
import {assessCompany} from "@/lib/radar/assessment";
import {verifyResult} from "@/lib/radar/integrity";
import type {Activity,CompanyResult} from "@/lib/radar/types";
export const runtime="nodejs";
export async function GET(request?:Request){
 if(!(await hasRadarAccess(request,"read")))return NextResponse.json({error:"No autorizado."},{status:401});
 try{const params=request?new URL(request.url).searchParams:null;
  if(params?.has("limit")){const limit=Number(params.get("limit")),cursor=params.get("cursor"),stage=params.get("stage");if(!Number.isInteger(limit)||limit<1||limit>500||cursor&&cursor.length>100||stage&&!["nuevo","contactado","oportunidad","ganado","descartado"].includes(stage))throw new RadarApiError("Paginación inválida. Usa limit de 1 a 500 y un estado válido.");const page=await listProspectPage(limit,cursor,stage);return NextResponse.json({...page,prospects:page.prospects.map(p=>({...p,assessment:assessCompany(p)}))})}
  return NextResponse.json({prospects:(await listProspects()).map(p=>({...p,assessment:assessCompany(p)}))})
 }catch(error){const failure=apiFailure(error);return NextResponse.json(failure.body,{status:failure.status})}
}
export async function POST(request:Request){
 if(!(await hasRadarAccess(request,"save"))&&!(await hasRadarAccess(request,"manage")))return NextResponse.json({error:"No autorizado."},{status:401});
 let body:unknown;try{body=await readRadarBody(request,1_000_000)}catch(error){const failure=apiFailure(error);return NextResponse.json(failure.body,{status:failure.status})}
 const contentLength=Number(request.headers.get("content-length")??0);if(contentLength>1_000_000)return NextResponse.json({error:"El grupo supera el tamaño permitido."},{status:413});
 if(body&&typeof body==="object"&&Array.isArray((body as {items?:unknown}).items)){
  if(!await hasRadarAccess(request,"save"))return NextResponse.json({error:"El agente no tiene permiso de guardado."},{status:401});
  const items=(body as {items:unknown[]}).items;if(items.length>100)return NextResponse.json({error:"Puedes guardar hasta 100 resultados por búsqueda."},{status:400});
  const signed=items as Array<{company?:CompanyResult;proof?:string}>;
  if(signed.some(item=>!item||!item.company||typeof item.proof!=="string"||!verifyResult(item.company,item.proof)))return NextResponse.json({error:"Uno o más resultados no tienen una firma válida. Vuelve a realizar la búsqueda."},{status:400});
  const outcomes:Array<{providerId:string;prospect:Awaited<ReturnType<typeof saveProspectWithStatus>>["prospect"];created:boolean;error?:never}|{providerId:string;error:string;prospect?:never;created?:never}|null>=new Array(signed.length).fill(null);
  let next=0;
  const worker=async()=>{while(true){const index=next++;if(index>=signed.length)return;const item=signed[index],providerId=item.company!.providerId;try{const result=await saveProspectWithStatus(item.company!);outcomes[index]={providerId,...result}}catch(error){outcomes[index]={providerId,error:error instanceof Error?error.message.slice(0,240):"Error de base de datos."}}}};
  await Promise.all(Array.from({length:Math.min(8,signed.length)},()=>worker()));
  const successful=outcomes.filter((result):result is Exclude<typeof result,null>=>Boolean(result&&"prospect" in result));
  const failures=outcomes.filter((result):result is Exclude<typeof result,null>=>Boolean(result&&"error" in result));
  const prospects=successful.map(result=>result.prospect),created=successful.filter(result=>result.created).length;
  return NextResponse.json({prospects,savedProviderIds:successful.map(result=>result.providerId),created,duplicates:successful.filter(result=>!result.created).length,failed:failures.length,failures},{status:200});
 }
 const value=body as {company?:CompanyResult;proof?:string;action?:string;prospectId?:string;kind?:Activity["kind"];note?:string};
 try{
  if(value.action==="activity"){if(!await hasRadarAccess(request,"manage"))return NextResponse.json({error:"El agente no tiene permiso de gestión."},{status:401});if(typeof value.prospectId!=="string"||!["llamada","correo","reunion","nota"].includes(value.kind||"")||typeof value.note!=="string"||!value.note.trim()||value.note.length>2000)return NextResponse.json({error:"Completa el tipo y el detalle de la actividad."},{status:400});return NextResponse.json({activity:await addActivity(value.prospectId,value.kind!,value.note.trim())},{status:201})}
  if(!await hasRadarAccess(request,"save"))return NextResponse.json({error:"El agente no tiene permiso de guardado."},{status:401});
  const c=value.company;if(!c||typeof value.proof!=="string"||!verifyResult(c,value.proof))return NextResponse.json({error:"El resultado no proviene de una búsqueda verificada. Vuelve a consultar la fuente."},{status:400});
  const prospect=await saveProspect(c);return NextResponse.json({prospect},{status:201});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"No se pudo guardar el prospecto."},{status:503})}
}
