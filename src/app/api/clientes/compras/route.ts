import { privateCustomerRead } from "@/lib/clients/private-read";
import { getCustomerHistoryPage } from "@/lib/clients/history";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return privateCustomerRead(request, id => getCustomerHistoryPage(id, params.get("cuotas") === "1", params.get("cursor")));
}
