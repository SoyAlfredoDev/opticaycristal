import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { CreditAgreementDocument } from "./commitments";
import { agreementCopy, agreementRut } from "./agreement-copy";
import { clp } from "./types";
let logoBytes: Promise<Buffer> | undefined;
export async function creditAgreementPdf(d: CreditAgreementDocument, { cancelled = false, signedAt = null }: {
    cancelled?: boolean;
    signedAt?: string | null;
} = {}) {
    if(d.model?.definition.layout==="a4-formal-v3"){const {formalAgreementPdf}=await import("./credit-agreement-formal-pdf");return formalAgreementPdf(d);}
    if(d.model?.definition.layout==="a4-compact-v2"){const {compactAgreementPdf}=await import("./credit-agreement-compact-pdf");return compactAgreementPdf(d);}
    if(d.model){const {readableAgreementPdf}=await import("./credit-agreement-v4-pdf");return readableAgreementPdf(d);}
    const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold), copy = agreementCopy(d);
    const wine = rgb(.408, .11, .188), ink = rgb(.08, .17, .23), muted = rgb(.33, .4, .44), line = rgb(.84, .88, .9);
    let page = pdf.addPage([595.28, 841.89]), y = 790;
    const clean = (s: string) => s.replace(/\s+/g, " ").trim();
    const text = (s: string, x: number, top: number, size = 10, f: PDFFont = font, color = ink) => page.drawText(clean(s), { x, y: top, size, font: f, color });
    function next() { page = pdf.addPage([595.28, 841.89]); y = 778; text("Compromiso de pago · continuación", 48, 805, 11, bold, wine); }
    function room(height: number) { if (y - height < 75)
        next(); }
    function wrap(s: string, size: number, width = 499, f = font) { const lines: string[] = []; let row = ""; for (const word of clean(s).split(" ")) {
        if (row && f.widthOfTextAtSize(row + " " + word, size) > width) {
            lines.push(row);
            row = "";
        }
        if (f.widthOfTextAtSize(word, size) > width) {
            for (const char of word) {
                if (row && f.widthOfTextAtSize(row + char, size) > width) {
                    lines.push(row);
                    row = "";
                }
                row += char;
            }
        }
        else
            row += (row ? " " : "") + word;
    } if (row)
        lines.push(row); return lines; }
    function paragraph(s: string, size = 10) { for (const row of wrap(s, size)) {
        room(size + 5);
        text(row, 48, y, size);
        y -= size + 5;
    } y -= 9; }
    function heading(s: string) { room(65); text(s, 48, y, 13, bold, wine); y -= 24; }
    function moneyRow(label: string, value: string) { const labels = wrap(label, 9, 345), values = wrap(value, 10, 112, bold), height = Math.max(27, labels.length * 13 + 10, values.length * 14 + 10); room(height); for (const [i, row] of labels.entries())
        text(row, 57, y - i * 13, 9); for (const [i, row] of values.entries())
        text(row, 425, y - i * 14, 10, bold); y -= height; page.drawLine({ start: { x: 48, y: y + 10 }, end: { x: 547, y: y + 10 }, color: line, thickness: .5 }); }
    const date = (v: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(new Date(v));
    logoBytes ??= readFile(join(process.cwd(), "public/images/home/oc-logo-oficial.png"));
    const logo = await pdf.embedPng(await logoBytes), scaled = logo.scale(140 / logo.width);
    page.drawImage(logo, { x: 48, y: 750, width: scaled.width, height: scaled.height });
    text(d.company.name, 300, 796, 10, bold, wine);
    text(`RUT ${d.company.rut}`, 300, 780, 9);
    for (const [i, row] of wrap(d.company.address, 9, 247).entries())
        text(row, 300, 764 - i * 13, 9);
    y = 716;
    for (const title of wrap("Compraventa a crédito directo y compromiso de pago", 20, 499, bold)) {
        text(title, 48, y, 20, bold, wine);
        y -= 25;
    }
    y -= 12;
    paragraph(`Venta ${d.sale.id} · Preparado el ${date(d.preparedAt)}`, 8);
    paragraph(cancelled ? "VENTA ANULADA: documento histórico." : signedAt ? `Firma presencial del cliente confirmada por administración el ${date(signedAt)}.` : "Pendiente de firma presencial del cliente.", 9);
    heading("1. Identificación de las partes");
    paragraph(copy.parties);
    paragraph(`Contacto del cliente: ${d.customer.email} · ${d.customer.whatsapp}.`);
    heading("2. Compra y condiciones económicas");
    paragraph(`Producto: ${d.sale.productName} · Cantidad: ${d.sale.quantity}.`);
    moneyRow("Precio al contado y total de la compra, IVA incluido", clp(d.sale.total));
    moneyRow("Neto / IVA de la venta", `${clp(d.sale.net)} / ${clp(d.sale.vat)}`);
    moneyRow("Pie registrado en la venta", clp(d.sale.deposit));
    moneyRow("Capital concedido a crédito", clp(d.sale.credit));
    moneyRow("Interés corriente / moratorio", `0 % / ${d.lateAnnualRate} % anual simple`);
    moneyRow("Comisiones, seguros y otros recargos", clp(0));
    moneyRow("CAE", "0 %");
    moneyRow("Costo total del crédito, pagando al día", clp(d.sale.credit));
    y -= 10;
    heading("3. Compromiso de pago mensual");
    paragraph(copy.monthly);
    room(40 + d.installments.length * 24);
    text("Cuota", 58, y, 10, bold);
    text("Vencimiento", 220, y, 10, bold);
    text("Monto", 430, y, 10, bold);
    y -= 25;
    for (const i of d.installments) {
        text(String(i.number), 58, y);
        text(i.dueDate.split("-").reverse().join("/"), 220, y);
        text(clp(i.amount), 430, y, 10, bold);
        y -= 24;
    }
    y -= 10;
    paragraph(copy.late);
    heading("4. Pagos y atención");
    paragraph(copy.payments);
    paragraph(copy.rights);
    heading("5. Aceptación y entrega de copia");
    paragraph(copy.acceptance);
    room(210);
    paragraph("Suscrito en Santiago, el ______ de __________________ de __________.");
    const signature = await pdf.embedPng(d.representative.signature), size = signature.scale(Math.min(190 / signature.width, 65 / signature.height));
    page.drawImage(signature, { x: 330 + (190 - size.width) / 2, y: y - 72, width: size.width, height: size.height });
    y -= 85;
    page.drawLine({ start: { x: 48, y }, end: { x: 260, y }, color: ink, thickness: .6 });
    page.drawLine({ start: { x: 325, y }, end: { x: 537, y }, color: ink, thickness: .6 });
    y -= 18;
    const columns = [[48, "Firma del cliente", d.customer.name, `RUT ${agreementRut(d.customer.rut)}`], [325, "Firma preimpresa autorizada", d.representative.name, `RUT ${agreementRut(d.representative.rut)}`, `Por ${d.company.name}`]];
    let maxHeight = 0;
    for (const col of columns) {
        const [x, ...rows] = col as [
            number,
            ...string[]
        ];
        let dy = 0;
        for (const [index, s] of rows.entries())
            for (const row of wrap(s, 9, 212, index === 0 ? bold : font)) {
                text(row, x, y - dy, 9, index === 0 ? bold : font);
                dy += 13;
            }
        maxHeight = Math.max(maxHeight, dy);
    }
    y -= maxHeight + 15;
    paragraph(copy.note, 8);
    for (const [index, p] of pdf.getPages().entries()) {
        p.drawLine({ start: { x: 48, y: 56 }, end: { x: 547, y: 56 }, color: line, thickness: 1 });
        p.drawText(`WhatsApp ${d.company.phone}`, { x: 48, y: 40, size: 8, font, color: muted });
        p.drawText(`Página ${index + 1} de ${pdf.getPageCount()}`, { x: 465, y: 40, size: 8, font, color: muted });
    }
    pdf.setTitle("Compromiso de pago - Óptica & Cristal");
    pdf.setAuthor(d.company.name);
    return pdf.save();
}
