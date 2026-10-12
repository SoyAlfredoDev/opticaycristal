import "server-only";
import { orderFileStore } from "./file-store";
import { orderMysqlStore } from "./mysql-store";
import { orderNeonStore } from "./neon-store";
import { websiteDatabaseConfigured } from "@/lib/website-db";
import type { NewPurchaseOrder, OrderStatus } from "./types";

function store() {
  if (websiteDatabaseConfigured()) return orderNeonStore;
  if (process.env.VERCEL && !(process.env.DB_HOST?.trim() && process.env.DB_USER?.trim() && process.env.DB_NAME?.trim())) throw new Error("Configura DATABASE_URL para almacenar pedidos en Vercel.");
  return process.env.DB_HOST?.trim() && process.env.DB_USER?.trim() && process.env.DB_NAME?.trim() ? orderMysqlStore : orderFileStore;
}
export function listOrders() { return store().list(); }
export function createOrder(order: NewPurchaseOrder) { return store().create(order); }
export function updateOrderStatus(id: string, status: OrderStatus) { return store().updateStatus(id, status); }
