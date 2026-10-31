import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { customerSession } from "./auth";
import { getCustomerProfile } from "./store";
export const requireCustomerSession = cache(async () => {
  const session = await customerSession();
  if (!session) redirect("/mi-cuenta/ingresar");
  return session;
});
export const currentCustomer = cache(async () => {
  const session = await requireCustomerSession();
  const profile = await getCustomerProfile(session.user.id);
  if (!profile) redirect("/mi-cuenta/ingresar");
  return profile;
});
