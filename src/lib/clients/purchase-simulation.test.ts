import {describe,it,expect} from 'vitest';
import {simulatePurchase,parsePurchasePrice} from './purchase-simulation';
import {monthlyInstallments} from './financing';
const start={tier:{maxPercent:30,maxAmount:40000,maxInstallments:1},outstanding:0,emailVerified:true};
describe('Simulación referencial de compra',()=>{
 it('limita por porcentaje y cupo, manteniendo el precio total igual al pie más crédito',()=>{
  expect(simulatePurchase(45000,1,start)).toMatchObject({total:45000,credit:13500,deposit:31500,installments:[13500]});
  expect(simulatePurchase(250000,1,start)).toMatchObject({credit:40000,deposit:210000});
 });
 it.each([[30,40000,1],[40,60000,2],[60,80000,3],[70,150000,4]])('coincide con el reparto mensual de administración para %i%%', (maxPercent,maxAmount,maxInstallments)=>{
  for(const total of [1,2,11,45001,119001,500000]){
   const result=simulatePurchase(total,maxInstallments,{...start,tier:{maxPercent,maxAmount,maxInstallments}});
   expect(result.deposit+result.credit).toBe(total);expect(result.credit).toBeLessThanOrEqual(maxAmount);expect(result.credit).toBeLessThanOrEqual(Math.floor(total*maxPercent/100));
   expect(result.installments.reduce((sum,n)=>sum+n,0)).toBe(result.credit);
   if(result.credit)expect(result.installments).toEqual(monthlyInstallments(result.credit,result.installments.length,'2030-01-31').map(i=>i.amount));
   expect(result.installments.every(n=>n>0)).toBe(true);
  }
 });
 it('no presenta crédito utilizable sin correo verificado o mientras haya deuda activa',()=>{
  expect(simulatePurchase(45000,1,{...start,emailVerified:false})).toMatchObject({credit:0,deposit:45000,installments:[],reason:'email'});
  expect(simulatePurchase(45000,1,{...start,outstanding:1000})).toMatchObject({credit:0,deposit:45000,installments:[],reason:'active'});
 });
 it('rechaza montos inválidos y cuotas superiores al nivel',()=>{
  for(const total of [0,-1,1.5,NaN,Infinity,1000000001])expect(()=>simulatePurchase(total,1,start)).toThrow();
  for(const count of [0,2,1.5,NaN])expect(()=>simulatePurchase(45000,count,start)).toThrow();
 });
 it('acepta pesos chilenos con separadores sin interpretar decimales como miles',()=>{
  expect(parsePurchasePrice('$ 45.000')).toBe(45000);expect(parsePurchasePrice('45000')).toBe(45000);
  for(const raw of ['','0','-5','45,50','1e5','texto','1000000001'])expect(()=>parsePurchasePrice(raw)).toThrow();
 });
});

describe('Matriz completa de límites por categoría',()=>{
 it.each([{name:'Start',maxPercent:30,maxAmount:40000,maxInstallments:1},{name:'VIP',maxPercent:40,maxAmount:60000,maxInstallments:2},{name:'Premium',maxPercent:60,maxAmount:80000,maxInstallments:3},{name:'Élite',maxPercent:70,maxAmount:150000,maxInstallments:4}])('$name: topes, porcentaje y todas las cuotas permitidas',tier=>{
  const threshold=Math.ceil(tier.maxAmount*100/tier.maxPercent);
  for(const total of [10000,45000,100000,250000,500000,threshold-1,threshold,threshold+1])for(let count=1;count<=tier.maxInstallments;count++){
   const result=simulatePurchase(total,count,{tier,outstanding:0,emailVerified:true});
   const expected=Math.min(Math.floor(total*tier.maxPercent/100),tier.maxAmount,total-1);
   expect(result.credit).toBe(expected);expect(result.deposit).toBe(total-expected);
   expect(result.installments).toHaveLength(count);expect(result.installments.reduce((sum,value)=>sum+value,0)).toBe(expected);
   expect(Math.max(...result.installments)-Math.min(...result.installments)).toBeLessThanOrEqual(count-1);
  }
  expect(()=>simulatePurchase(250000,tier.maxInstallments+1,{tier,outstanding:0,emailVerified:true})).toThrow('cuotas disponibles');
  for(const state of [{outstanding:1,emailVerified:true},{outstanding:0,emailVerified:false}])expect(simulatePurchase(250000,1,{tier,...state})).toMatchObject({credit:0,deposit:250000,installments:[]});
 });
});
