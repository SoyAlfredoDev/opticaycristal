import { calculateFinancing, type FinancingTier } from "./financing";
export type SimulationConditions={tier:FinancingTier;outstanding:number;emailVerified:boolean};
/** Reference estimate only: no product has been chosen and protected costs stay on the server. */
export function simulatePurchase(total:number,count:number,conditions:SimulationConditions){
 const quote=calculateFinancing({total,protectedCost:0,outstanding:conditions.outstanding,tier:conditions.tier});
 if(!Number.isInteger(count)||count<1||count>quote.maxInstallments)throw new Error("Elige las cuotas disponibles para tu categoría.");
 const reason=!conditions.emailVerified?"email":conditions.outstanding>0?"active":null;
 const credit=reason?0:quote.maximumCredit;
 const installmentCount=Math.min(count,credit),base=installmentCount?Math.floor(credit/installmentCount):0;
 const installments=Array.from({length:installmentCount},(_,i)=>i===installmentCount-1?credit-base*i:base);
 return {total,credit,deposit:total-credit,installments,reason};
}
export type PurchaseSimulation=ReturnType<typeof simulatePurchase>;
export function parsePurchasePrice(raw:string){
 const digits=raw.trim().replace(/[$.\s]/g,"");
 if(!/^\d{1,10}$/.test(digits))throw new Error("Ingresa el precio en pesos enteros. Por ejemplo: 45.000.");
 const value=Number(digits);
 if(!Number.isSafeInteger(value)||value<1||value>1_000_000_000)throw new Error("Ingresa un precio válido mayor a cero.");
 return value;
}
