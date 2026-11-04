import 'server-only';
import {clientPool,clientTable as t} from '@/lib/clients/db';
import {getCustomerHistoryPage,getCustomerPaymentPage} from '@/lib/clients/history';
import {saleInterestQuote,CommitmentError} from '@/lib/clients/commitments';
import {todayChile} from '@/lib/clients/sales';
import {availableCredit} from '@/lib/clients/types';
import type {CustomerSummary} from '@/lib/clients/types';
import type {SalePayment} from '@/lib/clients/sales-types';
import {fail,text} from './security';
const payment=(p:SalePayment)=>({id:p.id,principalAmount:p.amount,interestAmount:p.interestAmount,interestWaived:p.interestWaived,totalAmount:p.totalAmount,paidOn:p.paidOn,reversed:p.reversed});
export function after(body:Record<string,unknown>){return body.cursor===undefined?null:text(body.cursor,512);}
export async function financeSummary(customer:CustomerSummary){
 const asOf=todayChile();
 const r=await clientPool().query(`SELECT COALESCE((SELECT principal_outstanding FROM ${t('oc_client_credit_balances')} WHERE user_id=$1),0) AS outstanding, COALESCE(sum(greatest(i.amount-i.paid,0)) FILTER(WHERE i.due_date<$2::date),0)::bigint AS overdue, min(i.due_date)::text AS next_due FROM ${t('oc_client_installments')} i JOIN ${t('oc_client_sales')} s ON s.id=i.sale_id WHERE s.user_id=$1 AND s.status='active' AND i.paid<i.amount`,[customer.id,asOf]);
 const outstanding=Number(r.rows[0].outstanding),credit=availableCredit(customer.tier.maxAmount,outstanding,customer.emailVerified&&outstanding===0);
 return{currency:'CLP',asOf,timeZone:'America/Santiago',principalOutstanding:outstanding,overduePrincipal:Number(r.rows[0].overdue),nextUnpaidDueDate:r.rows[0].next_due??null,interestIncluded:false,credit:{capacity:credit.capacity,usableNow:credit.available,canUseNow:credit.available>0}};
}
export async function installments(owner:string,body:Record<string,unknown>){
 const page=await getCustomerHistoryPage(owner,true,after(body));
 return{currency:'CLP',asOf:todayChile(),sales:page.sales.map(s=>({id:s.id,status:s.status,total:s.total,deposit:s.deposit,financedPrincipal:s.credit,remainingPrincipal:s.remaining,createdAt:s.createdAt,installments:s.installments.map(i=>({...i,remainingPrincipal:Math.max(0,i.amount-i.paid)}))})),nextCursor:page.nextCursor,pageSize:10};
}
export async function balance(owner:string,body:Record<string,unknown>){
 const id=text(body.saleId,128);try{const q=await saleInterestQuote(id,todayChile(),owner);return{currency:'CLP',saleId:id,asOf:q.asOf,principalDue:q.principalDue,lateInterestDue:q.due,totalDue:q.totalDue,contractAnnualLateRate:q.annualRate};}catch(e){if(e instanceof CommitmentError)fail('RESOURCE_NOT_FOUND','No encontramos el recurso solicitado.',404);throw e;}
}
export async function payments(owner:string,body:Record<string,unknown>){const page=await getCustomerPaymentPage(owner,text(body.saleId,128),after(body));if(!page)fail('RESOURCE_NOT_FOUND','No encontramos el recurso solicitado.',404);return{currency:'CLP',saleId:body.saleId,payments:page.payments.map(payment),nextCursor:page.nextCursor,pageSize:10};}
