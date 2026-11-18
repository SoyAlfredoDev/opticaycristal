"use client";
import Link from "next/link";
import type { CategorySettings } from "@/lib/clients/category-types";
import { SaleCustomerLevel } from "./SaleCustomerLevel";
import { customerDocumentText, parseCustomerDocument, type DocumentFields } from "@/lib/clients/customer-document";
import { blankDocument, CustomerDocumentTypeFields } from "./CustomerDocumentFields";
import {AdminCreateCustomer} from "./AdminCreateCustomer";
import {StaffWhatsappVerification} from "./AdminCustomerContacts";
import { useRef,useState,type FormEvent } from "react";
import { ArrowRight, Pencil, Search, Users } from "lucide-react";
import { CustomerEmailVerification } from "./CustomerEmailVerification";
import { SaleConfirmation } from "./SaleConfirmation";
import { CustomerDetailsEditor } from "./CustomerDetailsEditor";
import wizard from "./AdminSales.module.css";
import type { SaleCustomer } from "@/lib/clients/types";
import { availableCredit, clp } from "@/lib/clients/types";
import { monthlyInstallments } from "@/lib/clients/financing";
import type { SaleProduct,SaleQuote } from "@/lib/clients/sales-types";
import { SalesRequestError,durableAction,salesAction } from "./sales-client";
import { OperationRecovery } from "./OperationRecovery";
import styles from "./ClientSpace.module.css";
export { salesAction,SalesRequestError } from "./sales-client";

const purchaseDate = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" });

function SalesCustomerSummary({ customer, tiers, canEdit, disabled, onUpdated }: {
  customer: SaleCustomer; tiers: SaleCustomer["tier"][]; canEdit: boolean; disabled: boolean;
  onUpdated: (settings: CategorySettings) => void;
}) {
  return <aside className={wizard.summary} aria-label="Resumen para la venta">
    <h2>Resumen para la venta</h2>
    <div className={wizard.creditSummary}>
      <span>Cupo disponible</span><strong>{clp(customer.credit?.available ?? 0)}</strong>
    </div>
    <dl>
      <div><dt>Nivel</dt><dd>{customer.tier.name}
       <SaleCustomerLevel customerId={customer.id} currentTier={customer.tier.code} tiers={tiers}
         canEdit={canEdit} disabled={disabled} onUpdated={onUpdated} />
      </dd></div>
      <div><dt>Compras registradas</dt><dd>{customer.purchaseCount || "Sin compras"}</dd></div>
      <div><dt>Última compra</dt><dd>{customer.lastPurchaseAt ? purchaseDate.format(new Date(customer.lastPurchaseAt)) : "—"}</dd></div>
    </dl>
  </aside>;
}

