import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { customerSession } from "./auth";
export const requireCustomerSession = cache(async () => {
  const session = await customerSession();
  if (!session) redirect("/mi-cuenta/ingresar");
  return session;
});
