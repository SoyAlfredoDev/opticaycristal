import { products } from "@/components/optica/catalog";
import type { NewPurchaseOrder, OrderCustomer, OrderItem } from "./types";

type ParsedOrder = { ok: true; data: Omit<NewPurchaseOrder, "id" | "createdAt"> } | { ok: false; error: string };
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export function parseOrderBody(value: unknown): ParsedOrder {
  if (!value || typeof value !== "object") return { ok: false, error: "Revisa los datos del pedido." };
  const body = value as Record<string, unknown>;
  const rawCustomer = body.customer && typeof body.customer === "object" ? body.customer as Record<string, unknown> : {};
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length < 1 || rawItems.length > 12) return { ok: false, error: "El carro debe tener entre 1 y 12 productos distintos." };

  const productsById = new Map(products.map((product) => [product.id, product]));
  const seen = new Set<string>();
  const items: OrderItem[] = [];
  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") return { ok: false, error: "Hay un producto inválido en el carro." };
    const row = entry as Record<string, unknown>;
    const product = typeof row.productId === "string" ? productsById.get(row.productId) : undefined;
    const quantity = row.quantity;
    if (!product || seen.has(product.id) || !Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 10) {
      return { ok: false, error: "Revisa los productos y sus cantidades." };
    }
    seen.add(product.id);
    items.push({ productId: product.id, title: product.title, image: product.image, quantity: quantity as number });
  }

  const customer: OrderCustomer = {
    name: text(rawCustomer.name, 120),
    email: text(rawCustomer.email, 190).toLowerCase(),
    phone: text(rawCustomer.phone, 40),
    comuna: text(rawCustomer.comuna, 100),
    address: text(rawCustomer.address, 220),
    comments: text(rawCustomer.comments, 700),
    consent: rawCustomer.consent === true,
  } as OrderCustomer;
  if (customer.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) || customer.phone.length < 8 || customer.comuna.length < 2 || customer.address.length < 4 || !customer.consent) {
    return { ok: false, error: "Completa tus datos y acepta el uso de información para gestionar el pedido." };
  }
  return { ok: true, data: { items, customer } };
}
