import "server-only";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import type { CreditAgreementDocument } from "./commitments";
import { customerDocumentText } from "./customer-document";
import { effectiveModelClauses } from "./agreement-model";
import { formalAgreementAssets } from "./credit-agreement-formal-pdf";
import { DIGITAL_ACCEPTANCE_CLAUSE, DIGITAL_AGREEMENT_TERMS } from "./digital-agreement-copy";
import { clp } from "./types";

export const TWO_PAGE_LAYOUT = "a4-two-page-v4";
export const TWO_PAGE_BODY_PT = 13;
const LEFT = 24, WIDTH = 547.28, LEADING = 13.1;
// This area belongs exclusively to paper signatures or digital acceptance evidence.
const EVIDENCE = { x: LEFT, y: 57, width: WIDTH, height: 148 };
const ink = rgb(.1, .1, .1), wine = rgb(104 / 255, 28 / 255, 48 / 255);
const rule = rgb(.7, .7, .7);

export class TwoPageAgreementError extends Error {
  constructor() {
    super("Los datos del compromiso exceden dos páginas. Revisa la extensión de las referencias y del antecedente de representación; no se recortó contenido ni se emitió un documento incompleto.");
  }
}

async function fonts(pdf: PDFDocument) {
  const assets = await formalAgreementAssets();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(assets.regular, { subset: true });
  const bold = await pdf.embedFont(assets.bold, { subset: true });
  const glyphs = fontkit.create(new Uint8Array(assets.regular));
  const safe = (text: string) => {
    const value = text.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
    for (const character of value) if (!glyphs.hasGlyphForCodePoint(character.codePointAt(0)!))
      throw new Error("La fuente del modelo no admite algún carácter. No se sustituyeron letras de los datos.");
    return value;
  };
  return { assets, font, bold, safe };
}

type Word = { value: string; face: PDFFont };
function lines(words: Word[], width: number) {
  const rows: Word[][] = []; let row: Word[] = [], used = 0;
  for (const word of words) {
    const space = row.length ? word.face.widthOfTextAtSize(" ", TWO_PAGE_BODY_PT) : 0;
    const length = word.face.widthOfTextAtSize(word.value, TWO_PAGE_BODY_PT);
    if (row.length && used + space + length > width) { rows.push(row); row = []; used = 0; }
    if (length > width) {
      if (row.length) { rows.push(row); row = []; used = 0; }
      let part = "";
      for (const character of word.value) {
        if (word.face.widthOfTextAtSize(part + character, TWO_PAGE_BODY_PT) > width) {
          rows.push([{ value: part, face: word.face }]); part = "";
        }
        part += character;
      }
      row = [{ value: part, face: word.face }]; used = word.face.widthOfTextAtSize(part, TWO_PAGE_BODY_PT);
    } else {
      used += (row.length ? space : 0) + length; row.push(word);
    }
  }
  if (row.length) rows.push(row);
  return rows;
}

