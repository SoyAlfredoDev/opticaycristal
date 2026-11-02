/** Simple interest on overdue principal only. Day 60 is free; day 61 accrues one day. */
export type InterestPayment={amount:number;paidOn:string;interestAmount?:number;interestWaived?:number;reversed?:boolean};
export function calculateLateInterest(installments:{amount:number;dueDate:string}[],payments:InterestPayment[],asOf:string,annualRate=0,graceDays=60,notBefore?:string){
 const day=(value:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error("Fecha no válida.");const date=new Date(`${value}T12:00:00Z`);if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error("Fecha no válida.");return Math.floor(date.getTime()/86400000);};
 if(!Number.isFinite(annualRate)||annualRate<0||annualRate>18||!Number.isInteger(graceDays)||graceDays<60)throw new Error("Política de mora no válida.");
 const until=day(asOf),rate=BigInt(Math.round(annualRate*100));
 const balances=installments.map(i=>{if(!Number.isSafeInteger(i.amount)||i.amount<1)throw new Error("Cuota no válida.");return{balance:i.amount,start:Math.max(day(i.dueDate)+graceDays,notBefore?day(notBefore):-Infinity)};});
 let previous=-Infinity,numerator=BigInt(0),paid=0,waived=0;
 const accrue=(end:number)=>{for(const i of balances){const days=Math.max(0,end-Math.max(previous,i.start));numerator+=BigInt(i.balance)*rate*BigInt(days);}};
 for(const payment of payments.filter(p=>!p.reversed&&day(p.paidOn)<=until).slice().sort((a,b)=>a.paidOn.localeCompare(b.paidOn))){
  if(![payment.amount,payment.interestAmount??0,payment.interestWaived??0].every(n=>Number.isSafeInteger(n)&&n>=0))throw new Error("Pago no válido.");
  const end=day(payment.paidOn);accrue(end);previous=end;
  let capital=payment.amount;for(const i of balances){const amount=Math.min(capital,i.balance);i.balance-=amount;capital-=amount;}
  if(capital)throw new Error("Los pagos superan el capital original.");
  paid+=payment.interestAmount??0;waived+=payment.interestWaived??0;
 }
 accrue(until);
 const accrued=Number(numerator/BigInt(3_600_000));
 if(!Number.isSafeInteger(accrued))throw new Error("La mora requiere revisión manual.");
 return{accrued,paid,waived,due:Math.max(0,accrued-paid-waived)};
}
