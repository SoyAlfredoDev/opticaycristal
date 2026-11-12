import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import { brand, store } from "@/components/site/content";
import { shapeLabels, type Advice } from "./shared";

// Normalize unsupported glyphs and wrap even unusually long words from generated text.
function lines(text: string, font: PDFFont, size: number, width: number) {
  const safe = Array.from(text.normalize("NFC"), char => {
    try { font.encodeText(char); return char; } catch { return " "; }
  }).join("").replace(/\s+/g, " ").trim();
  const result: string[] = [];
  let line = "";
  for (const word of safe.split(" ")) {
    if (line && font.widthOfTextAtSize(`${line} ${word}`, size) <= width) { line += ` ${word}`; continue; }
    if (line) result.push(line);
    line = "";
    for (const char of word) {
      if (line && font.widthOfTextAtSize(line + char, size) > width) { result.push(line); line = ""; }
      line += char;
    }
  }
  if (line) result.push(line);
  return result;
}

export async function createAdvicePdf(advice: Advice, images: Array<string | undefined>) {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Tu guía personal de monturas | Óptica & Cristal");
  pdf.setAuthor(brand.name);
  pdf.setSubject("Propuestas personales de estilo y monturas");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const editorial = await pdf.embedFont(StandardFonts.TimesRoman);
  const wine = rgb(.408, .11, .188);
  const green = rgb(.08, .30, .24);
  const ink = rgb(.15, .20, .18);
  const muted = rgb(.37, .42, .39);
  const paper = rgb(.974, .971, .954);
  let logo: PDFImage | undefined;
  try {
    const response = await fetch(brand.logo, { signal: AbortSignal.timeout(5000) });
    if (response.ok) logo = await pdf.embedPng(await response.arrayBuffer());
  } catch { /* Keep the download available if the brand image cannot be loaded. */ }

  for (const [index, suggestion] of advice.suggestions.entries()) {
    const page = pdf.addPage([595.28, 841.89]);
    const left = 42, width = 511;
    const text = (value: string, x: number, y: number, size = 10, font = regular, color = ink) => {
      page.drawText(value, { x, y, size, font, color });
    };
    page.drawRectangle({ x: 0, y: 832, width: 595.28, height: 10, color: wine });
    if (logo) {
      const fitted = logo.scaleToFit(118, 53);
      page.drawImage(logo, { x: left, y: 754, ...fitted });
    } else text(brand.name, left, 774, 18, editorial, wine);
    text("ASESOR DE MONTURAS", 360, 789, 9, bold, green);
    text("Tu guía personal de estilo", 360, 772, 10, regular, muted);
    page.drawLine({ start: { x: left, y: 740 }, end: { x: 553, y: 740 }, thickness: .6, color: rgb(.84, .86, .82) });
    text(`PROPUESTA 0${index + 1}`, left, 716, 9, bold, green);
    text(shapeLabels[suggestion.shape], left, 678, 32, editorial, wine);
    text(`Color sugerido: ${suggestion.colors[0]}`, left, 657, 11, regular, muted);

    const reasonLines = lines(suggestion.reason, regular, 11, width - 32);
    const alternateLines = lines(`También puedes probar: ${suggestion.colors.slice(1).join(", ")}.`, regular, 10, width - 32);
    const bodyHeight = 51 + reasonLines.length * 16 + (suggestion.colors.length > 1 ? 17 + alternateLines.length * 14 : 0);
    const imageBottom = 151 + bodyHeight;
    const imageHeight = 635 - imageBottom;
    // The service bounds recommendations. Reject unexpected oversized content rather than overlap.
    if (imageHeight < 130) throw new Error("La explicación es demasiado extensa para el documento.");
    page.drawRectangle({ x: left, y: imageBottom, width, height: imageHeight, color: paper });
    if (images[index]) {
      const photo = await pdf.embedJpg(`data:image/jpeg;base64,${images[index]}`);
      const fitted = photo.scaleToFit(width - 24, imageHeight - 16);
      page.drawImage(photo, { x: left + (width - fitted.width) / 2, y: imageBottom + (imageHeight - fitted.height) / 2, ...fitted });
    } else {
      text("Tu propuesta de estilo", left + 170, imageBottom + imageHeight / 2, 16, editorial, wine);
      text("Imagen no disponible en esta descarga", left + 155, imageBottom + imageHeight / 2 - 22, 10, regular, muted);
    }
    const bodyTop = imageBottom - 18;
    page.drawRectangle({ x: left, y: 139, width: 3, height: bodyTop - 139, color: green });
    text("POR QUÉ TE LO SUGERIMOS", left + 16, bodyTop - 3, 9, bold, green);
    let y = bodyTop - 26;
    for (const line of reasonLines) { text(line, left + 16, y, 11); y -= 16; }
    if (suggestion.colors.length > 1) {
      y -= 7;
      for (const line of alternateLines) { text(line, left + 16, y, 10, regular, muted); y -= 14; }
    }
    text("Simulación de estilo con IA. El ajuste y la disponibilidad se confirman en la óptica.", left, 117, 8, regular, muted);
    page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 98, color: wine });
    text("Encuentra una montura parecida", left, 74, 15, editorial, rgb(1, 1, 1));
    text(store.fullAddress, left, 54, 10, bold, rgb(1, 1, 1));
    text(`WhatsApp ${brand.phone}`, left, 36, 10, regular, rgb(1, 1, 1));
    text(brand.website, left, 19, 9, regular, rgb(1, 1, 1));
    text(`${index + 1} / ${advice.suggestions.length}`, 524, 19, 9, regular, rgb(1, 1, 1));
  }
  return pdf.save();
}
