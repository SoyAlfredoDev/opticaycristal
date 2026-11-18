export type AdminSaleRow = {
  id: string;
  customerId: string;
  customerName: string;
  productName: string;
  total: number;
  deposit: number;
  credit: number;
  remaining: number;
  status: "active" | "cancelled";
  createdAt: string;
  controlNumber: string | null;
  controlVersion: string;
  creditOverride?: {reason:string;standardCredit:number;appliedCredit:number;actor:string;createdAt:string}|null;
};
export type AdminSalePage = { sales: AdminSaleRow[]; hasMore: boolean };
export const SALES_PAGE_SIZE = 25;
