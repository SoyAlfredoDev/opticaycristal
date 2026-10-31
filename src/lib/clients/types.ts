import type { CustomerSale } from "./sales-types";
export type RegistrationWelcome = { tierName: string; maxAmount: number; maxPercent: number; maxInstallments: number };
export type CustomerProfile = {
  id: string; firstName: string; lastName: string; email: string; emailVerified: boolean; whatsapp: string; whatsappVerified: boolean;
  rut: string; identityVerified: boolean; createdAt: string;
  tier: { code: string; name: string; maxPercent: number; maxAmount: number; maxInstallments: number };
  credit: { principalOutstanding: number; capacity: number; available: number; enabled: boolean; needsIdentity: boolean };
  purchases: CustomerSale[];
};
export type CustomerSummary = Omit<CustomerProfile, "rut" | "whatsapp" | "purchases">;
const currency = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
export function clp(value: number) { return currency.format(value); }
export function availableCredit(maximum: number, outstanding: number, enabled: boolean) {
  const capacity = Math.max(0, maximum - outstanding);
  return { capacity, available: enabled ? capacity : 0 };
}
