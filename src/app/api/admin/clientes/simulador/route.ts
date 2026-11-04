import { customerAdminSession } from "@/lib/clients/admin";
import { privateJson,readClientBody,sameClientOrigin } from "@/lib/clients/http";
import { SimulationError,lookupSimulationCustomer,calculateAdminSimulation } from "@/lib/clients/admin-simulation";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!await customerAdminSession(true))return privateJson({error:"Acceso restringido."},401);
 if(!sameClientOrigin(request))return privateJson({error:"Origen no permitido."},403);
 let body:Record<string,unknown>;try{const raw=await readClientBody(request);if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error();body=raw as Record<string,unknown>;}catch{return privateJson({error:"Datos no válidos."},400);}
 try{
  if(body.action==="lookup")return privateJson({customer:await lookupSimulationCustomer(body.rut)});
  if(body.action!=="calculate"&&body.action!=="pdf")return privateJson({error:"Acción no válida."},400);
  const quote=await calculateAdminSimulation(body);
  if(body.action==="calculate")return privateJson({quote});
  if(typeof body.expectedFingerprint!=="string"||body.expectedFingerprint!==quote.fingerprint)return privateJson({error:"Los datos cambiaron. Vuelve a calcular antes de descargar."},409);
  const { creditProposalPdf }=await import("@/lib/clients/credit-proposal-pdf");
  const bytes=await creditProposalPdf(quote);
  return new Response(Buffer.from(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="propuesta-credito-${quote.fingerprint.slice(0,10)}.pdf"`,"Cache-Control":"no-store, private","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});
 }catch(error){return privateJson({error:error instanceof SimulationError?error.message:"No pudimos preparar la propuesta. Revisa los datos e inténtalo nuevamente."},error instanceof SimulationError?400:503);}
}
