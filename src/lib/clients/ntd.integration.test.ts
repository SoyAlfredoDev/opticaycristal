// @vitest-environment node
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
const state=vi.hoisted(()=>({pool:null as unknown}));
vi.mock('./db',()=>({clientPool:()=>state.pool,clientTable:(name:string)=>`"${name}"`}));
import {saveSaleProduct,quoteSale,createSale,parseSale,recordSalePayment,listCustomerSales,todayChile,reverseSalePayment,changeSaleState} from './sales';
import {getCustomerProfile} from './store';
import {clientFingerprint,protectClientValue} from './privacy';
const db=new PGlite();
const conn={query:async(sql:string,v?:unknown[])=>{const r=await db.query(sql,v);return{...r,rowCount:r.affectedRows??r.rows.length};},release(){}};
state.pool={query:conn.query,connect:async()=>conn};
let productId='',saleId='',paymentId='';
const proof:Record<string,unknown>={product:'NTD — ficticio',protectedCost:20000,saleTotal:45000,environment:'PostgreSQL aislado en memoria',productionDataChanged:false};
const input=(customerId='ntd-start',credit=13500,count=1)=>parseSale({customerId,productId,quantity:1,total:45000,credit,installmentCount:count,firstDueDate:'2030-01-31',identityChecked:true,depositReceived:true,requestKey:randomUUID()});
beforeAll(async()=>{
 vi.stubEnv('CLIENT_DATA_KEY',randomBytes(32).toString('base64'));
 for(const f of ['001-customers.sql','002-sales.sql','003-audit.sql'])await db.exec(await readFile('sql/clients/'+f,'utf8'));
 for(const tier of ['start','vip','premium','elite'])await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified",category) VALUES($1,'Cliente NTD',$2,'Cliente','NTD',$3,$4,$5,true,$6)`,['ntd-'+tier,tier+'@example.invalid',protectClientValue('123456785','rut'),clientFingerprint(tier,'rut'),protectClientValue('+56912345678','whatsapp'),tier]);
 productId=await saveSaleProduct({name:'NTD — ficticio',protectedCost:20000},'vendedor-prueba');
},30000);
afterAll(async()=>{if(process.env.OC_NTD_REPORT_PATH)await writeFile(process.env.OC_NTD_REPORT_PATH,JSON.stringify(proof,null,2)+'\n');await db.close();vi.unstubAllEnvs();});
describe.sequential('Demostración NTD: venta $45.000 y costo protegido $20.000',()=>{
 it('aplica porcentaje y costo en los cuatro niveles',async()=>{
  const rows=[];for(const[tier,credit,deposit]of [['start',13500,31500],['vip',18000,27000],['premium',25000,20000],['elite',25000,20000]] as const){const q=await quoteSale(input('ntd-'+tier));expect(q).toMatchObject({total:45000,net:37815,vat:7185,maximumCredit:credit,minimumDeposit:deposit,protectedCost:20000});rows.push({tier,total:q.total,credit:q.maximumCredit,deposit:q.minimumDeposit});}proof.tiers=rows;
 });
 it('protege el costo por unidad y bloquea financiar sin margen sobre ese costo',async()=>{expect(await quoteSale({...input(),total:20000})).toMatchObject({maximumCredit:0,minimumDeposit:20000});expect(await quoteSale({...input(),quantity:2})).toMatchObject({maximumCredit:5000,minimumDeposit:40000});expect(await quoteSale({...input(),quantity:3})).toMatchObject({maximumCredit:0,minimumDeposit:45000});proof.costGuard=true;});
 it('registra una venta Start una sola vez y la muestra sin costos al cliente',async()=>{
  const request=input();saleId=await createSale(request,'vendedor-prueba');expect(await createSale(request,'vendedor-prueba')).toBe(saleId);
  const sales=await listCustomerSales('ntd-start');expect(sales).toHaveLength(1);expect(sales[0]).toMatchObject({productName:'NTD — ficticio',total:45000,deposit:31500,credit:13500,remaining:13500,installments:[{amount:13500,dueDate:'2030-01-31',paid:0}]});expect(sales[0]).not.toHaveProperty('protectedCost');expect(sales[0]).not.toHaveProperty('createdBy');expect(await listCustomerSales('otra-cuenta')).toEqual([]);
  const profile=await getCustomerProfile('ntd-start');expect(profile?.credit).toMatchObject({principalOutstanding:13500,capacity:26500,available:0});await expect(createSale(input(),'vendedor-prueba')).rejects.toThrow();proof.startSale={total:45000,deposit:31500,credit:13500,remaining:13500,oneMonthlyInstallment:true,duplicatePrevented:true,customerPrivacy:true};
 });
 it('aplica abono, evita duplicados/sobrepago y libera el cupo al pagar',async()=>{
  const payment={saleId,requestKey:randomUUID(),amount:10000,paidOn:todayChile(),reference:'NTD prueba abono'};paymentId=await recordSalePayment(payment,'vendedor-prueba');expect(await recordSalePayment(payment,'vendedor-prueba')).toBe(paymentId);expect((await listCustomerSales('ntd-start'))[0].remaining).toBe(3500);
  await expect(recordSalePayment({...payment,requestKey:randomUUID(),amount:3501},'vendedor-prueba')).rejects.toThrow('supera');await recordSalePayment({...payment,requestKey:randomUUID(),amount:3500,reference:'NTD prueba cierre'},'vendedor-prueba');expect((await listCustomerSales('ntd-start'))[0].remaining).toBe(0);expect((await getCustomerProfile('ntd-start'))?.credit).toMatchObject({principalOutstanding:0,capacity:40000,available:40000});proof.payments={first:10000,remainingAfterFirst:3500,last:3500,finalRemaining:0,restoredCapacity:40000,duplicatePrevented:true,overpaymentRejected:true};
 });
 it('mantiene cuotas mensuales y trazabilidad de reverso y anulación',async()=>{
  const premium=await createSale(input('ntd-premium',25000,2),'vendedor-prueba');const sale=(await listCustomerSales('ntd-premium'))[0];expect(sale.installments.map(i=>({amount:i.amount,date:i.dueDate}))).toEqual([{amount:12500,date:'2030-01-31'},{amount:12500,date:'2030-02-28'}]);
  const pay=await recordSalePayment({saleId:premium,requestKey:randomUUID(),amount:12500,paidOn:todayChile(),reference:'NTD premium prueba'},'vendedor-prueba');await expect(changeSaleState({action:'cancel',saleId:premium,reason:'Prueba'},'vendedor-prueba')).rejects.toThrow('Revierte');await reverseSalePayment({paymentId:pay,reason:'Reverso de prueba'},'vendedor-prueba');await changeSaleState({action:'cancel',saleId:premium,reason:'Anulación de prueba'},'vendedor-prueba');const cancelled=(await listCustomerSales('ntd-premium'))[0];expect(cancelled).toMatchObject({status:'cancelled',remaining:0,payments:[{reversed:true}]});expect((await getCustomerProfile('ntd-premium'))?.credit.principalOutstanding).toBe(0);proof.monthly={first:'2030-01-31',second:'2030-02-28',each:12500,reversalAndCancellation:true};
 });
});
