import { privateCustomerRead } from "@/lib/clients/private-read";
import { saleInterestQuote,CommitmentError } from "@/lib/clients/commitments";
import { todayChile } from "@/lib/clients/sales";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params;return privateCustomerRead(request,async owner=>{try{return await saleInterestQuote(id,todayChile(),owner);}catch(error){if(error instanceof CommitmentError)return null;throw error;}});}
