import { supportConversation } from "@/lib/clients/support-http";
export const runtime = "nodejs";
export const { GET, POST } = supportConversation(true);
