import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument,StandardFonts,rgb,type PDFFont } from "pdf-lib";
import type { AdminSimulation } from "./admin-simulation";
import { CLIENT_MAIL_COMPANY } from "./mail";
import { clp } from "./types";
let logoBytes:Promise<Buffer>|undefined;
export async function creditProposalPdf(quote:AdminSimulation){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 let page=pdf.addPage([595.28,841.89]);
 const ink=rgb(.08,.17,.23),wine=rgb(.408,.11,.188),green=rgb(0,.45,.34),muted=rgb(.33,.4,.44),line=rgb(.84,.88,.9);
 const text=(value:string,x:number,y:number,size=11,f:PDFFont=font,color=ink)=>page.drawText(value,{x,y,size,font:f,color});
 function wrap(value:string,width:number,size=10){const lines:string[]=[];let current="";for(const word of value.replace(/\s+/g," ").split(" ")){if(current&&font.widthOfTextAtSize(`${current} ${word}`,size)>width){lines.push(current);current="";}if(font.widthOfTextAtSize(word,size)>width){for(const character of word){if(current&&font.widthOfTextAtSize(current+character,size)>width){lines.push(current);current="";}current+=character;}}else current+=`${current?" ":""}${word}`;}if(current)lines.push(current);return lines;}
 function paragraph(value:string,y:number,size=10){const lines=wrap(value,499,size);for(const item of lines){if(y<120){page=pdf.addPage([595.28,841.89]);y=780;text("Propuesta de crédito - continuación",48,807,14,bold,wine);}text(item,48,y,size);y-=size+5;}return y;}
 page.drawRectangle({x:0,y:836,width:595.28,height:6,color:green});
 logoBytes??=readFile(join(process.cwd(),"public/images/home/oc-logo-oficial.png"));
 const logo=await pdf.embedPng(await logoBytes);const logoSize=logo.scale(135/logo.width);page.drawImage(logo,{x:48,y:750,width:logoSize.width,height:logoSize.height});
 text(CLIENT_MAIL_COMPANY.name,315,794,10,bold,wine);text(`RUT ${CLIENT_MAIL_COMPANY.rut}`,315,779,9,font,muted);text("Huérfanos 713, local 18 - Santiago Centro",315,764,9,font,muted);
 text("Propuesta de crédito",48,716,26,bold,wine);
 const date=new Intl.DateTimeFormat("es-CL",{dateStyle:"long",timeZone:"America/Santiago"}).format(new Date(quote.issuedAt));
 text(`Emitida el ${date}`,48,694,10,font,muted);text(`Referencia ${quote.fingerprint.slice(0,10).toUpperCase()}`,350,694,9,font,muted);
 let y=664;
 let customerName=quote.customer?.name||"";try{font.encodeText(customerName);}catch{customerName="Identificado por RUT";}
 y=paragraph(quote.customer?`Cliente: ${customerName} | RUT ${quote.customer.rut.slice(0,-1)}-${quote.customer.rut.slice(-1)}`:"Escenario por nivel. No asociado a un cliente registrado.",y,11)-6;
 y=paragraph(`Nivel ${quote.tier.name} | Hasta el ${quote.tier.maxPercent}% de la compra | Tope ${clp(quote.tier.maxAmount)} | Máximo ${quote.tier.maxInstallments} ${quote.tier.maxInstallments===1?"cuota mensual":"cuotas mensuales"}.`,y,10)-12;
 if(quote.productName){let productName=quote.productName;try{font.encodeText(productName);}catch{productName="Producto seleccionado; consulta su descripción en administración.";}y=paragraph(`Producto: ${productName}`,y,10)-12;}
 const boxY=y-90;
 page.drawRectangle({x:48,y:boxY,width:499,height:90,color:rgb(.94,.98,.96),borderColor:line,borderWidth:1});
 for(const [index,label,value]of [[0,"Total con IVA",quote.total],[1,"Pie mínimo",quote.deposit],[2,"Monto a crédito",quote.credit]] as const){const x=62+index*165;text(label,x,y-25,10,font,muted);text(clp(value),x,y-56,21,bold,index===2?green:ink);}
 y=boxY-24;
 text(`Neto ${clp(quote.net)} + IVA ${clp(quote.vat)}. Interés corriente: 0 %.`,48,y,10,font,muted);y-=25;
 text("Calendario mensual estimado",48,y,13,bold,wine);y-=23;
 if(quote.installments.length){
  page.drawRectangle({x:48,y:y-8,width:499,height:25,color:rgb(.96,.96,.97)});text("Cuota",60,y,10,bold);text("Vencimiento",215,y,10,bold);text("Monto",440,y,10,bold);y-=29;
  for(const i of quote.installments){text(String(i.number),60,y);text(i.dueDate.split("-").reverse().join("/"),215,y);text(clp(i.amount),440,y,11,bold);page.drawLine({start:{x:48,y:y-10},end:{x:547,y:y-10},color:line,thickness:.5});y-=30;}
 }else{y=paragraph(quote.reason||"No hay monto a crédito en este cálculo.",y,11)-12;}
 y-=12;
 const note=quote.reason?quote.reason:quote.mode==="tier"?"Escenario referencial: el cálculo utiliza las condiciones del nivel; la disponibilidad real depende de la cuenta y sus verificaciones.":quote.productName?"Cálculo con las condiciones del nivel y disponibilidad consultada. Debe validarse nuevamente al registrar la venta.":"Cálculo referencial por nivel, sin producto seleccionado. El pie corresponde a la diferencia entre el precio total y el crédito permitido.";
 y=paragraph(note,y,9)-10;
 y=paragraph("Esta propuesta no registra una venta, no reserva cupo ni genera deuda. La compra se confirma en la óptica.",y,9)-8;
 paragraph("Contratos nuevos: mora simple de hasta 1,5 % mensual desde el día 61 de atraso, sujeta al máximo legal y al compromiso aceptado, sin retroactividad ni capitalización.",y,9);
 for(const [index,current] of pdf.getPages().entries()){page=current;
 page.drawLine({start:{x:48,y:83},end:{x:547,y:83},color:line,thickness:1});
 text(`WhatsApp ${CLIENT_MAIL_COMPANY.phone}`,48,63,9,bold,green);text("opticaycristal.cl",430,63,9,font,muted);text(`Propuesta referencial - Página ${index+1} de ${pdf.getPageCount()}`,48,47,8,font,muted);}
 pdf.setTitle("Propuesta de crédito - Óptica & Cristal");pdf.setAuthor(CLIENT_MAIL_COMPANY.name);pdf.setSubject("Simulación referencial de compra presencial");
 return pdf.save();
}
