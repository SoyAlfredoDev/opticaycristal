// @vitest-environment node
import { expect,it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile,writeFile } from "node:fs/promises";
import { CreditAgreement } from "./CreditAgreement";
import styles from "./Commitment.module.css";
import { CLIENT_MAIL_COMPANY } from "@/lib/clients/mail";
import type { CreditAgreementDocument } from "@/lib/clients/commitments";
const example:CreditAgreementDocument={version:"2026-11-02-compromiso-v3",preparedAt:"2026-11-02T15:00:00Z",company:CLIENT_MAIL_COMPANY,representative:{name:"Representante de ejemplo",rut:"123456785",signature:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NwAAAABJRU5ErkJggg=="},customer:{name:"Cliente de ejemplo",rut:"111111111",email:"cliente@example.invalid",whatsapp:"+56911111111"},sale:{id:"EJEMPLO-SIN-VALIDEZ",productName:"Lente de ejemplo",quantity:1,total:45000,net:37815,vat:7185,deposit:31500,credit:13500,createdAt:"2026-11-02T15:00:00Z"},installments:[{number:1,dueDate:"2026-12-02",amount:13500}],paymentMethod:"both",ordinaryAnnualRate:0,lateAnnualRate:18,lateGraceDays:60,legalAnnualMaximum:41.02,webpayUrl:null};
it("muestra las condiciones nuevas y firma pendiente sin ofrecer Webpay no configurado",async()=>{
 let html=renderToStaticMarkup(<CreditAgreement pdfHref="/api/clientes/compras/example/compromiso/pdf" document={example} backHref="/admin/clientes/ventas" cancelled={false} signedAt={null}/>);
 expect(html).toContain("Pendiente de firma presencial");expect(html).toContain("Desde el día 61");expect(html).toContain("base de 360 días");expect(html).toContain("sin renovación");expect(html).not.toContain("También se acepta Webpay");expect(html).toContain("02/12/2026");expect(html).toContain("$13.500");
 if(process.env.CONTRACT_QA_OUTPUT){
  for(const [key,value]of Object.entries(styles))html=html.replaceAll(value,key);
  html=html.replace(/class="([^"]*)"/g,(_all,classes:string)=>`class="${classes.split(" ").map(c=>c.replace(/^_(.+)_[a-zA-Z0-9]+$/,"$1")).join(" ")}"`);
  const css=await readFile("src/components/clients/Commitment.module.css","utf8");
  const logo=(await readFile("public/images/home/oc-logo-oficial.png")).toString("base64");
  html=html.replace(/src="\/images\/home\/oc-logo-oficial.png"/g,`src="data:image/png;base64,${logo}"`).replace(/<img[^>]*alt="Firma preimpresa autorizada del representante"[^>]*\/>/, '<div class="signatureArea">Imagen de firma pendiente de carga</div>');
  await writeFile(`${process.env.CONTRACT_QA_OUTPUT}/BORRADOR-compromiso-pago.html`,`<!doctype html><html lang="es"><meta charset="utf-8"><title>Borrador de compromiso: datos ficticios</title><style>${css}body{margin:0;background:white}.sample{font:700 14px Arial;color:#681c30;text-align:center;padding:18px;border:2px solid #681c30}.signatureArea{font-size:12px;color:#536574}</style><body><p class="sample">BORRADOR DE REVISIÓN · DATOS FICTICIOS · NO USAR PARA FIRMA</p>${html}</body></html>`);
 }
});
it("conserva sin mora el documento anterior y distingue una firma ya confirmada",()=>{
 const html=renderToStaticMarkup(<CreditAgreement pdfHref="/api/clientes/compras/example/compromiso/pdf" document={{...example,lateAnnualRate:0}} backHref="/mi-cuenta/compras" cancelled={false} signedAt="2026-11-02T16:00:00Z"/>);
 expect(html).toContain("conserva sus condiciones originales");expect(html).not.toContain("Desde el día 61");expect(html).toContain("Firma presencial del cliente confirmada");
});
