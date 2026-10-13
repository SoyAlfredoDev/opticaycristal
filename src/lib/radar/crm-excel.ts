import "server-only";
import ExcelJS from "exceljs";
import { unzipSync } from "fflate";
import { createHash } from "node:crypto";
import { emailAddress } from "./crm-validation";
import { parseRows } from "./import-csv";
import type { CompanyResult } from "./types";
export const importColumns = [
  "empresa",
  "email",
  "nombre_contacto",
  "cargo",
  "telefono",
  "sitio_web",
  "direccion",
];
export type ContactImportRow = {
  row: number;
  company: CompanyResult;
  email: string;
  name: string;
  role: string;
};
export async function parseContactFile(body: Record<string, unknown>) {
  let rows: string[][];
  if (body.format === "xlsx") {
    if (
      typeof body.file !== "string" ||
      body.file.length > 1500000 ||
      !/^[A-Za-z0-9+/=]+$/.test(body.file)
    )
      throw Error("Archivo Excel inválido o superior a 1 MB.");
    const bytes = Buffer.from(body.file, "base64");
    let expanded = 0,
      files = 0;
    unzipSync(bytes, {
      filter: (file) => {
        expanded += file.originalSize;
        if (++files > 200 || expanded > 8000000)
          throw Error("El Excel descomprimido supera el tamaño permitido.");
        return false;
      },
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      bytes as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
    const sheet = workbook.getWorksheet("Contactos") || workbook.worksheets[0];
    if (!sheet || sheet.rowCount > 501 || sheet.columnCount > 20)
      throw Error("El Excel admite hasta 500 contactos y 20 columnas.");
    rows = [];
    sheet.eachRow((row) => {
      const line: string[] = [];
      for (let n = 1; n <= sheet.columnCount; n++) {
        const cell = row.getCell(n);
        if (cell.type === ExcelJS.ValueType.Formula)
          throw Error("La importación admite valores, sin fórmulas.");
        line.push(cell.text.trim());
      }
      rows.push(line);
    });
  } else {
    if (typeof body.file !== "string" || body.file.length > 1000000)
      throw Error("CSV inválido o superior a 1 MB.");
    const text = body.file.replace(/^\uFEFF/, "");
    rows = parseRows(
      text,
      text.split(/[\n\r]/)[0].includes(";") &&
        !text.split(/[\n\r]/)[0].includes(",")
        ? ";"
        : ",",
    );
  }
  if (rows.length < 2 || rows.length > 501)
    throw Error("Incluye encabezados y de 1 a 500 contactos.");
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[ _]+/g, "_");
  const headers = rows[0].map(norm),
    seen = new Set<string>(),
    valid: ContactImportRow[] = [],
    errors: { row: number; error: string }[] = [],
    duplicates: string[] = [];
  const index = (names: string[]) =>
      headers.findIndex((h) => names.includes(h)),
    companyCol = index(["empresa", "nombre_empresa", "razon_social"]),
    emailCol = index(["email", "correo", "correo_electronico"]);
  if (companyCol < 0 || emailCol < 0)
    throw Error("Incluye las columnas empresa y email.");
  rows.slice(1).forEach((row, i) => {
    try {
      const value = (names: string[], max = 200) => {
          const n = index(names);
          return n < 0 ? "" : (row[n] || "").trim().slice(0, max);
        },
        name = (row[companyCol] || "").trim();
      if (!name || name.length > 200)
        throw Error("Nombre de empresa inválido.");
      const email = emailAddress(row[emailCol] || "");
      if (seen.has(email)) {
        duplicates.push(email);
        return;
      }
      const address = value(["direccion"]),
        rawWebsite = value(["sitio_web", "web", "website"]);
      let website: string | null = null;
      if (rawWebsite) {
        const u = new URL(
          /^https?:\/\//i.test(rawWebsite)
            ? rawWebsite
            : `https://${rawWebsite}`,
        );
        if (
          !["https:", "http:"].includes(u.protocol) ||
          u.username ||
          u.password
        )
          throw Error("Sitio web inválido.");
        website = u.toString();
      }
      const company: CompanyResult = {
        providerId:
          "manual:" +
          createHash("sha256")
            .update(norm(name) + "|" + norm(address))
            .digest("hex"),
        name,
        address: address || null,
        phone: value(["telefono"]) || null,
        website,
        mapsUrl: null,
        categories: [],
        emails: [email],
        source: "Importación CRM · datos aportados",
        fetchedAt: new Date().toISOString(),
      };
      seen.add(email);
      valid.push({
        row: i + 2,
        company,
        email,
        name: value(["nombre_contacto", "contacto"]),
        role: value(["cargo", "role"]),
      });
    } catch (e) {
      errors.push({
        row: i + 2,
        error: e instanceof Error ? e.message : "Fila inválida.",
      });
    }
  });
  return { valid, errors, duplicates };
}
export async function contactWorkbook(
  rows: unknown[][] = [],
  template = false,
) {
  const book = new ExcelJS.Workbook();
  book.creator = "Óptica & Cristal";
  const sheet = book.addWorksheet("Contactos");
  sheet.addRow(
    template
      ? importColumns
      : [
          "empresa",
          "email",
          "nombre_contacto",
          "cargo",
          "telefono",
          "sitio_web",
          "direccion",
          "relacion",
          "marketing",
          "origen",
        ],
  );
  sheet.columns.forEach((column, i) => {
    column.width = [34, 34, 26, 23, 22, 38, 40, 23, 23, 32][i] || 25;
  });
  const header = sheet.getRow(1);
  header.height = 28;
  header.eachCell((c) => {
    c.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF6B1F3A" },
    };
    c.alignment = { vertical: "middle" };
  });
  rows.forEach((row) =>
    sheet.addRow(row.map((v) => String(v ?? "").replace(/^[=+@-]/, "'$&"))),
  );
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: template ? "G1" : "J1" };
  sheet.getCell("A1").note =
    "Empresa y email son obligatorios. Una fila por correo. Se omiten duplicados; habilita marketing después de confirmar la llamada.";
  return new Uint8Array(await book.xlsx.writeBuffer());
}
