import { DIGITAL_ACCEPTANCE_CLAUSE } from "./digital-agreement-copy";

/** Versioned proposal. Editing the proposal never changes an issued snapshot. */
export const JUDICIAL_CLAUSE = "Si una cuota mantiene un saldo vencido e impago una vez transcurridos seis meses calendario desde su vencimiento, Óptica y Cristal Limitada podrá ejercer ante el tribunal competente las acciones civiles de cobro que legalmente procedan respecto de las sumas vencidas y exigibles. Los abonos se descontarán del saldo y no reiniciarán el plazo respecto del remanente de esa cuota, salvo acuerdo expreso de reprogramación. Esta cláusula no anticipa el vencimiento de cuotas futuras. Solo podrán reclamarse intereses y conceptos legal y contractualmente procedentes; las costas judiciales quedarán sujetas a lo que resuelva el tribunal. Se respetarán los derechos del consumidor, la prescripción y las normas concursales aplicables";
export type AgreementModel = {
 identifier: string; version: number; legacyNoLate: string; layout: "a4-readable-v1" | "a4-compact-v2" | "a4-formal-v3";
 terms: { financingAnnualRate: 0; lateAnnualRate: 18; graceDays: 60; commissions: 0; insurance: 0; maintenance: 0; collectionFees: 0; otherCosts: 0 };
 clauses: { monthly: string; late: string; payments: string; collection: string; judicial: string; rights: string; acceptance: string; privacy: string };
};
export const AGREEMENT_PROPOSAL: AgreementModel = {
 identifier: "OC-CD", version: 1, legacyNoLate: "Esta operación conserva sus condiciones originales: interés de financiamiento pactado 0 %, sin interés moratorio ni recargos. Los abonos y el prepago no tienen recargo y no existe vencimiento anticipado de cuotas futuras.", layout: "a4-readable-v1",
 terms: { financingAnnualRate: 0, lateAnnualRate: 18, graceDays: 60, commissions: 0, insurance: 0, maintenance: 0, collectionFees: 0, otherCosts: 0 },
 clauses: {
 monthly: "El cliente pagará el capital en las cuotas mensuales indicadas. Interés de financiamiento pactado: 0 %. Comisiones, seguros, mantención, impuestos del crédito, gastos de cobranza extrajudicial y otros cargos al cliente: $0. El IVA del producto está incluido en su precio. CAE: 0 %, calculada con estos flujos sin costos adicionales, pagando al día. Costo total del crédito: el capital financiado. Total a pagar por la compra: pie más capital. La mora eventual no integra la CAE ni el costo informado por pago oportuno. No existe renovación automática ni vencimiento anticipado de cuotas futuras.",
 late: "Cada cuota tiene 60 días corridos de atraso sin interés. Desde el día 61 se aplica interés simple: capital vencido impago × tasa anual aplicable × días cobrables / 360. La tasa anual aplicable es el menor valor entre el 18 % pactado y el máximo legal aplicable a la operación. No se cobra por los primeros 60 días, días anteriores a la suscripción efectiva, cuotas futuras, capital pagado ni intereses. Los abonos reducen la base de los tramos posteriores; no hay retroactividad ni capitalización. El registro administrativo de confirmación no sustituye la fecha efectiva de suscripción. Una reducción legal obligatoria del límite se respetará en la liquidación.",
 payments: "Se permiten abonos a capital y prepago total o parcial sin comisión ni recargo. Cada pago se acreditará con un comprobante que distinga capital, interés moratorio pagado o condonado y saldo restante. El calendario es el original; el detalle actualizado se consulta en Mi cuenta o se solicita en el local. El crédito termina al pagarse íntegramente, sin mantención ni renovación automática.",
 collection: "La cobranza será directa por la óptica y sus gastos extrajudiciales serán siempre $0. Se realizará al menos una gestión útil gratuita dentro de los primeros 15 días siguientes a cada vencimiento impago. Se utilizarán exclusivamente los canales informados por el cliente: WhatsApp, correo o contacto presencial. Se respetarán los días y horas hábiles legales: lunes a sábado, de 08:00 a 20:00, excluidos feriados. Como máximo habrá un contacto telefónico o visita semanal y dos gestiones por otros medios por semana, separadas por al menos dos días; se aplicará cualquier límite legal más restrictivo. Se conservará registro de las gestiones por al menos dos años. No se informará la morosidad a terceros ajenos a la obligación ni se simularán escritos, resoluciones o actuaciones judiciales. Se suspenderá la cobranza extrajudicial cuando corresponda por notificación judicial del cobro o por protección, renegociación o liquidación concursal conforme a la ley; se respetarán la privacidad y situación laboral del cliente.",
 judicial: JUDICIAL_CLAUSE,
 rights: "Consultas, reclamos y liquidaciones: WhatsApp +56 9 2245 2080, contacto@opticaycristal.cl, soporte de Mi cuenta o atención en Huérfanos 713, Galería Cohen, Local 18, Santiago Centro. Atención del local: lunes a viernes 10:00 a 18:00 y sábado 10:00 a 15:00. Se conservan los derechos irrenunciables y garantías legales del consumidor, el acceso a SERNAC y a tribunales competentes. Este documento no tiene Sello SERNAC, no reemplaza la boleta o factura ni acredita entrega del producto. No constituye por esta cláusula un título ejecutivo ni autoriza embargos automáticos.",
 acceptance: "El cliente declara haber podido leer y revisar el documento completo y su hoja resumen antes de firmar. La fecha efectiva de suscripción se escribe al firmar y se registra separadamente de su confirmación administrativa. Generar, imprimir o descargar no acredita firma ni entrega. La óptica entregará una copia íntegra firmada al cliente y registrará fecha y medio de entrega; conservará el ejemplar aceptado y su respaldo digital. La firma preimpresa del representante requiere autorización y antecedente de sus facultades; no sustituye la firma del cliente ni se presenta como firma electrónica avanzada.",
 privacy: "Los datos personales se utilizarán solo para esta compraventa, su administración, comprobantes, atención y cumplimiento de obligaciones legales, con acceso restringido y protección de su respaldo. No se otorga autorización general de publicidad ni divulgación de deudas. El cliente puede ejercer los derechos que le reconozca la normativa de datos personales aplicable a través de los canales de atención."
 }
};
export function validateAgreementModel(value: unknown): AgreementModel {
 const m=value as AgreementModel;
 if(!m || !/^[A-Z0-9-]{2,32}$/.test(m.identifier) || !Number.isSafeInteger(m.version)||m.version<1||!["a4-readable-v1","a4-compact-v2","a4-formal-v3"].includes(m.layout))throw new Error("Identificador, versión o diseño no válido.");
 if(!m.terms||Object.keys(m.terms).length!==Object.keys(AGREEMENT_PROPOSAL.terms).length||Object.entries(AGREEMENT_PROPOSAL.terms).some(([key,value])=>(m.terms as Record<string,unknown>)[key]!==value))throw new Error("Este generador solo admite el crédito sin costos y la política de mora revisada.");
 for(const key of Object.keys(AGREEMENT_PROPOSAL.clauses) as (keyof AgreementModel["clauses"])[])if(typeof m.clauses?.[key]!=="string"||m.clauses[key].length<30||m.clauses[key].length>5000||/[\u0000-\u001f]/.test(m.clauses[key]))throw new Error("Revisa el contenido de las cláusulas.");
 if(typeof m.legacyNoLate!=="string"||m.legacyNoLate.length<30||m.legacyNoLate.length>1000)throw new Error("Completa las condiciones originales sin mora.");
 if(m.clauses.judicial!==JUDICIAL_CLAUSE)throw new Error("Debe conservarse la cláusula judicial acordada.");
 return structuredClone(m);
}
/** Full six-calendar-month period ends at midnight of the matching (or last) day. */
export function judicialReviewDate(dueDate:string){
 const d=new Date(`${dueDate}T12:00:00Z`);if(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==dueDate)throw new Error("Fecha no válida.");
 const end=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+7,0,12));
 end.setUTCDate(Math.min(d.getUTCDate(),end.getUTCDate())+1);
 return end.toISOString().slice(0,10);
}

