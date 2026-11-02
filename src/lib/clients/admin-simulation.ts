import "server-only";
import { createHash } from "node:crypto";
import { calculateFinancing,monthlyInstallments } from "./financing";
import { parsePurchasePrice } from "./purchase-simulation";
import { findCustomerByRut,listSaleProducts,todayChile,SaleError } from "./sales";
import { getCustomerSnapshot,getCustomerTiers } from "./store";
import type { CustomerProfile } from "./types";
export class SimulationError extends Error {}
export type SimulationCustomer={id:string;name:string;rut:string;tier:CustomerProfile["tier"];capacity:number;available:number;emailVerified:boolean;outstanding:number};
export type AdminSimulation={mode:"customer"|"tier";customer:SimulationCustomer|null;tier:CustomerProfile["tier"];productName:string|null;total:number;net:number;vat:number;credit:number;deposit:number;installments:{number:number;dueDate:string;amount:number}[];reason:string|null;fingerprint:string;issuedAt:string;pricingPolicy?:"category"};
export function defaultSimulationDate(today=todayChile()){
 const d=new Date(`${today}T12:00:00Z`),last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+2,0,12));
 return new Date(Date.UTC(last.getUTCFullYear(),last.getUTCMonth(),Math.min(d.getUTCDate(),last.getUTCDate()),12)).toISOString().slice(0,10);
}
export async function lookupSimulationCustomer(rut:unknown):Promise<SimulationCustomer>{
 let id:string;try{id=await findCustomerByRut(rut);}catch(error){if(error instanceof SaleError)throw new SimulationError(error.message);throw error;}
 const snapshot=await getCustomerSnapshot(id);if(!snapshot)throw new SimulationError("El cliente no está disponible.");
 const c=snapshot.customer;
 return {id:c.id,name:`${c.firstName} ${c.lastName}`,rut:c.rut,tier:c.tier,capacity:c.credit.capacity,available:c.credit.available,emailVerified:c.emailVerified,outstanding:c.credit.principalOutstanding};
}
export async function calculateAdminSimulation(input:Record<string,unknown>):Promise<AdminSimulation>{
 if(input.mode!=="customer"&&input.mode!=="tier")throw new SimulationError("Selecciona un cliente o un nivel.");
 const mode:AdminSimulation["mode"]=input.mode;
 const customer=mode==="customer"?await lookupSimulationCustomer(input.rut):null;
 const tiers=customer?null:await getCustomerTiers();
 const tier=customer?.tier??tiers?.find(t=>t.code===input.tierCode);
 if(!tier)throw new SimulationError("Selecciona un nivel válida.");
 let total:number;try{total=parsePurchasePrice(typeof input.total==="number"?String(input.total):typeof input.total==="string"?input.total:"");}catch(error){throw new SimulationError(error instanceof Error?error.message:"Revisa el precio.");}
 const count=input.installmentCount;
 if(typeof count!=="number"||!Number.isInteger(count)||count<1||count>tier.maxInstallments)throw new SimulationError("Las cuotas deben respetar el máximo del nivel.");
 if(typeof input.firstDueDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(input.firstDueDate)||input.firstDueDate<=todayChile())throw new SimulationError("Selecciona una primera cuota con fecha futura.");
 // Validate the date even when verification or an existing credit disables financing.
 try{monthlyInstallments(1,1,input.firstDueDate);}catch{throw new SimulationError("La fecha de primera cuota no es válida.");}
 if(input.pricingPolicy!==undefined&&input.pricingPolicy!=="category")throw new SimulationError("La regla de cálculo no es válida.");
 const categoryOnly=input.pricingPolicy==="category";
 let productName:string|null=null,protectedCost=0;
 if(input.productId){if(typeof input.productId!=="string"||input.productId.length>120)throw new SimulationError("El producto no es válido.");const product=(await listSaleProducts()).find(p=>p.id===input.productId);if(!product)throw new SimulationError("El producto ya no está disponible.");productName=product.name;if(!categoryOnly){if(product.protectedCost===null){if(typeof input.unitProtectedCost!=="number"||!Number.isSafeInteger(input.unitProtectedCost)||input.unitProtectedCost<1||input.unitProtectedCost>1000000000)throw new SimulationError("Ingresa el costo protegido por unidad para este producto.");protectedCost=input.unitProtectedCost;}else protectedCost=product.protectedCost;}}
 const quote=calculateFinancing({total,protectedCost,outstanding:customer?.outstanding??0,tier});
 const reason=customer&&!customer.emailVerified?"El cliente debe verificar su correo para usar el crédito.":customer&&customer.outstanding>0?"El cliente tiene un crédito activo. No se habilita otro hasta pagarlo.":null;
 const credit=reason?0:Math.min(quote.maximumCredit,customer?.available??quote.maximumCredit);
 const installments=credit?monthlyInstallments(credit,Math.min(count,credit),input.firstDueDate):[];
 const net=Math.round(total/1.19);
 const base: Omit<AdminSimulation, "fingerprint" | "issuedAt">={mode,customer,tier,productName,total,net,vat:total-net,credit,deposit:total-credit,installments,reason,...(categoryOnly?{pricingPolicy:"category"}:{})};
 const fingerprint=createHash("sha256").update(JSON.stringify(base)).digest("hex");
 return {...base,fingerprint,issuedAt:new Date().toISOString()};
}
