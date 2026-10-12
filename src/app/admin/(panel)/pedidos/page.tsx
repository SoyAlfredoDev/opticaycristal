import { redirect } from "next/navigation";
import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { getSession } from "@/lib/auth";
import { listOrders } from "@/lib/orders/store";
import type { PurchaseOrder } from "@/lib/orders/types";

export const dynamic = "force-dynamic";
export default async function AdminOrdersPage() {
  if (!(await getSession())) redirect("/admin/login");
  let orders: PurchaseOrder[] = [];
  let errorCarga: string | null = null;
  try { orders = await listOrders(); }
  catch (error) { console.error("No se pudo leer el registro de pedidos", error); errorCarga = "No se pudo leer el registro. Revisa la conexión a la base de datos."; }
  const mysqlConfigured = Boolean(process.env.DB_HOST?.trim() && process.env.DB_USER?.trim() && process.env.DB_NAME?.trim());
  return <OrdersPanel orders={orders} errorCarga={errorCarga} mysqlConfigured={mysqlConfigured} />;
}
