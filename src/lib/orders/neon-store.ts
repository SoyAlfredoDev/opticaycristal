import "server-only";
import { websiteStore } from "@/lib/website-db";
import type { NewPurchaseOrder, OrderStatus, PurchaseOrder } from "./types";

const records = websiteStore<PurchaseOrder>("orders");
export const orderNeonStore = {
  list: records.list,
  create(order: NewPurchaseOrder) {
    return records.create({ ...order, status: "nuevo" });
  },
  updateStatus(id: string, status: OrderStatus) {
    return records.update(id, { status });
  },
};