/** New layout key: earlier issued originals and approved renderers remain immutable. */
export async function twoPageAgreementPdf(d: CreditAgreementDocument) {
  if (d.model?.definition.layout !== TWO_PAGE_LAYOUT) throw new Error("Diseño de modelo no compatible.");
  const pdf = await PDFDocument.create(), { assets, font, bold, safe } = await fonts(pdf);
  const pages = [pdf.addPage([595.28, 841.89]), pdf.addPage([595.28, 841.89])];
  let index = 0, y = 805;
  function text(value: string, x = LEFT, top = y, face = font, color = ink) {
    pages[index].drawText(safe(value), { x, y: top, size: TWO_PAGE_BODY_PT, font: face, color });
  }
  function room(height: number) {
    const bottom = index === 0 ? 57 : EVIDENCE.y + EVIDENCE.height + 9;
    if (y - height >= bottom) return;
    if (index === 1) throw new TwoPageAgreementError();
    index = 1; y = 803;
    text("CONTRATO Y COMPROMISO DE PAGO · CONTINUACIÓN", LEFT, y, bold, wine);
    y -= LEADING + 9;
  }
  const words = (value: string, face = font) => safe(value).split(" ").filter(Boolean).map(value => ({ value, face }));
  function paragraph(value: string, label = "", gap = 2) {
    const rows = lines([...words(label, bold), ...words(value)], WIDTH);
    room(Math.min(rows.length, 2) * LEADING);
    for (const row of rows) {
      room(LEADING); let x = LEFT;
      row.forEach((word, i) => {
        if (i) x += word.face.widthOfTextAtSize(" ", TWO_PAGE_BODY_PT);
        text(word.value, x, y, word.face); x += word.face.widthOfTextAtSize(word.value, TWO_PAGE_BODY_PT);
      });
      y -= LEADING;
    }
    y -= gap;
  }
  function heading(value: string) {
    room(LEADING * 3); y -= 1; text(value, LEFT, y, bold, wine); y -= LEADING + 3;
  }
  function pair(a: [string, string], b: [string, string]) {
    const half = WIDTH / 2, rowWidth = half - 15;
    const cells = [a, b].map(([label, value]) => lines([...words(label), ...words(value, bold)], rowWidth));
    const height = Math.max(...cells.map(cell => cell.length)) * LEADING + 3;
    room(height);
    cells.forEach((cell, column) => cell.forEach((row, line) => {
      let x = LEFT + column * half;
      row.forEach((word, i) => {
        if (i) x += word.face.widthOfTextAtSize(" ", TWO_PAGE_BODY_PT);
        text(word.value, x, y - line * LEADING, word.face); x += word.face.widthOfTextAtSize(word.value, TWO_PAGE_BODY_PT);
      });
    }));
    y -= height;
  }
  const logo = await pdf.embedPng(assets.logo), dim = logo.scale(67 / logo.width);
  pages[0].drawImage(logo, { x: LEFT, y: y - dim.height, width: dim.width, height: dim.height });
  text("COMPRAVENTA A CRÉDITO DIRECTO", LEFT + 89, y, bold, wine); y -= LEADING;
  text("Y COMPROMISO DE PAGO", LEFT + 89, y, bold, wine); y -= LEADING;
  text("Ver bien, sentirse bien", LEFT + 89, y); y -= LEADING + 8;
  if (d.model.sample) paragraph("MUESTRA SIN VALIDEZ · Datos ilustrativos, sin venta, firma ni pago reales.", "", 5);
  const prepared = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", dateStyle: "short" }).format(new Date(d.preparedAt));
  paragraph(`Modelo ${d.version}. Preparado: ${prepared}. Emitir no acredita firma ni entrega.`, "", 5);
  const rut = (value: string) => value ? `${value.slice(0, -1)}-${value.slice(-1)}` : "[Por completar]";
  paragraph(`${d.company.name}, RUT ${d.company.rut}, ${d.company.address}. Representante: ${d.representative.name}, RUT ${rut(d.representative.rut)}. Facultades: ${d.representative.authority || "[Por completar]"}.`, "1. PARTES.");
  paragraph(`${d.customer.name}, ${customerDocumentText(d.customer)}. Correo: ${d.customer.email}. WhatsApp: ${d.customer.whatsapp}.`, "Cliente:");
  paragraph(`${d.sale.productName}. Cantidad: ${d.sale.quantity}. Venta: ${d.sale.id}. AppsFly: ${d.references?.appsFlySale || "No informada"}. OT: ${d.references?.workOrder || "No informada"}.`, "Compra:");
  heading("2. HOJA RESUMEN Y CALENDARIO MENSUAL ORIGINAL");
  pair(["Precio contado con IVA:", clp(d.sale.total)], ["Total compra:", clp(d.sale.total)]);
  pair(["Pie registrado:", clp(d.sale.deposit)], ["Capital financiado:", clp(d.sale.credit)]);
  pair(["Interés pactado / CAE:", "0 % / 0 %"], ["Costo total del crédito:", clp(d.sale.credit)]);
  pair(["Neto / IVA:", `${clp(d.sale.net)} / ${clp(d.sale.vat)}`], ["Comisiones y otros cargos:", "$0"]);
  for (const installment of d.installments) {
    room(LEADING + 1);
    text(`Cuota ${installment.number} de ${d.installments.length}`, LEFT, y);
    text(`Vence: ${installment.dueDate.split("-").reverse().join("/")}`, LEFT + 155, y);
    const amount = clp(installment.amount);
    text(amount, LEFT + WIDTH - bold.widthOfTextAtSize(amount, TWO_PAGE_BODY_PT), y, bold);
    y -= LEADING + 1;
  }
  y -= 4;
  paragraph(`Mora anual simple: hasta ${d.lateAnnualRate} %, limitada al máximo legal aplicable si es menor. Gracia: ${d.lateGraceDays} días por cuota. Límite informado al emitir: ${d.legalAnnualMaximum} % anual; se verificará al suscribir y liquidar.`);
  paragraph("La hoja resumen y el calendario son parte íntegra del contrato. El cliente acepta ambos al firmar.");
  heading("3. CONDICIONES DEL CONTRATO");
  const labels = { monthly: "Precio y obligaciones.", late: "Mora y cálculo por tramos.", payments: "Pagos, abonos y prepago.", collection: "Cobranza directa.", judicial: "Acciones civiles de cobro.", rights: "Derechos y atención.", acceptance: "Aceptación y copia íntegra.", privacy: "Datos personales." };
  const clauses = effectiveModelClauses(d.model.definition, d.lateAnnualRate);
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    paragraph(clauses[key], labels[key]);
    if (key === "payments") paragraph((d.paymentMethod === "local" ? "Medio habilitado: local." : d.paymentMethod === "transfer" ? "Medio habilitado: transferencia; solicita los datos vigentes al WhatsApp oficial." : "Medios habilitados: local y transferencia; solicita los datos bancarios al WhatsApp oficial.") + (d.paymentMethod === "all" && d.webpayUrl ? ` Webpay oficial: ${d.webpayUrl}.` : " Webpay no habilitado en este documento."));
  }

  // Fixed last-page signature area. Digital signing replaces only these blank fields.
  index = 1; y = EVIDENCE.y + EVIDENCE.height - TWO_PAGE_BODY_PT;
  pages[1].drawLine({ start: { x: LEFT, y: EVIDENCE.y + EVIDENCE.height }, end: { x: LEFT + WIDTH, y: EVIDENCE.y + EVIDENCE.height }, color: rule, thickness: .5 });
  text("FIRMAS Y ENTREGA DE COPIA ÍNTEGRA", LEFT, y, bold); y -= LEADING + 4;
  text("Santiago, firma: ____ / ____ / ______. Copia: ____ / ____ / ______."); y -= LEADING;
  text("Medio y constancia de entrega: ___________________________________."); y -= 48;
  for (const x of [LEFT, LEFT + 285]) pages[1].drawLine({ start: { x, y }, end: { x: x + 245, y }, color: ink, thickness: .5 });
  if (d.representative.signature) {
    const signature = await pdf.embedPng(d.representative.signature), dim = signature.scale(Math.min(200 / signature.width, 35 / signature.height));
    pages[1].drawImage(signature, { x: LEFT + 297, y: y + 3, width: dim.width, height: dim.height });
  }
  y -= LEADING;
  text("Cliente individualizado en este contrato", LEFT, y);
  text("Por la óptica: representante autorizado", LEFT + 285, y); y -= LEADING;
  text(d.model.definition.clauses.acceptance === DIGITAL_ACCEPTANCE_CLAUSE
    ? "La firma electrónica sustituye estos espacios manuscritos."
    : "La óptica entrega copia íntegra firmada al cliente.");
  for (const [i, page] of pages.entries()) {
    page.drawText(`SHA-256: ${d.model.hash}`, { x: LEFT, y: 34, size: TWO_PAGE_BODY_PT, font, color: ink });
    const folio = `Página ${i + 1} de 2`;
    page.drawText(d.version, { x: LEFT, y: 18, size: TWO_PAGE_BODY_PT, font, color: wine });
    page.drawText(folio, { x: LEFT + WIDTH - font.widthOfTextAtSize(folio, TWO_PAGE_BODY_PT), y: 18, size: TWO_PAGE_BODY_PT, font });
  }
  pdf.setTitle("Compromiso de pago - Óptica & Cristal");
  pdf.setAuthor(d.company.name); pdf.setSubject(`Modelo ${d.version} / ${d.model.hash} / ${TWO_PAGE_LAYOUT}`);
  return pdf.save();
}

