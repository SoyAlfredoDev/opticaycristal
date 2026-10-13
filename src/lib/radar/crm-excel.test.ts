import { describe, it, expect, vi } from "vitest";
import ExcelJS from "exceljs";
import { zipSync } from "fflate";
vi.mock("server-only", () => ({}));
import { parseContactFile, contactWorkbook } from "./crm-excel";
describe("contact import and Excel template", () => {
  it("does not let an invalid row consume a later valid email", async () => {
    const result = await parseContactFile({
      format: "csv",
      file: "empresa,email,sitio_web\n[Prueba],ventas@example.invalid,http://\n[Prueba],ventas@example.invalid,https://example.invalid",
    });
    expect(result.errors).toHaveLength(1);
    expect(result.valid).toHaveLength(1);
    expect(result.duplicates).toHaveLength(0);
  });
  it("normalizes duplicate email and reports bad rows without inventing contacts", async () => {
    const r = await parseContactFile({
      format: "csv",
      file: "empresa,email\n[Empresa prueba], Ventas@example.invalid \n[Empresa prueba],ventas@example.invalid\n[Empresa prueba],invalid\n,contacto@example.invalid",
    });
    expect(r.valid).toHaveLength(1);
    expect(r.duplicates).toHaveLength(1);
    expect(r.errors).toHaveLength(2);
    expect(r.valid[0].email).toBe("ventas@example.invalid");
  });
  it("creates an empty branded template and imports real provided XLSX values", async () => {
    const bytes = await contactWorkbook([], true),
      w = new ExcelJS.Workbook();
    await w.xlsx.load(
      Buffer.from(bytes) as unknown as Parameters<typeof w.xlsx.load>[0],
    );
    const s = w.getWorksheet("Contactos")!;
    expect(s.getCell("A1").text).toBe("empresa");
    expect(s.rowCount).toBe(1);
    s.addRow([
      "[Empresa de prueba]",
      "contacto@example.invalid",
      "[Contacto]",
      "RRHH",
      "",
      "https://example.invalid",
      "",
    ]);
    const data = await w.xlsx.writeBuffer();
    const r = await parseContactFile({
      format: "xlsx",
      file: Buffer.from(data).toString("base64"),
    });
    expect(r.valid[0]).toMatchObject({
      email: "contacto@example.invalid",
      role: "RRHH",
    });
  });
  it("rejects formulas and oversized decompressed XLSX archives", async () => {
    const w = new ExcelJS.Workbook(),
      s = w.addWorksheet("Contactos");
    s.addRow(["empresa", "email"]);
    s.addRow([
      "[Prueba]",
      {
        formula: '"contacto@example.invalid"',
        result: "contacto@example.invalid",
      },
    ]);
    const b = await w.xlsx.writeBuffer();
    await expect(
      parseContactFile({
        format: "xlsx",
        file: Buffer.from(b).toString("base64"),
      }),
    ).rejects.toThrow("fórmulas");
    const archive = zipSync({ "xl/bomb.xml": new Uint8Array(8000001) });
    await expect(
      parseContactFile({
        format: "xlsx",
        file: Buffer.from(archive).toString("base64"),
      }),
    ).rejects.toThrow("descomprimido");
  });
});
