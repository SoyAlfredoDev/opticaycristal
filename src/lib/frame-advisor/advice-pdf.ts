import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { brand, store } from "@/components/site/content";
import { shapeLabels, type Advice } from "./shared";

export async function createAdvicePdf(advice: Advice, images: Array<string | undefined>) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const wine = rgb(.41, .11, .19);
  const dark = rgb(.19, .15, .17);

  for (const [index, suggestion] of advice.suggestions.entries()) {
    const page = pdf.addPage([595, 842]);
    const left = 46;
    let y = 788;
    const write = (text: string, size = 12, heading = false) => {
      const font = heading ? bold : regular;
      const safe = Array.from(text.normalize("NFC"), char => {
        try { font.encodeText(char); return char; } catch { return " "; }
      }).join("");
      let line = "";
      for (const word of safe.split(/\s+/)) {
        const next = line ? line + " " + word : word;
        if (line && font.widthOfTextAtSize(next, size) > 503) {
          page.drawText(line, { x: left, y, size, font, color: heading ? wine : dark });
          y -= size + 5;
          line = word;
        } else {
          line = next;
        }
      }
      if (line) page.drawText(line, { x: left, y, size, font, color: heading ? wine : dark });
      y -= size + 6;
    };

    write(brand.name, 22, true);
    write("Tus propuestas de monturas");
    y -= 14;
    write(`${index + 1}. ${shapeLabels[suggestion.shape]} · ${suggestion.colors[0]}`, 18, true);
    if (images[index]) {
      const photo = await pdf.embedJpg(`data:image/jpeg;base64,${images[index]}`);
      const size = photo.scaleToFit(503, 440);
      page.drawImage(photo, { x: left + (503 - size.width) / 2, y: y - size.height, ...size });
      y -= size.height + 24;
    }
    write(suggestion.reason);
    if (suggestion.colors.length > 1) write("También puedes probar: " + suggestion.colors.slice(1).join(", ") + ".");
    y -= 12;
    write("Simulación de estilo. Confirma el ajuste y la disponibilidad en la óptica.", 10);
    y = 109;
    write(store.fullAddress, 12, true);
    write("WhatsApp " + brand.phone);
    write(brand.website + " · " + brand.instagramLabel, 11);
  }
  return pdf.save();
}
