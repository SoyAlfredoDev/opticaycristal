import { describe,it,expect } from "vitest";
import { calculateLateInterest } from "./loan-interest";
const schedule=[{amount:20000,dueDate:"2026-01-01"}];
describe("Mora simple de contratos nuevos",()=>{
 it("respeta los sesenta días y cobra solo desde el día 61",()=>{expect(calculateLateInterest(schedule,[],"2026-03-02",18).due).toBe(0);expect(calculateLateInterest(schedule,[],"2026-03-03",18).due).toBe(10);expect(calculateLateInterest(schedule,[],"2026-04-01",18).due).toBe(300);});
 it("no cobra sobre capital pagado, cuotas futuras ni el periodo de gracia",()=>{const result=calculateLateInterest([...schedule,{amount:20000,dueDate:"2026-04-01"}],[{amount:10000,paidOn:"2026-03-17"}],"2026-04-01",18);expect(result.accrued).toBe(225);});
 it("mantiene los contratos antiguos sin interés",()=>{expect(calculateLateInterest(schedule,[],"2026-12-31",0).due).toBe(0);});
 it("resta mora pagada y condonaciones sin capitalizarlas",()=>{const p=[{amount:0,paidOn:"2026-03-17",interestAmount:100,interestWaived:20}];expect(calculateLateInterest(schedule,p,"2026-04-01",18)).toEqual({accrued:300,paid:100,waived:20,due:180});});
 it("los pagos revertidos no reducen capital ni intereses",()=>{expect(calculateLateInterest(schedule,[{amount:20000,paidOn:"2026-01-02",reversed:true}],"2026-04-01",18).due).toBe(300);});
 it("detiene el devengo una vez pagado el capital y descarta pagos posteriores a la fecha consultada",()=>{expect(calculateLateInterest(schedule,[{amount:20000,paidOn:"2026-03-17"}],"2026-04-01",18).due).toBe(150);expect(calculateLateInterest(schedule,[{amount:20000,paidOn:"2026-04-02"}],"2026-04-01",18).due).toBe(300);});
 it("rechaza tasas superiores a la aprobada y fechas inexistentes",()=>{expect(()=>calculateLateInterest(schedule,[],"2026-04-01",60)).toThrow();expect(()=>calculateLateInterest(schedule,[],"2026-02-31",18)).toThrow();});
});
it("no genera mora antes de confirmar la firma del cliente",()=>{expect(calculateLateInterest(schedule,[],"2026-04-01",18,60,"2026-03-17").due).toBe(150);});
