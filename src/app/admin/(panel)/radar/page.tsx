import {RadarPanel} from "@/components/admin/RadarPanel";
import {getSession} from "@/lib/auth";
import {listProspects} from "@/lib/radar/db";
import {radarProviders} from "@/lib/radar/search";
import type {Prospect} from "@/lib/radar/types";
export const dynamic="force-dynamic";
export default async function RadarPage(){if(!(await getSession()))return null;let prospects:Prospect[]=[];let dbError:string|null=null;try{prospects=await listProspects()}catch(e){dbError=e instanceof Error?e.message:"Neon todavía no está configurado."}return <RadarPanel initialProspects={prospects} providers={{...radarProviders(),neon:dbError===null}} dbError={dbError}/>;}
