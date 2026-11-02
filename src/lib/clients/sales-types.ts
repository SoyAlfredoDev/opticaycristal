export type SaleProduct = { id: string; name: string; protectedCost: number | null };
export type SaleInstallment = { id: string; number: number; dueDate: string; amount: number; paid: number };
export type SalePayment = { id: string; amount: number; paidOn: string; reference: string; reversed: boolean; interestAmount?:number;interestWaived?:number;totalAmount?:number };
export type CustomerSale = {
 id: string; productName: string; quantity: number; total: number; net: number; vat: number;
 deposit: number; credit: number; remaining: number; tierCode: string; createdAt: string;
 status: "active" | "cancelled"; signedAt: string | null;
 commitmentVersion: string; installments: SaleInstallment[]; payments: SalePayment[];
};
export type SaleInput = {
 customerId: string; productId: string; quantity: number; total: number; credit: number;
 installmentCount: number; firstDueDate: string; identityChecked: boolean; depositReceived: boolean; conditionsReviewed?: boolean;
 requestKey: string; unitProtectedCost?: number; pricingPolicy?: "category";
};
export type SaleQuote = { total: number; net: number; vat: number; maximumCredit: number; minimumDeposit: number; protectedCost: number | null; maxInstallments: number; enabled: boolean; reason: string };