function verifiedCredit(customer: SaleCustomer, isVerified: boolean) {
  const credit = customer.credit;
  return { ...credit, enabled: isVerified, available: isVerified && credit.principalOutstanding === 0 ? credit.capacity : 0 };
}
export function AdminSales({initialProducts,contractReady=true,tiers=[],canChangeLevel=false}:{
 initialProducts:SaleProduct[];contractReady?:boolean;tiers?:SaleCustomer["tier"][];canChangeLevel?:boolean;
}){
 const [creating,setCreating]=useState(false),[lookupDocument,setLookupDocument]=useState<DocumentFields>(blankDocument);
 const [step,setStep]=useState(1),[editing,setEditing]=useState(false),[completed,setCompleted]=useState<{id:string;credit:number;controlNumber?:string|null}|null>(null),[downloading,setDownloading]=useState(false);
 const [confirmation,setConfirmation]=useState(false),[verificationBusy,setVerificationBusy]=useState(false);
 const [whatsappWait,setWhatsappWait]=useState<{customerId:string;until:number}|null>(null);
 const products=initialProducts;
 const [customer,setCustomer]=useState<SaleCustomer|null>(null),[quote,setQuote]=useState<SaleQuote|null>(null);
 const [overrideOpen,setOverrideOpen]=useState(false),[overrideDraft,setOverrideDraft]=useState(""),[creditOverrideReason,setCreditOverrideReason]=useState("");
 const [productId,setProductId]=useState(""),[quantity,setQuantity]=useState(1),[total,setTotal]=useState(0),[credit,setCredit]=useState(0),[count,setCount]=useState(1),[date,setDate]=useState("");
 const [busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState("");
 const quoteSequence=useRef(0),key=useRef(""),pending=useRef<Record<string,unknown>|null>(null),inFlight=useRef(false);
 function invalidate(){quoteSequence.current++;setQuote(null);key.current="";setCreditOverrideReason("");setOverrideDraft("");setOverrideOpen(false);}
 let schedule:{number:number;dueDate:string;amount:number}[]=[];
 try{if(credit&&date)schedule=monthlyInstallments(credit,count,date);}catch{}
 function changeLookupDocument(document: DocumentFields) {
   setLookupDocument(document);
   setError("");
   if (customer) {
     setCustomer(null);
     invalidate();
   }
 }
 async function lookup(e:FormEvent<HTMLFormElement>){
   e.preventDefault();
   setError("");
   try { parseCustomerDocument(lookupDocument); } catch (error) {
     setError((error as Error).message);
     return;
   }
   invalidate();
   setCustomer(null);
   setBusy(true);
   try {
     const result = await salesAction({ action: "lookup", ...lookupDocument });
     setCustomer(result.customer);
     if (!result.customer) setError("No encontramos una ficha con ese documento. Puedes crear el cliente.");
   } catch (error) { setError((error as Error).message); }
   finally { setBusy(false); }
 }
 async function calculate(reason?:string){
   const normalized=reason?.trim().replace(/\s+/g," ");
   if(reason!==undefined&&(!normalized||normalized.length<5||normalized.length>500)){setError("Escribe un motivo de 5 a 500 caracteres.");return;}
   const sequence=++quoteSequence.current;setBusy(true);setError("");
   try{
     const result=await salesAction({action:"quote",customerId:customer?.id,productId,quantity,total,pricingPolicy:"category",...(normalized?{creditOverrideReason:normalized}:{})});
     if(sequence!==quoteSequence.current)return;
     setQuote(result.quote);setCredit(result.quote.maximumCredit);setCount(result.quote.maxInstallments);
     setCreditOverrideReason(normalized||"");setOverrideOpen(false);setStep(3);key.current=crypto.randomUUID();
   }catch(error){if(sequence===quoteSequence.current)setError((error as Error).message);}
   finally{setBusy(false);}
 }
 async function create(){if(inFlight.current||!quote)return;inFlight.current=true;pending.current??={action:"create",...(creditOverrideReason?{creditOverrideReason}:{}),customerId:customer?.id,productId,quantity,total,pricingPolicy:"category",credit,installmentCount:credit?count:0,firstDueDate:credit?date:"",identityChecked:true,depositReceived:true,conditionsReviewed:true,requestKey:key.current};setBusy(true);setLocked(true);setError("");try{const result=await durableAction(pending.current);setCompleted({id:result.id,credit:Number(pending.current.credit),controlNumber:result.controlNumber});setConfirmation(false);}catch(e){setError((e as Error).message);if(e instanceof SalesRequestError&&e.status<500){pending.current=null;setLocked(false);key.current=crypto.randomUUID();}}finally{inFlight.current=false;setBusy(false);}}
 async function download(){if(!completed||downloading)return;setDownloading(true);setError("");try{const r=await fetch(`/api/admin/clientes/ventas/${completed.id}/compromiso/pdf`,{cache:"no-store"});if(!r.ok){const b=await r.json();throw new Error(b.error||"No pudimos descargar el documento.");}const url=URL.createObjectURL(await r.blob());const a=document.createElement("a");a.href=url;a.download="compromiso-de-pago.pdf";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError((e as Error).message);}finally{setDownloading(false);}}
 function reset(){setCreating(false);setLookupDocument(blankDocument);pending.current=null;key.current="";setCompleted(null);setCustomer(null);setProductId("");setQuantity(1);setTotal(0);setCredit(0);setDate("");setLocked(false);setStep(1);setError("");invalidate();}
 function updateCustomerLevel(settings: CategorySettings) {
   const tier = settings.tiers.find(item => item.code === settings.currentCategory);
   if (!tier) return;
   setCustomer(current => {
     if (!current) return current;
     const outstanding = current.credit.principalOutstanding;
     return { ...current, tier, credit: {
       ...current.credit, ...availableCredit(tier.maxAmount, outstanding, current.emailVerified && outstanding === 0),
     } };
   });
   invalidate();
 }
 const disabled=busy||locked||verificationBusy;
 return <><div className={wizard.titleRow}><h1>Registrar venta</h1><Link href="/admin/clientes/ventas" className={wizard.secondary}><Users size={16} aria-hidden="true" />Ver ventas</Link></div>{!completed&&<OperationRecovery kind="create"/>}{error&&!confirmation&&<p role="alert" className={styles.error}>{error}</p>}
 <nav aria-label="Etapas de la venta" className={wizard.steps}>{["Cliente","Producto y precio","Cálculo y condiciones"].map((label,index)=><button key={label} type="button" aria-current={step===index+1?"step":undefined} disabled={disabled||editing||Boolean(completed)||index+1>step} onClick={()=>{setStep(index+1);setError("");}}><span>{index+1}</span>{label}</button>)}</nav>
 {completed?<section className={`${styles.panel} ${styles.section}`}><h2>Venta registrada</h2>{completed.controlNumber&&<p>Control interno <strong>{completed.controlNumber}</strong></p>}<p role="status">{customer?.firstName} {customer?.lastName} · {clp(total)}</p>{completed.credit>0&&<><p>Descarga el compromiso para revisarlo y firmarlo con el cliente.</p><Link href={`/admin/clientes/ventas/${completed.id}/compromiso`}>Ver versión imprimible</Link><button type="button" className={wizard.primary} onClick={download} disabled={downloading}>{downloading?"Preparando PDF…":"Descargar compromiso de pago"}</button></>}<div className={wizard.actions}><Link className={styles.button} href="/admin/clientes/ventas">Ver ventas</Link><Link className={styles.button} href={`/admin/clientes/${customer?.id}?venta=${completed.id}`}>Ver venta</Link><button className={styles.button} onClick={reset}>Nueva venta</button></div></section>:<>
 {step === 1 && <section className={wizard.customerStep} aria-label="Datos del cliente">
   <div className={customer ? wizard.saleGrid : undefined}>
     <div className={wizard.customerPanel}>
       {!editing && !creating && <form className={wizard.search} onSubmit={lookup}>
         <CustomerDocumentTypeFields value={lookupDocument} disabled={disabled}
           onChange={changeLookupDocument} />
         <label htmlFor="sale-customer-document">{lookupDocument.documentType === "rut" ? "Buscar por RUT" : "Número de documento"}</label>
         <div className={wizard.searchControls}>
           <input id="sale-customer-document" className={styles.input} value={lookupDocument.documentNumber}
             onChange={event => changeLookupDocument({ ...lookupDocument, documentNumber: event.target.value })}
             required maxLength={lookupDocument.documentType === "rut" ? 20 : 32} disabled={disabled} />
           <button className={wizard.secondary} disabled={disabled}>
             <Search size={17} aria-hidden="true" />{busy ? "Buscando…" : "Buscar cliente"}
           </button>
         </div>
         {!customer && <div className={wizard.searchHint}>
           <p>¿Es su primera compra o aún no tiene cuenta?</p>
           <button type="button" className={wizard.secondary} disabled={disabled}
             onClick={() => { setError(""); setCreating(true); }}>Crear cliente</button>
         </div>}
       </form>}
       {creating && <div className={wizard.customerBody}>
         <AdminCreateCustomer initialDocument={lookupDocument} requireEmailVerification onCancel={() => setCreating(false)}
           onCreated={async (_id, document) => {
             const result = await salesAction({ action: "lookup", ...document });
             setLookupDocument(document);
             setCustomer(result.customer);
             setError("");
             invalidate();
           }} />
       </div>}
       {customer && <div className={wizard.customerBody}>
         {editing ? <CustomerDetailsEditor customerId={customer.id} onCancel={() => setEditing(false)}
           onSave={data => {
             setCustomer({ ...customer, ...data, credit: verifiedCredit(customer, data.emailVerified) });
             setEditing(false);
             invalidate();
           }} /> : <>
           <div className={wizard.identity}>
             <span className={wizard.initials} aria-hidden="true">{customer.firstName[0]}{customer.lastName[0]}</span>
             <div className={wizard.identityText}>
               <h2>{customer.firstName} {customer.lastName}</h2>
               <p>{customerDocumentText(customer)}</p>
             </div>
             <button type="button" className={wizard.secondary} disabled={disabled}
               onClick={() => setEditing(true)}><Pencil size={16} aria-hidden="true" />Editar datos</button>
           </div>
           <div className={wizard.contacts}>
             <CustomerEmailVerification key={`${customer.id}:${customer.email}`} customerId={customer.id}
               email={customer.email} verified={customer.emailVerified} disabled={disabled} showLabel
               onBusy={setVerificationBusy} onVerified={() => setCustomer(current =>
                 current?.id === customer.id && current.email === customer.email
                   ? { ...current, emailVerified: true, credit: verifiedCredit(current, true) } : current)} />
             <StaffWhatsappVerification key={`${customer.id}:${customer.whatsapp}`} customerId={customer.id}
               phone={customer.whatsapp} available={customer.whatsappVerificationAvailable}
               retryUntil={whatsappWait?.customerId === customer.id ? whatsappWait.until : 0}
               onCooldown={until => setWhatsappWait({ customerId: customer.id, until })}
               verified={customer.whatsappVerified} onVerified={() => setCustomer(current => current?.id === customer.id
                 ? { ...current, whatsappVerified: true } : current)} />
           </div>
         </>}
       </div>}
     </div>
     {customer && <SalesCustomerSummary customer={customer} tiers={tiers} canEdit={canChangeLevel} disabled={disabled} onUpdated={updateCustomerLevel} />}
   </div>
   {customer && !editing && <div className={wizard.continueBar}>
     <button type="button" className={wizard.primary} disabled={disabled}
       onClick={() => { setCreating(false); setStep(2); setError(""); }}>
       Continuar a producto <ArrowRight size={18} aria-hidden="true" />
     </button>
   </div>}
 </section>}
 {step === 2 && customer && <div className={wizard.saleGrid}>
   <section className={wizard.stepPanel}>
     <h2>2. Producto y precio</h2>
     <p className={styles.small}>{customer.firstName} {customer.lastName} · {customer.tier.name}</p>
     <form className={styles.form} onSubmit={event => { event.preventDefault(); void calculate(); }}>
       <label className={styles.field}>Número de control interno
         <input aria-label="Número de control interno" className={styles.input} value="Se genera al registrar la venta" readOnly aria-readonly="true" />
         <span className={styles.small}>Serie CR-0000001 en adelante.</span>
       </label>
       <label className={styles.field}>Producto o paquete
         <select className={styles.input} value={productId} required disabled={disabled}
           onChange={event => { setProductId(event.target.value); invalidate(); }}>
           <option value="">Selecciona un producto</option>
           {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
         </select>
       </label>
       <label className={styles.field}>Cantidad
         <input className={styles.input} type="number" min={1} max={100} required value={quantity}
           disabled={disabled} onChange={event => { setQuantity(Number(event.target.value)); invalidate(); }} />
       </label>
       <label className={styles.field}>Precio total con IVA incluido
         <input className={styles.input} type="number" min={1} max={1000000000} required value={total || ""}
           disabled={disabled} onChange={event => { setTotal(Number(event.target.value)); invalidate(); }} />
       </label>
       <div className={wizard.actions}>
         <button className={styles.button} type="button" onClick={() => setStep(1)} disabled={disabled}>Volver</button>
         <button className={wizard.primary} disabled={disabled || !productId || !total}>
           {busy ? "Calculando…" : "Calcular y continuar"}
         </button>
       </div>
     </form>
   </section>
   <SalesCustomerSummary customer={customer} tiers={tiers} canEdit={canChangeLevel} disabled={disabled} onUpdated={updateCustomerLevel} />
 </div>}
 {step===3&&quote&&<section className={wizard.stepPanel}><h2>3. Cálculo y condiciones</h2>{credit>0&&!contractReady&&<p role="status" className={styles.error}>Falta configurar la firma del representante. <Link href="/admin/clientes/compromisos">Configurar compromiso</Link>.</p>}<p className={styles.small}>{customer?.firstName} {customer?.lastName} · {products.find(p=>p.id===productId)?.name}</p><form className={styles.form} onSubmit={e=>{e.preventDefault();if(locked)void create();else{setError("");setConfirmation(true);}}}><div className={wizard.amounts}><div><span>Total con IVA</span><strong>{clp(quote.total)}</strong></div><div><span>{credit?"Pie":"Contado"}</span><strong>{clp(total-credit)}</strong></div><div><span>Crédito</span><strong>{clp(credit)}</strong></div></div><p className={styles.small}>Neto {clp(quote.net)} · IVA {clp(quote.vat)}</p>{quote.reason&&<p>{quote.reason}</p>}<label className={styles.field}>Monto a crédito (0 para contado)<input className={styles.input} type="number" min={0} max={quote.maximumCredit} value={credit} disabled={disabled} readOnly={Boolean(creditOverrideReason)} required onChange={e=>{setCredit(Number(e.target.value));}}/><span className={styles.small}>Máximo {clp(quote.maximumCredit)}</span></label>
 {creditOverrideReason?<div className={wizard.creditOverride} role="status">
   <strong>Cupo máximo aplicado: {clp(quote.maximumCredit)}</strong>
   <p>Por porcentaje: {clp(quote.standardMaximumCredit??0)}. Motivo: {creditOverrideReason}</p>
   <button type="button" className={wizard.secondary} disabled={disabled} onClick={()=>void calculate()}>Volver al cálculo por nivel</button>
 </div>:(quote.maximumCreditAtCapacity??0)>quote.maximumCredit&&<div className={wizard.creditOverride}>
   {!overrideOpen?<button type="button" className={wizard.secondary} disabled={disabled} onClick={()=>{setOverrideOpen(true);setError("");}}>Aplicar cupo máximo · {clp(quote.maximumCreditAtCapacity!)}</button>:<>
     <label className={styles.field}>Motivo para aplicar el cupo máximo
       <textarea className={styles.input} value={overrideDraft} minLength={5} maxLength={500} rows={3} disabled={disabled}
         onChange={event=>setOverrideDraft(event.target.value)} placeholder="Ej.: condición comercial acordada con el cliente" />
     </label>
     <div className={wizard.actions}>
       <button type="button" className={wizard.secondary} disabled={disabled} onClick={()=>{setOverrideOpen(false);setError("");}}>Cancelar aumento</button>
       <button type="button" className={wizard.primary} disabled={disabled||overrideDraft.trim().length<5} onClick={()=>void calculate(overrideDraft)}>{busy?"Recalculando…":"Aplicar y recalcular"}</button>
     </div>
   </>}
 </div>}
 {credit>0&&<><label className={styles.field}>Cuotas mensuales<select className={styles.input} value={count} onChange={e=>{setCount(Number(e.target.value));}} disabled={disabled}>{Array.from({length:quote.maxInstallments},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label><label className={styles.field}>Primer vencimiento<input className={styles.input} type="date" value={date} onChange={e=>{setDate(e.target.value);}} required disabled={disabled}/></label>{schedule.length>0&&<div className={styles.reviewBox} aria-label="Calendario de pago">{schedule.map(i=><div key={i.number} className={styles.line}><span>Cuota {i.number} · {i.dueDate.split("-").reverse().join("/")}</span><strong>{clp(i.amount)}</strong></div>)}</div>}</>}
 <div className={wizard.actions}><button className={styles.button} type="button" disabled={disabled} onClick={()=>{setStep(2);invalidate();}}>Volver</button><button className={wizard.primary} disabled={busy||overrideOpen||Boolean(credit&&!schedule.length)}>{busy?"Registrando…":locked?"Reintentar con los mismos datos":"Registrar venta"}</button></div></form></section>}
 </>}<SaleConfirmation contractReady={contractReady} open={confirmation} busy={busy} error={error} credit={credit} payment={total-credit} emailVerified={Boolean(customer?.emailVerified)} onCancel={()=>setConfirmation(false)} onConfirm={()=>void create()}/></>;
}