/** Overlay evidence only in the reserved area of this layout, never over contract clauses. */
export async function addTwoPageDigitalEvidence(pdf: PDFDocument, evidence: { saleId: string; originalHash: string; signedAt: Date; representativeAt: Date }) {
  if (pdf.getPageCount() !== 2 || !pdf.getSubject()?.endsWith(`/ ${TWO_PAGE_LAYOUT}`)) throw new Error("El PDF no contiene el espacio de firma digital de dos páginas.");
  const { font, bold, safe } = await fonts(pdf), page = pdf.getPage(1);
  const blocks: { value: string; face: PDFFont }[] = [
    { value: "CONSTANCIA DE FIRMA ELECTRÓNICA SIMPLE", face: bold },
    { value: DIGITAL_AGREEMENT_TERMS, face: font },
    { value: `Cliente: aceptación con código, ${evidence.signedAt.toISOString()}.`, face: font },
    { value: `Representante: aceptación en administración, ${evidence.representativeAt.toISOString()}.`, face: font },
    { value: `Venta: ${evidence.saleId}.`, face: font },
    { value: `SHA-256 del PDF original: ${evidence.originalHash}`, face: font },
  ];
  const rows = blocks.flatMap(block => lines(safe(block.value).split(" ").map(value => ({ value, face: block.face })), WIDTH));
  if (rows.length * LEADING > EVIDENCE.height) throw new TwoPageAgreementError();
  page.drawRectangle({ ...EVIDENCE, color: rgb(1, 1, 1) });
  let y = EVIDENCE.y + EVIDENCE.height - TWO_PAGE_BODY_PT;
  for (const row of rows) {
    let x = LEFT;
    row.forEach((word, i) => {
      if (i) x += word.face.widthOfTextAtSize(" ", TWO_PAGE_BODY_PT);
      page.drawText(word.value, { x, y, size: TWO_PAGE_BODY_PT, font: word.face, color: ink });
      x += word.face.widthOfTextAtSize(word.value, TWO_PAGE_BODY_PT);
    });
    y -= LEADING;
  }
}
