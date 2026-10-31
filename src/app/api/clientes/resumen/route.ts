import { privateCustomerRead } from "@/lib/clients/private-read";
import { getCustomerSnapshot } from "@/lib/clients/store";
export const runtime = "nodejs";
export async function GET(request: Request) { return privateCustomerRead(request, getCustomerSnapshot); }
