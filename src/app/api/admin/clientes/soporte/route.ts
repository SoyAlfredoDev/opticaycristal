import { supportCollection } from "@/lib/clients/support-http";
export const maxDuration = 60;
export const runtime = "nodejs";
export const { GET } = supportCollection(true);
