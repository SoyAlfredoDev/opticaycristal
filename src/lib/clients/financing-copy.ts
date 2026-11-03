import { calculateFinancing, type FinancingTier } from './financing';
export const FINANCING_EXAMPLE_PRICE = 80000;
/** Educational example only: no outstanding credit, fees, or protected product cost. */
export function financingExample(tier:FinancingTier,total=FINANCING_EXAMPLE_PRICE){
 const quote=calculateFinancing({total,protectedCost:0,outstanding:0,tier});
 return {price:total,credit:quote.maximumCredit,deposit:quote.minimumDeposit};
}
