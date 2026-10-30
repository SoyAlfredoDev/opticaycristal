import "server-only";
import { getSession } from "@/lib/auth";
export async function customerAdminSession() {
  const session = await getSession();
  if (!session) return null;
  // Never grant staff permissions from a public customer's email or request body.
  const allowlist = process.env.CLIENT_ADMIN_USERS?.split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (allowlist?.length && !allowlist.includes(session.u.toLowerCase())) return null;
  return session;
}

export function canManageProductCosts(user: string) {
 const owners=(process.env.CLIENT_COST_ADMIN_USERS || process.env.ADMIN_USER || process.env.ADMIN_USER_2 || "").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
 return owners.includes(user.trim().toLowerCase());
}
