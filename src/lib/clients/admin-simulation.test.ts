import { beforeEach,describe,expect,it,vi } from "vitest";
const mock=vi.hoisted(()=>({find:vi.fn(),snapshot:vi.fn(),products:vi.fn(),tiers:vi.fn()}));
vi.mock("./sales",()=>({findCustomerByRut:mock.find,listSaleProducts:mock.products,todayChile:()=>"2026-11-02",SaleError:class SaleError extends Error{}}));
vi.mock("./store",()=>({getCustomerSnapshot:mock.snapshot,getCustomerTiers:mock.tiers}));
import { calculateAdminSimulation,defaultSimulationDate } from "./admin-simulation";
const tiers=[{code:"start",name:"Start",maxPercent:30,maxAmount:40000,maxInstallments:1},{code:"vip",name:"VIP",maxPercent:40,maxAmount:60000,maxInstallments:2},{code:"premium",name:"Premium",maxPercent:60,maxAmount:80000,maxInstallments:3},{code:"elite",name:"Élite",maxPercent:70,maxAmount:150000,maxInstallments:4}];
const input={mode:"tier",total:"45.000",firstDueDate:"2026-11-30"};
beforeEach(()=>{vi.clearAllMocks();mock.tiers.mockResolvedValue(tiers);mock.products.mockResolvedValue([{id:"ntd",name:"NTD",protectedCost:20000}]);mock.find.mockResolvedValue("customer-qa");mock.snapshot.mockResolvedValue({customer:{id:"customer-qa",firstName:"Cliente",lastName:"Prueba",rut:"123456785",emailVerified:true,tier:tiers[0],credit:{capacity:40000,available:40000,principalOutstanding:0}}});});
describe("Propuestas administrativas de crédito",()=>{
 it.each([[0,13500,31500],[1,18000,27000],[2,27000,18000],[3,31500,13500]])("respeta el porcentaje y cuotas de la categoría %i",async(index,credit,deposit)=>{const t=tiers[index],q=await calculateAdminSimulation({...input,tierCode:t.code,installmentCount:t.maxInstallments});expect(q.credit).toBe(credit);expect(q.deposit).toBe(deposit);expect(q.installments).toHaveLength(t.maxInstallments);expect(q.installments.reduce((s,i)=>s+i.amount,0)).toBe(credit);expect(q.total).toBe(q.net+q.vat);});
 it.each(tiers)("limita $1.000.000 al cupo de $name y deja la diferencia como pie",async t=>{const q=await calculateAdminSimulation({...input,total:"1.000.000",tierCode:t.code,installmentCount:t.maxInstallments});expect(q.credit).toBe(t.maxAmount);expect(q.deposit).toBe(1000000-t.maxAmount);});
 it("cubre el costo configurado sin exponerlo en la propuesta",async()=>{const q=await calculateAdminSimulation({...input,tierCode:"elite",installmentCount:4,productId:"ntd"});expect(q.credit).toBe(25000);expect(q.deposit).toBe(20000);expect(q).not.toHaveProperty("protectedCost");});
 it("resuelve la categoría por RUT e ignora los límites enviados por el navegador",async()=>{const q=await calculateAdminSimulation({...input,mode:"customer",rut:"12.345.678-5",tierCode:"elite",installmentCount:1,total:"1.000.000",maxAmount:999999,credit:999999});expect(q.tier.code).toBe("start");expect(q.credit).toBe(40000);expect(mock.find).toHaveBeenCalledWith("12.345.678-5");});
 it("no habilita crédito si falta el correo o existe deuda activa",async()=>{for(const partial of [{emailVerified:false,credit:{capacity:40000,available:0,principalOutstanding:0}},{emailVerified:true,credit:{capacity:30000,available:0,principalOutstanding:10000}}]){const data=await mock.snapshot();mock.snapshot.mockResolvedValueOnce({customer:{...data.customer,...partial}});const q=await calculateAdminSimulation({...input,mode:"customer",rut:"12.345.678-5",installmentCount:1});expect(q.credit).toBe(0);expect(q.deposit).toBe(45000);expect(q.installments).toEqual([]);expect(q.reason).toBeTruthy();}});
 it("rechaza cuotas excedidas y fechas inválidas; ancla el mes corto",async()=>{await expect(calculateAdminSimulation({...input,tierCode:"start",installmentCount:4})).rejects.toThrow(/cuotas/);await expect(calculateAdminSimulation({...input,tierCode:"start",installmentCount:1,firstDueDate:"2027-02-31"})).rejects.toThrow(/fecha/);expect(defaultSimulationDate("2027-01-31")).toBe("2027-02-28");});
 it("cambia la huella cuando cambia el cupo para impedir descargar datos desactualizados",async()=>{const a=await calculateAdminSimulation({...input,tierCode:"start",installmentCount:1});mock.tiers.mockResolvedValueOnce([{...tiers[0],maxAmount:10000}]);const b=await calculateAdminSimulation({...input,tierCode:"start",installmentCount:1});expect(a.fingerprint).not.toBe(b.fingerprint);});
});
it("exige el costo de la operación cuando el producto es variable",async()=>{
 mock.products.mockResolvedValue([{id:"variable",name:"Lente óptico",protectedCost:null}]);
 await expect(calculateAdminSimulation({...input,tierCode:"start",installmentCount:1,productId:"variable"})).rejects.toThrow(/costo protegido/);
 const q=await calculateAdminSimulation({...input,tierCode:"start",installmentCount:1,productId:"variable",unitProtectedCost:40000});expect(q.credit).toBe(5000);expect(q.deposit).toBe(40000);expect(q).not.toHaveProperty("unitProtectedCost");
});
it("usa las condiciones de la categoría aunque el producto tenga costo variable o configurado",async()=>{
 mock.products.mockResolvedValue([{id:"variable",name:"Lente Óptico",protectedCost:null},{id:"fixed",name:"Montura",protectedCost:40000}]);
 const variable=await calculateAdminSimulation({...input,tierCode:"start",installmentCount:1,productId:"variable",pricingPolicy:"category"});
 const fixed=await calculateAdminSimulation({...input,tierCode:"start",installmentCount:1,productId:"fixed",pricingPolicy:"category"});
 expect(variable.credit).toBe(13500);expect(variable.deposit).toBe(31500);expect(fixed.credit).toBe(variable.credit);expect(fixed.deposit).toBe(variable.deposit);
});
