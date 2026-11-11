import "server-only";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {PDFDocument,rgb,type PDFFont} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type {CreditAgreementDocument} from "./commitments";
import {effectiveModelClauses} from "./agreement-model";
import {clp} from "./types";
export const FORMAL_AGREEMENT_BODY_PT=13;
export const FORMAL_FONT_FILES=["DejaVuSansCondensed.ttf","DejaVuSansCondensed-Bold.ttf"] as const;
let assets:Promise<{regular:Buffer;bold:Buffer;logo:Buffer}>|undefined;
export function formalAgreementAssets(){
 assets??=Promise.all([readFile(join(process.cwd(),"public/fonts/contracts",FORMAL_FONT_FILES[0])),readFile(join(process.cwd(),"public/fonts/contracts",FORMAL_FONT_FILES[1])),readFile(join(process.cwd(),"public/images/home/oc-logo-oficial.png"))]).then(([regular,bold,logo])=>({regular,bold,logo}));
 return assets;
}
/** Frozen a4-formal-v3. Never revise this renderer for an already approved layout. */
export async function formalAgreementPdf(d:CreditAgreementDocument){
 if(!d.model||d.model.definition.layout!=="a4-formal-v3")throw new Error("Diseño de modelo no compatible.");
 const data=await formalAgreementAssets(),pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(new Uint8Array(data.regular),{subset:true}),bold=await pdf.embedFont(new Uint8Array(data.bold),{subset:true});
 const glyphs=fontkit.create(new Uint8Array(data.regular)),size=FORMAL_AGREEMENT_BODY_PT,leading=14.5,left=32,width=531,bottom=59;
 const black=rgb(.09,.09,.09),muted=rgb(.26,.26,.26),rule=rgb(.60,.60,.60),wine=rgb(104/255,28/255,48/255),shade=rgb(.95,.95,.95);
 let page=pdf.addPage([595.28,841.89]),y=805;
 function safe(value:string){const v=value.replace(/[\u0000-\u001f]/g," ");for(const c of v)if(!glyphs.hasGlyphForCodePoint(c.codePointAt(0)!))throw new Error("La fuente del modelo no admite algún carácter. No se sustituyeron letras de los datos.");return v;}
 function draw(value:string,x=left,top=y,f=font,color=black){page.drawText(safe(value),{x,y:top,size,font:f,color});}
 function wrap(value:string,w=width,f:PDFFont=font){const rows:string[]=[];let row="";for(const word of safe(value).split(/\s+/)){if(row&&f.widthOfTextAtSize(row+" "+word,size)>w){rows.push(row);row="";}let piece="";for(const c of word){if(f.widthOfTextAtSize(piece+c,size)>w){if(row){rows.push(row);row="";}rows.push(piece);piece="";}piece+=c;}row+=(row?" ":"")+piece;}if(row)rows.push(row);return rows;}
 function next(){page=pdf.addPage([595.28,841.89]);draw("COMPRAVENTA A CRÉDITO DIRECTO",left,805,bold);const label=d.version;draw(label,left+width-bold.widthOfTextAtSize(label,size),805,bold);page.drawLine({start:{x:left,y:795},end:{x:left+width,y:795},color:rule,thickness:.6});y=774;}
 function room(height:number){if(y-height<bottom)next();}
 function paragraph(value:string,{face=font,justify=true,gap=5}:{face?:PDFFont;justify?:boolean;gap?:number}={}){const rows=wrap(value,width,face);for(const [index,text]of rows.entries()){room(leading);const words=text.split(" ");const natural=face.widthOfTextAtSize(text,size),extra=width-natural,space=font.widthOfTextAtSize(" ",size);
  if(justify&&index<rows.length-1&&words.length>1&&extra/(words.length-1)<space*.9){let x=left;const step=space+extra/(words.length-1);for(const word of words){draw(word,x,y,face);x+=face.widthOfTextAtSize(word,size)+step;}}
  else draw(text,left,y,face);y-=leading;
 }y-=gap;}
 function heading(value:string){room(46);paragraph(value,{face:bold,justify:false,gap:4});}
 function band(value:string){room(40);const rows=wrap(value,width-12,bold),height=rows.length*leading+10;room(height);page.drawRectangle({x:left,y:y-height+leading-4,width,height,color:shade});for(const [i,row]of rows.entries())draw(row,left+6,y-i*leading,bold);y-=height;}
 function grid(values:[string,string,string,string]){const columns=[155,107,162,107],x=[left,left+155,left+262,left+424];const rows=values.map((v,i)=>wrap(v,columns[i]-12,i%2?bold:font)),height=Math.max(...rows.map(r=>r.length))*leading+8;room(height);const top=y+leading-3;for(let i=0;i<4;i++){page.drawRectangle({x:x[i],y:top-height,width:columns[i],height,borderWidth:.45,borderColor:rule,color:i%2?rgb(1,1,1):shade});for(const [j,row]of rows[i].entries())draw(row,x[i]+6,y-j*leading,i%2?bold:font);}y-=height;}
 const rut=(v:string)=>v?`${v.slice(0,-1)}-${v.slice(-1)}`:"[Por completar]";
 const logo=await pdf.embedPng(new Uint8Array(data.logo)),dim=logo.scale(75/logo.width);
 page.drawImage(logo,{x:left,y:805-dim.height,width:dim.width,height:dim.height});
 const companyRows=wrap(`${d.company.name} · RUT ${d.company.rut}`,335,bold);for(const [i,row]of companyRows.entries())draw(row,228,805-i*leading,bold);
 const addressRows=wrap(d.company.address,335);for(const [i,row]of addressRows.entries())draw(row,228,805-(companyRows.length+i)*leading,font,muted);
 const headerEnd=Math.min(805-dim.height,805-(companyRows.length+addressRows.length-1)*leading);
 y=headerEnd-17;draw("Ver bien, sentirse bien",left,y,font,muted);y-=13;
 page.drawLine({start:{x:left,y},end:{x:left+width,y},color:wine,thickness:1});y-=22;
 for(const title of ["CONTRATO DE COMPRAVENTA A CRÉDITO DIRECTO","Y COMPROMISO DE PAGO"]){draw(title,left+(width-bold.widthOfTextAtSize(title,size))/2,y,bold);y-=leading;}y-=7;
 if(d.model.sample)band("BORRADOR · MUESTRA SIN VALIDEZ CONTRACTUAL");
 if(d.model.sample)paragraph("Datos e importes ilustrativos; no acreditan venta, firma, pago ni entrega reales.",{justify:false});
 const prepared=new Intl.DateTimeFormat("es-CL",{timeZone:"America/Santiago",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(d.preparedAt));
 paragraph(`Modelo ${d.version} · Preparado: ${prepared}. Generar o imprimir no acredita suscripción ni entrega.`,{justify:false});
 band("I. INDIVIDUALIZACIÓN Y REFERENCIAS");
 paragraph(`Cliente: ${d.customer.name}. RUT: ${rut(d.customer.rut)}. Correo: ${d.customer.email}. WhatsApp: ${d.customer.whatsapp}.`,{justify:false});
 paragraph(`Venta interna: ${d.sale.id}. Venta AppsFly: ${d.references?.appsFlySale||"No informada"}. Orden de trabajo: ${d.references?.workOrder||"No informada"}. Producto: ${d.sale.productName}. Cantidad: ${d.sale.quantity}.`,{justify:false});
 band("II. HOJA RESUMEN Y CALENDARIO DE PAGO");
 grid(["Precio contado con IVA",clp(d.sale.total),"Total de la compra",clp(d.sale.total)]);
 grid(["Pie registrado",clp(d.sale.deposit),"Capital financiado",clp(d.sale.credit)]);
 grid(["Interés pactado anual","0 %","CAE pagando al día","0 %"]);
 grid(["Neto / IVA",`${clp(d.sale.net)} / ${clp(d.sale.vat)}`,"Costo total del crédito",clp(d.sale.credit)]);y-=7;
 paragraph("Comisiones, seguros, mantención, impuestos del crédito, otros cargos y cobranza extrajudicial: $0 cada concepto. El IVA del producto está incluido en su precio.");
 heading("CALENDARIO MENSUAL ORIGINAL");
 for(const i of d.installments){room(leading+7);const date=i.dueDate.split("-").reverse().join("/");draw(`Cuota ${i.number} de ${d.installments.length}`,left,y);draw(`Vencimiento: ${date}`,left+145,y);const amount=clp(i.amount);draw(amount,left+width-bold.widthOfTextAtSize(amount,size)-6,y,bold);y-=leading+6;}
 paragraph(`Mora anual simple: hasta ${d.lateAnnualRate} %, limitada al máximo legal aplicable si es menor; 60 días corridos de gracia por cuota. Límite informado al emitir: ${d.legalAnnualMaximum} % anual; se verificará al suscribir y liquidar.`);
 paragraph("Sin cargos adicionales, los flujos de devolución del capital determinan una CAE de 0 %. La mora eventual no integra el costo por pago oportuno. Esta hoja se entrega y firma junto con el contrato íntegro.");
 paragraph("Firma del cliente respecto de la hoja resumen: ____________________",{justify:false,gap:9});
 band("III. CONDICIONES DEL CONTRATO");
 heading("PRIMERA. PARTES Y REPRESENTACIÓN.");
 paragraph(`${d.company.name}, RUT ${d.company.rut}, con domicilio en ${d.company.address}, representada por ${d.representative.name}, RUT ${rut(d.representative.rut)}. Antecedente de sus facultades: ${d.representative.authority||"[Por completar]"}. Por la otra parte, el cliente individualizado en la sección I. La hoja resumen, el producto y el calendario precedentes forman parte íntegra de este contrato.`);
 const labels={monthly:"SEGUNDA. PRECIO Y OBLIGACIONES.",late:"TERCERA. MORA Y CÁLCULO POR TRAMOS.",payments:"CUARTA. PAGOS, ABONOS Y PREPAGO.",collection:"QUINTA. COBRANZA DIRECTA.",judicial:"SEXTA. ACCIONES CIVILES DE COBRO.",rights:"SÉPTIMA. DERECHOS Y ATENCIÓN.",acceptance:"OCTAVA. ACEPTACIÓN Y ENTREGA DE COPIA.",privacy:"NOVENA. DATOS PERSONALES."};
 const clauses=effectiveModelClauses(d.model.definition,d.lateAnnualRate);
 for(const key of Object.keys(labels) as (keyof typeof labels)[]){heading(labels[key]);paragraph(clauses[key]);if(key==="payments")paragraph((d.paymentMethod==="local"?"Medio habilitado: pago en el local.":d.paymentMethod==="transfer"?"Medio habilitado: transferencia; solicita los datos vigentes al WhatsApp oficial.":"Medios habilitados: pago en el local y transferencia. Solicita los datos bancarios vigentes al WhatsApp oficial.")+(d.paymentMethod==="all"&&d.webpayUrl?` Webpay oficial: ${d.webpayUrl}.`:" Webpay no está habilitado en este documento."));}
 room(244);band("IV. SUSCRIPCIÓN Y CONSTANCIA DE ENTREGA");
 paragraph("Suscrito en Santiago, el ____ / ____ / ______. Fecha efectiva de firma del cliente. Entrega de copia íntegra firmada: ____ / ____ / ______. Medio y constancia: ________________________________________.",{justify:false,gap:8});
 const start=y;y-=55;for(const x of [left,310])page.drawLine({start:{x,y},end:{x:x+231,y},color:black,thickness:.6});
 if(d.representative.signature){const image=await pdf.embedPng(d.representative.signature),dim=image.scale(Math.min(220/image.width,48/image.height));page.drawImage(image,{x:315,y:start-49,width:dim.width,height:dim.height});}
 y-=leading;draw("FIRMA DEL CLIENTE",left,y,bold);draw("POR LA ÓPTICA",310,y,bold);y-=leading;
 const columns=[[left,d.customer.name,`RUT ${rut(d.customer.rut)}`],[310,d.representative.name,`RUT ${rut(d.representative.rut)}`,"Firma preimpresa autorizada"]] as const;
 let count=0;for(const [x,...values]of columns){let n=0;for(const v of values)for(const row of wrap(v,231)){draw(row,x,y-n*leading);n++;}count=Math.max(count,n);}y-=count*leading+8;
 paragraph("Registro interno: la confirmación administrativa es distinta de la fecha efectiva de firma. Se conservarán el original aceptado, su respaldo digital y la constancia de entrega.");
 paragraph(`Identificador del modelo: ${d.model.id}. Huella de integridad SHA-256: ${d.model.hash}.`,{justify:false});
 for(const [i,p]of pdf.getPages().entries()){p.drawLine({start:{x:left,y:43},end:{x:left+width,y:43},color:rule,thickness:.5});const label=`${d.model.sample?"BORRADOR · ":""}${d.version}`;p.drawText(label,{x:left,y:25,size,font,color:muted});const folio=`Página ${i+1} de ${pdf.getPageCount()}`;p.drawText(folio,{x:left+width-font.widthOfTextAtSize(folio,size),y:25,size,font,color:muted});}
 pdf.setTitle("Compromiso de pago - Óptica & Cristal");pdf.setAuthor(d.company.name);pdf.setSubject(`Modelo ${d.version} / ${d.model.hash}`);return pdf.save();
}
