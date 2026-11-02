import type { CustomerProfile } from "./types";

export type LevelBenefits = Pick<CustomerProfile["tier"], "maxPercent" | "maxAmount" | "maxInstallments">;
export type ManagedLevel = CustomerProfile["tier"] & { revision: number };
export type LevelChange = {
  id: string;
  code: string;
  name: string;
  before: LevelBenefits;
  after: LevelBenefits;
  actor: string;
  reason: string;
  revision: number;
  createdAt: string;
};
export type LevelSettings = {
  levels: ManagedLevel[];
  history: LevelChange[];
  nextCursor: string | null;
};
