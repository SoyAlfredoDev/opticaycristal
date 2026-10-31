import { privateCustomerRead } from "@/lib/clients/private-read";
import { getCustomerPaymentPage } from "@/lib/clients/history";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return privateCustomerRead(request, owner => getCustomerPaymentPage(owner, id, new URL(request.url).searchParams.get("cursor")));
}
