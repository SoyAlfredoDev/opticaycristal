import type { CustomerSale, SalePayment } from "./sales-types";
export type HistorySale = CustomerSale & { paymentsNextCursor: string | null };
export type CustomerHistoryPage = { sales: HistorySale[]; nextCursor: string | null };
export type CustomerPaymentPage = { payments: SalePayment[]; nextCursor: string | null };
