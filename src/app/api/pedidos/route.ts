import { NextResponse } from "next/server";
import { allowAttempt, clientIp, getSession } from "@/lib/auth";
import { parseOrderBody } from "@/lib/orders/parse";
import { createOrder, listOrders } from "@/lib/orders/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try { return NextResponse.json({ orders: await listOrders() }); }
  catch (error) { console.error("No se pudieron leer los pedidos", error); return NextResponse.json({ error: "No se pudo leer el registro." }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!allowAttempt(`pedido:${clientIp(request)}`, 5, 10 * 60 * 1000)) return NextResponse.json({ error: "Espera unos minutos antes de volver a enviar." }, { status: 429 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "El pedido no tiene un formato válido." }, { status: 400 }); }
  const parsed = parseOrderBody(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const order = await createOrder({ ...parsed.data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, id: order.id }, { status: 201 });
  } catch (error) { console.error("No se pudo registrar el pedido", error); return NextResponse.json({ error: "No pudimos registrar el pedido. Inténtalo más tarde." }, { status: 503 }); }
}
