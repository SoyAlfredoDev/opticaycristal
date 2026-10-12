import {NextResponse} from "next/server";
import {hasRadarAccess,apiFailure} from "@/lib/radar/api";
import {listRecentActivities} from "@/lib/radar/db";
export const runtime="nodejs";
export async function GET(request:Request){if(!await hasRadarAccess(request,"read"))return NextResponse.json({error:"No autorizado."},{status:401});try{return NextResponse.json({activities:await listRecentActivities()})}catch(error){const failure=apiFailure(error);return NextResponse.json(failure.body,{status:failure.status})}}
