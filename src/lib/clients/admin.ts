import "server-only";
import { getSession } from "@/lib/auth";
export async function customerAdminSession(allowSeller=false) {
  const session = await getSession({allowSeller});
  if (!session) return null;
  if (session.staffId && (session.role === "administrator" || (allowSeller && session.role === "seller"))) return session;
  // Never grant staff permissions from a public customer's email or request body.
  const allowlist = process.env.CLIENT_ADMIN_USERS?.split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (allowlist?.length && !allowlist.includes(session.u.toLowerCase())) return null;
  return session;
}

export function canManageProductCosts(user: string) {
 const owners=(process.env.CLIENT_COST_ADMIN_USERS || process.env.ADMIN_USER || process.env.ADMIN_USER_2 || "").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
 return owners.includes(user.trim().toLowerCase());
}

export function canManageCustomerCategories(user:string) {
 // Call only after customerAdminSession: the default is the existing client-admin role.
 if(!user.trim())return false;
 const configured=process.env.CLIENT_CATEGORY_ADMIN_USERS?.trim();
 if(!configured)return true;
 return configured.split(",").map(v=>v.trim().toLowerCase()).filter(Boolean).includes(user.trim().toLowerCase());
}
