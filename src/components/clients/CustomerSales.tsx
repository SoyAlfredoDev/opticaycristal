"use client";
import { useCustomerData } from "./CustomerDataProvider";
import { CustomerDataState } from "./CustomerDataState";
import { SalesHistory } from "./SalesHistory";
export function CustomerSales({ installmentsOnly }: { installmentsOnly: boolean }) {
  const { customer } = useCustomerData();
  return customer ? <SalesHistory customer={{ credit: customer.credit, tier: customer.tier }} sales={customer.purchases} installmentsOnly={installmentsOnly} /> : <CustomerDataState />;
}
