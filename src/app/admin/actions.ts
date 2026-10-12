"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminCookieOptions } from "@/lib/auth";
export async function logoutAction() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, "", adminCookieOptions(0));
  redirect("/admin/login");
}
