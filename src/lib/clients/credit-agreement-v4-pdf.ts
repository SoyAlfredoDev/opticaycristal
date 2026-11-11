import {effectiveModelClauses} from "./agreement-model";
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { CreditAgreementDocument } from "./commitments";
import { clp } from "./types";
export const AGREEMENT_BODY_PT=14.5;
/** Frozen renderer a4-readable-v1: future layout changes require a new key. */
export async function readableAgreementPdf(d:CreditAgreementDocument){
 if(!d.model||d.model.definition.layout!=="a4-readable-v1")throw new Error("Diseño de modelo no compatible.");
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.15,.17,.18),wine=rgb(104/255,28/255,48/255),green=rgb(.88,.95,.77),size=AGREEMENT_BODY_PT,leading=17.5,left=36,width=523;
 let page=pdf.addPage([595.28,841.89]),y=790;
 const safe=(v:string)=>{const value=v.replace(/[\u0000-\u001f]/g," ");try{font.encodeText(value);}catch{throw new Error("La fuente del modelo no admite algún carácter de los datos. No se sustituyeron letras; revisa la tipografía antes de emitir.");}return value;};
 const line=(v:string,x=left,f=font,color=ink)=>page.drawText(safe(v),{x,y,size,font:f,color});
 const wrap=(v:string,w=width,f=font)=>{const rows:string[]=[];let row="";for(const word of safe(v).split(/\s+/)){if(row&&f.widthOfTextAtSize(row+" "+word,size)>w){rows.push(row);row="";}for(const char of word){if(f.widthOfTextAtSize(row+char,size)>w){rows.push(row);row="";}row+=char;}row+=" ";}if(row.trim())rows.push(row.trim());return rows;};
 const next=()=>{page=pdf.addPage([595.28,841.89]);y=790;};
 const room=(height:number)=>{if(y-height<64)next();};
 const paragraph=(v:string,f=font,color=ink)=>{for(const row of wrap(v,width,f)){room(leading);line(row,left,f,color);y-=leading;}y-=7;};
 const title=(v:string)=>{room(70);paragraph(v,bold,wine);};
 const row=(label:string,value:string)=>{const ls=wrap(label,340),vs=wrap(value,160,bold),height=Math.max(ls.length,vs.length)*leading+8;room(height);const start=y;ls.forEach((v,i)=>{y=start-i*leading;line(v);});vs.forEach((v,i)=>{y=start-i*leading;line(v,399,bold);});y=start-height;};
 const rut=(v:string)=>v?`${v.slice(0,-1)}-${v.slice(-1)}`:"[Por completar]";
 const logo=await pdf.embedPng(await readFile(join(process.cwd(),"public/images/home/oc-logo-oficial.png")));const dim=logo.scale(92/logo.width);
 page.drawImage(logo,{x:left,y:y-dim.height,width:dim.width,height:dim.height});y-=dim.height+13;
 paragraph("Ver bien, sentirse bien",bold);
 title("Hoja resumen · Compraventa a crédito directo");
 if(d.model.sample)paragraph("MUESTRA SIN VALIDEZ · PROPUESTA NO APROBADA. Importes ilustrativos; sin venta, firma, pago ni entrega reales.",bold);
 paragraph(`${d.company.name} · RUT ${d.company.rut}. ${d.company.address}`);
 paragraph(`Cliente: ${d.customer.name}. RUT: ${rut(d.customer.rut)}.`);
 row("Precio al contado, IVA incluido",clp(d.sale.total));row("Neto / IVA",`${clp(d.sale.net)} / ${clp(d.sale.vat)}`);
 row("Pie registrado administrativamente",clp(d.sale.deposit));row("Capital financiado",clp(d.sale.credit));row("Interés de financiamiento pactado / CAE","0 % / 0 %");
 row("Comisiones / seguros / mantención","$0 / $0 / $0");row("Impuestos del crédito / otros cargos","$0 / $0");row("Cobranza extrajudicial","$0");row("Costo total del crédito al día",clp(d.sale.credit));row("Total compra: pie más cuotas",clp(d.sale.total));
 title("Calendario mensual original");
 for(const i of d.installments)row(`Cuota ${i.number} · ${i.dueDate.split("-").reverse().join("/")}`,clp(i.amount));
 paragraph(`Mora anual simple: hasta ${d.lateAnnualRate} %, limitada al máximo legal aplicable si es menor; 60 días corridos de gracia por cuota. Límite informado al emitir: ${d.legalAnnualMaximum} % anual; se verificará al suscribir y liquidar.`);
 paragraph("Sin cargos adicionales, los flujos de devolución del capital determinan una CAE de 0 %. La mora eventual no integra el costo por pago oportuno. Esta hoja se entrega y firma junto con el contrato íntegro.");
 paragraph("Firma cliente (hoja resumen): _____________________");
 next();title("Contrato y compromiso de pago");
 paragraph(`Venta interna: ${d.sale.id}. AppsFly venta: ${d.references?.appsFlySale||"No informado"}. Orden de trabajo: ${d.references?.workOrder||"No informada"}.`);
 paragraph(`Modelo ${d.version}. Preparado: ${new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(d.preparedAt))}. Emisión no acredita suscripción, pago ni entrega.`);
 title("1. Partes y facultades");
 paragraph(`${d.company.name}, RUT ${d.company.rut}, ${d.company.address}, representada por ${d.representative.name}, RUT ${rut(d.representative.rut)}. Antecedente de facultades: ${d.representative.authority||"[Por completar]"}. Cliente: ${d.customer.name}, RUT ${rut(d.customer.rut)}. Contacto: ${d.customer.email}; ${d.customer.whatsapp}.`);
 paragraph(`Producto: ${d.sale.productName}. Cantidad: ${d.sale.quantity}. La hoja resumen y el calendario precedente forman parte íntegra de este contrato.`);
 const labels={monthly:"2. Precio y obligaciones",late:"3. Mora y cálculo por tramos",payments:"4. Pagos, abonos y prepago",collection:"5. Cobranza directa",judicial:"6. Acciones civiles de cobro",rights:"7. Derechos y atención",acceptance:"8. Aceptación y copia íntegra",privacy:"9. Datos personales"};
 for(const key of Object.keys(labels) as (keyof typeof labels)[]){title(labels[key]);paragraph(effectiveModelClauses(d.model.definition,d.lateAnnualRate)[key]);if(key==="payments")paragraph((d.paymentMethod==="local"?"Medio habilitado: pago en el local.":d.paymentMethod==="transfer"?"Medio habilitado: transferencia; solicita datos bancarios vigentes al WhatsApp oficial.":"Medios habilitados: local y transferencia; solicita los datos bancarios al WhatsApp oficial.")+(d.paymentMethod==="all"&&d.webpayUrl?` Webpay oficial: ${d.webpayUrl}.`:" Webpay no habilitado en este documento."));}
 room(240);title("Suscripción efectiva y entrega");
 paragraph("Santiago, fecha efectiva de firma: ____ / ____ / ______. Fecha de entrega de copia íntegra firmada: ____ / ____ / ______. Medio y constancia: ___________________________.");
 const start=y;y-=62;line("________________________",left,bold);line("________________________",310,bold);
 if(d.representative.signature){const image=await pdf.embedPng(d.representative.signature),dim=image.scale(Math.min(210/image.width,54/image.height));page.drawImage(image,{x:315,y:start-54,width:dim.width,height:dim.height});}
 y-=leading;line("Firma del cliente");line("Representante (preimpresa)",310);y-=leading+8;
 paragraph(`Cliente: ${d.customer.name}. Representante: ${d.representative.name}. RUT: ${rut(d.representative.rut)}.`);
 paragraph("Registro interno separado: confirmación administrativa, respaldo digital del original aceptado y constancia de entrega. No completar ni confirmar sin evidencia real.");
 paragraph(`Modelo: ${d.model.id}. Huella SHA-256 del contenido y diseño: ${d.model.hash}.`);
 for(const [i,p]of pdf.getPages().entries()){p.drawRectangle({x:left,y:29,width,height:24,color:green});p.drawText(`${d.model.sample?"MUESTRA · ":""}Ver bien, sentirse bien · Página ${i+1} de ${pdf.getPageCount()}`,{x:left+6,y:35,size,font,color:wine});}
 pdf.setTitle("Compromiso de pago - Óptica & Cristal");pdf.setAuthor(d.company.name);pdf.setSubject(`Modelo ${d.version} / ${d.model.hash}`);return pdf.save();
}
