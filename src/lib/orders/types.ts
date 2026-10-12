export const ORDER_STATUSES = ["nuevo", "contactado", "cotizado", "cerrado"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderItem = Readonly<{
  productId: string;
  title: string;
  image: string;
  quantity: number;
}>;

export type OrderCustomer = Readonly<{
  name: string;
  email: string;
  phone: string;
  comuna: string;
  address: string;
  comments: string;
  consent: true;
}>;

export type PurchaseOrder = Readonly<{
  id: string;
  items: readonly OrderItem[];
  customer: OrderCustomer;
  status: OrderStatus;
  createdAt: string;
}>;

export type NewPurchaseOrder = Omit<PurchaseOrder, "status">;