export function effectiveModelClauses(model:AgreementModel,lateAnnualRate:number){return {...model.clauses,late:lateAnnualRate===0?model.legacyNoLate:model.clauses.late};}

/** Review flag only: never initiates legal proceedings or accelerates future debt. */
export function judicialReviewCandidates(installments:{number:number;amount:number;dueDate:string}[],payments:{amount:number;paidOn:string;reversed?:boolean}[],asOf:string){
 judicialReviewDate(asOf);
 const rows=installments.map(i=>{if(!Number.isSafeInteger(i.amount)||i.amount<1)throw new Error("Cuota no válida.");return{number:i.number,balance:i.amount,reviewFrom:judicialReviewDate(i.dueDate)};});
 for(const p of payments.filter(p=>!p.reversed&&p.paidOn<=asOf).slice().sort((a,b)=>a.paidOn.localeCompare(b.paidOn))){judicialReviewDate(p.paidOn);if(!Number.isSafeInteger(p.amount)||p.amount<0)throw new Error("Pago no válido.");let rest=p.amount;for(const row of rows){const paid=Math.min(rest,row.balance);row.balance-=paid;rest-=paid;}if(rest)throw new Error("El abono excede el capital original.");}
 return rows.map(row=>({...row,eligibleForLegalReview:row.balance>0&&asOf>=row.reviewFrom}));
}

/** New proposal only; existing v1 definitions and issued PDFs remain unchanged. */
export const COMPACT_AGREEMENT_PROPOSAL:AgreementModel={...structuredClone(AGREEMENT_PROPOSAL),version:2,layout:"a4-compact-v2"};

/** Formal typography proposal. Previous layouts remain frozen and readable. */
export const FORMAL_AGREEMENT_PROPOSAL:AgreementModel={...structuredClone(AGREEMENT_PROPOSAL),version:3,layout:"a4-formal-v3"};

/** Proposal for review. The identifier distinguishes it from models issued for paper only. */
export const DIGITAL_AGREEMENT_PROPOSAL: AgreementModel = {
 ...structuredClone(FORMAL_AGREEMENT_PROPOSAL),
 identifier: "OC-CD-DIGITAL",
 version: 1,
 clauses: {
  ...FORMAL_AGREEMENT_PROPOSAL.clauses,
  acceptance: DIGITAL_ACCEPTANCE_CLAUSE,
 },
};
