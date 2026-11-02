export type Registration = { firstName: string; lastName: string; rut: string; whatsapp: string; email: string; password: string; privacyAccepted: boolean };
export function normalizeClientRut(input: string) { return input.replace(/[.\s-]/g, "").toUpperCase(); }
export function validClientRut(value: string) {
  const rut = normalizeClientRut(value);
  if (!/^[1-9]\d{6,7}[0-9K]$/.test(rut) || /^(\d)\1+$/.test(rut)) return false;
  let sum = 0, factor = 2;
  for (let i = rut.length - 2; i >= 0; i--) { sum += Number(rut[i]) * factor; factor = factor === 7 ? 2 : factor + 1; }
  const dv = 11 - sum % 11;
  return rut.at(-1) === (dv === 11 ? "0" : dv === 10 ? "K" : String(dv));
}
export function parseCustomerContact(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Revisa los datos del formulario.");
  const b = raw as Record<string, unknown>;
  const name = (key: string) => typeof b[key] === "string" ? (b[key] as string).trim().normalize("NFC") : "";
  const firstName = name("firstName"), lastName = name("lastName");
  if (![firstName, lastName].every(n => n.length >= 2 && n.length <= 80 && /^[\p{L}\p{M} .’'-]+$/u.test(n))) throw new Error("Ingresa tu nombre y apellido, de 2 a 80 caracteres.");
  let whatsapp = name("whatsapp").replace(/[\s()-]/g, "");
  if (/^9\d{8}$/.test(whatsapp)) whatsapp = "+56" + whatsapp;
  if (/^569\d{8}$/.test(whatsapp)) whatsapp = "+" + whatsapp;
  if (!/^\+[1-9]\d{7,14}$/.test(whatsapp)) throw new Error("Ingresa un WhatsApp con código de país, por ejemplo +56 9 1234 5678.");
  const email = name("email").toLowerCase();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error("Ingresa un correo electrónico válido.");
  return { firstName, lastName, whatsapp, email };
}
export function parseRegistration(raw: unknown): Registration {
  const contact=parseCustomerContact(raw);
  const b=raw as Record<string,unknown>;
  const rut=normalizeClientRut(typeof b.rut==="string"?b.rut:"");
  if (!validClientRut(rut)) throw new Error("Revisa el RUT y su dígito verificador.");
  const password = typeof b.password === "string" ? b.password : "";
  if (password.length < 8 || password.length > 128) throw new Error("Usa una contraseña de entre 8 y 128 caracteres.");
  if (b.privacyAccepted !== true) throw new Error("Debes aceptar el tratamiento de datos necesario para crear tu cuenta.");
  return { ...contact, rut, password, privacyAccepted: true };
}
