import { normalizeClientRut, validClientRut } from "./validation";

export const documentTypes = [
  { value: "rut", label: "RUT chileno" },
  { value: "passport", label: "Pasaporte" },
  { value: "national_id", label: "Documento nacional extranjero" },
] as const;
export type DocumentType = typeof documentTypes[number]["value"];
export type ForeignCustomerDocument = { type: Exclude<DocumentType, "rut">; country: string; number: string };
export type CustomerDocument = { type: "rut"; number: string } | ForeignCustomerDocument;
export type DocumentFields = { documentType: DocumentType; documentCountry: string; documentNumber: string };

// ISO 3166-1 alpha-2. Numbers are only comparable within the same issuing authority and type.
const countries = new Set("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" "));
const countryNames = new Intl.DisplayNames("es-CL", { type: "region" });
export const documentIssuers = [...countries].map(code => ({ code, label: countryNames.of(code) ?? code }))
  .sort((a, b) => a.label.localeCompare(b.label, "es-CL"));

export class CustomerDocumentError extends Error {}

export function parseCustomerDocument(input: Record<string, unknown>): CustomerDocument {
  const type = input.documentType === undefined ? "rut" : input.documentType;
  const raw = input.documentNumber === undefined && type === "rut" ? input.rut : input.documentNumber;
  if (type === "rut") {
    const rut = typeof raw === "string" && raw.length <= 20 ? normalizeClientRut(raw) : "";
    if (!validClientRut(rut)) throw new CustomerDocumentError("Ingresa un RUT válido con su dígito verificador.");
    return { type, number: rut };
  }
  if (type !== "passport" && type !== "national_id")
    throw new CustomerDocumentError("Selecciona un tipo de documento válido.");
  const country = typeof input.documentCountry === "string" ? input.documentCountry.trim().toUpperCase() : "";
  if (!countries.has(country) || (type === "national_id" && country === "CL"))
    throw new CustomerDocumentError("Selecciona el país emisor del documento.");
  const value = typeof raw === "string" && raw.length <= 32 ? raw.trim() : "";
  const number = value.replace(/[ .-]/g, "").toUpperCase();
  if (!/^[A-Za-z0-9 .-]+$/.test(value) || !/^[A-Z0-9]{3,24}$/.test(number))
    throw new CustomerDocumentError("Ingresa un número de documento válido, usando letras o números.");
  return { type, country, number };
}

export function formatCustomerDocument(identity: { rut: string; document?: ForeignCustomerDocument }) {
  const doc = identity.document;
  if (doc) {
    const label = doc.type === "passport" ? "Pasaporte" : "Documento nacional extranjero";
    return { label, value: `${doc.number} (${doc.country})` };
  }
  const rut = identity.rut ?? "";
  const number = normalizeClientRut(rut);
  return { label: "RUT", value: number.length > 1 ? `${number.slice(0, -1)}-${number.slice(-1)}` : rut || "[Por completar]" };
}

export function customerDocumentText(identity: Parameters<typeof formatCustomerDocument>[0], separator = " ") {
  const { label, value } = formatCustomerDocument(identity);
  return `${label}${separator}${value}`;
}
