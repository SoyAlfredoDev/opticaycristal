import Image from "next/image";
import Link from "next/link";
import { brand } from "@/components/site/content";
import { clp } from "@/lib/clients/types";
import type { CreditAgreementDocument } from "@/lib/clients/commitments";
import { agreementCopy } from "@/lib/clients/agreement-copy";
import { PrintCommitment } from "./PrintCommitment";
import styles from "./Commitment.module.css";
const rut=(value:string)=>`${value.slice(0,-1)}-${value.slice(-1)}`;
const date=(value:string)=>new Intl.DateTimeFormat("es-CL",{dateStyle:"long",timeZone:"America/Santiago"}).format(new Date(value));
export function CreditAgreement({document:d,backHref,cancelled,signedAt,pdfHref}:{document:CreditAgreementDocument;backHref:string;cancelled:boolean;signedAt:string|null;pdfHref:string}){
 const copy=agreementCopy(d);
 const paymentParts=d.webpayUrl?copy.payments.split(d.webpayUrl):[copy.payments];
 return <main className={styles.document} id="contenido-principal">
  <div className={styles.documentActions}><Link href={backHref}>← Volver</Link><a href={pdfHref} download>Descargar PDF</a><PrintCommitment/></div>
  <header className={styles.agreementHeader}><Image src={brand.logo} width={150} height={80} alt="Óptica & Cristal" style={{height:"auto"}}/><p><strong>{d.company.name}</strong><br/>RUT {d.company.rut}<br/>{d.company.address}</p></header>
  <h1>Compraventa a crédito directo y compromiso de pago</h1>
  <p>Venta {d.sale.id} · Documento preparado el {date(d.preparedAt)}<br/>{cancelled?<strong>VENTA ANULADA — documento histórico</strong>:signedAt?`Firma presencial del cliente confirmada por administración el ${date(signedAt)}.`:"Pendiente de firma presencial del cliente."}</p>
  <h2>1. Identificación de las partes</h2>
  <p>{copy.parties}</p>
  <p>Contacto del cliente: {d.customer.email} · {d.customer.whatsapp}.</p>
  <h2>2. Compra y condiciones económicas</h2><p>Producto: {d.sale.productName} · Cantidad: {d.sale.quantity}.</p>
  <table><tbody><tr><th>Precio al contado y total de la compra, IVA incluido</th><td>{clp(d.sale.total)}</td></tr><tr><th>Neto / IVA de la venta</th><td>{clp(d.sale.net)} / {clp(d.sale.vat)}</td></tr><tr><th>Pie registrado en la venta</th><td>{clp(d.sale.deposit)}</td></tr><tr><th>Capital concedido a crédito</th><td>{clp(d.sale.credit)}</td></tr><tr><th>Interés corriente / moratorio</th><td>0 % / {d.lateAnnualRate} % anual simple</td></tr><tr><th>Comisiones, seguros y otros recargos al cliente</th><td>{clp(0)}</td></tr><tr><th>CAE</th><td>0 %</td></tr><tr><th>Costo total del crédito, pagando al día</th><td>{clp(d.sale.credit)}</td></tr></tbody></table>
  <h2>3. Compromiso de pago mensual</h2><p>{copy.monthly}</p>
  <table><thead><tr><th>Cuota</th><th>Vencimiento</th><th>Monto</th></tr></thead><tbody>{d.installments.map(i=><tr key={i.number}><td>{i.number}</td><td>{i.dueDate.split("-").reverse().join("/")}</td><td>{clp(i.amount)}</td></tr>)}</tbody></table>
  <p>{copy.late}</p>
  <h2>4. Pagos y atención</h2><p>{d.paymentMethod==="all"&&d.webpayUrl?<>{paymentParts[0]}<a href={d.webpayUrl}>{d.webpayUrl}</a>{paymentParts[1]}</>:copy.payments}</p>
  <p>{copy.rights}</p>
  <h2>5. Aceptación y entrega de copia</h2><p>{copy.acceptance}</p>
  <p>Suscrito en Santiago, el ______ de __________________ de __________.</p>
  <div className={styles.signatures}><div><div className={styles.signatureArea}/><strong>Firma del cliente</strong><br/>{d.customer.name}<br/>RUT {rut(d.customer.rut)}</div><div><Image src={d.representative.signature} alt="Firma preimpresa autorizada del representante" width={220} height={90} unoptimized className={styles.signatureImage}/><strong>{d.representative.name}</strong><br/>RUT {rut(d.representative.rut)}<br/>Por {d.company.name}</div></div>
  <p className={styles.note}>{copy.note}</p>
 </main>;
}
