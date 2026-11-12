import { customerSession } from "@/lib/clients/auth";

export async function GET() {
  const session = await customerSession();
  return new Response(null, {
    status: 307,
    headers: {
      Location: session ? "/mi-cuenta/asesor-de-monturas" : "/mi-cuenta/registro",
      "Cache-Control": "private, no-store",
    },
  });
}
