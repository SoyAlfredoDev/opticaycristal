import {hasRadarAccess,readRadarBody,apiFailure} from "@/lib/radar/api";
import {NextResponse} from "next/server";

import {getProspect,listActivities,updateProspect} from "@/lib/radar/db";
import {assessCompany} from "@/lib/radar/assessment";
import type {ProspectStage} from "@/lib/radar/types";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){if(!(await hasRadarAccess(request,"read")))return NextResponse.json({error:"No autorizado."},{status:401});const{id}=await params;try{const prospect=await getProspect(id);if(!prospect)return NextResponse.json({error:"No existe el prospecto."},{status:404});return NextResponse.json({prospect,assessment:assessCompany(prospect),activities:await listActivities(id)})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"No se pudo leer el historial."},{status:503})}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){if(!(await hasRadarAccess(request,"manage")))return NextResponse.json({error:"No autorizado."},{status:401});const{id}=await params;let body:unknown;try{body=await readRadarBody(request,4096)}catch(error){const failure=apiFailure(error);return NextResponse.json(failure.body,{status:failure.status})}
 const b=body as {stage?:unknown;notes?:unknown};if(b.stage===undefined&&b.notes===undefined)return NextResponse.json({error:"Indica el estado o la observación que quieres actualizar."},{status:400});if(b.stage!==undefined&&!["nuevo","contactado","oportunidad","ganado","descartado"].includes(String(b.stage)))return NextResponse.json({error:"Estado comercial inválido."},{status:400});if(b.notes!==undefined&&(typeof b.notes!=="string"||b.notes.length>5000))return NextResponse.json({error:"La nota puede tener hasta 5.000 caracteres."},{status:400});
 try{const ok=await updateProspect(id,{stage:b.stage as ProspectStage|undefined,notes:b.notes as string|undefined});return ok?NextResponse.json({ok:true}):NextResponse.json({error:"No existe el prospecto."},{status:404})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"No se pudo actualizar."},{status:503})}}
