import "server-only";
import type { PoolClient } from "pg";
import { clientPool, clientTable } from "./db";
import { clientFingerprint, protectClientValue, revealClientValue } from "./privacy";
import { parseCustomerDocument, type CustomerDocument, type ForeignCustomerDocument } from "./customer-document";

// The original columns still store the encrypted identity and unique fingerprint.
// A tagged envelope distinguishes additional documents without rewriting legacy RUTs.
const envelope = "document:v1:";

export function customerDocumentHash(document: CustomerDocument) {
  return document.type === "rut" ? clientFingerprint(document.number, "rut")
    : clientFingerprint(JSON.stringify([document.type, document.country, document.number]), "customer-document");
}

export function encryptCustomerDocument(document: CustomerDocument) {
  const value = document.type === "rut" ? document.number : envelope + JSON.stringify(document);
  return protectClientValue(value, "rut");
}

export function readCustomerDocument(cipher: string): { rut: string; document?: ForeignCustomerDocument } {
  const value = revealClientValue(cipher, "rut");
  if (!value.startsWith(envelope)) return { rut: value };
  const raw = JSON.parse(value.slice(envelope.length));
  const document = parseCustomerDocument({ documentType: raw.type, documentCountry: raw.country, documentNumber: raw.number });
  if (document.type === "rut") throw new Error("Documento protegido no válido.");
  return { rut: "", document };
}

export async function findCustomerByDocumentHash(hash: string, db: Pick<PoolClient, "query"> = clientPool()): Promise<string | null> {
  const result = await db.query<{ id: string }>(`SELECT id FROM ${clientTable("oc_client_user")} WHERE "rutHash"=$1`, [hash]);
  return result.rows[0]?.id ?? null;
}

export function findCustomerByDocument(document: CustomerDocument) {
  return findCustomerByDocumentHash(customerDocumentHash(document));
}
