import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

function dataKey() {
  const key = Buffer.from(process.env.CLIENT_DATA_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("CLIENT_DATA_KEY debe contener 32 bytes codificados en base64.");
  return key;
}
type ProtectedPurpose = "cris-attachment" | "staff-rut" | "rut" | "whatsapp" | "support-subject" | "support-message" | "support-email" | "contract-settings" | "contract-document" | "profile-change" | "level-email";
export function protectClientValue(value: string, purpose: ProtectedPurpose) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", dataKey(), iv);
  cipher.setAAD(Buffer.from(`oc-client-v1:${purpose}`));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}
export function revealClientValue(value: string, purpose: ProtectedPurpose) {
  const [version, iv, tag, ciphertext] = value.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Dato protegido no válido.");
  const decipher = createDecipheriv("aes-256-gcm", dataKey(), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(`oc-client-v1:${purpose}`));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
export function clientFingerprint(value: string, purpose: string) {
  return createHmac("sha256", dataKey()).update(`${purpose}\0${value}`).digest("hex");
}
