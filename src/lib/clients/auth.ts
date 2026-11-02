import "server-only";
import { betterAuth } from "better-auth";
import type { Pool } from "pg";
import { PostgresDialect } from "kysely";
import { headers } from "next/headers";
import { CUSTOMER_EMAIL_VERIFICATION_SECONDS } from "./email-token-policy";
import { clientPool, clientSchema, clientTable } from "./db";
import { sendClientMail, type ClientMail } from "./mail";

export function createClientAuth(database: Pool, sendMail: (message: ClientMail) => Promise<void> = sendClientMail) {
  const secret = process.env.CLIENT_AUTH_SECRET ?? "";
  if (secret.length < 32) throw new Error("Falta una clave segura CLIENT_AUTH_SECRET.");
  const baseURL = process.env.CLIENT_APP_URL || "https://opticaycristal.cl";
  if (!/^https:\/\//.test(baseURL) && !(process.env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/.test(baseURL))) throw new Error("CLIENT_APP_URL debe ser un origen HTTPS confiable.");
  async function sendCurrentUserMail(user:{id:string;email:string},url:string,kind:ClientMail["kind"]){
    const current=await database.query(`SELECT email FROM ${clientTable("oc_client_user")} WHERE id=$1 FOR SHARE`,[user.id]);
    if(current.rows[0]?.email!==user.email)return;
    await sendMail({to:user.email,url,kind});
  }
  return betterAuth({
    appName: "Óptica & Cristal", logger: { disabled: true }, secret, baseURL, basePath: "/api/clientes/auth", database: { dialect: new PostgresDialect({ pool: database }), type: "postgres", schemaName: clientSchema(), transaction: true },
    trustedOrigins: [new URL(baseURL).origin],
    advanced: { cookiePrefix: "oc_customer", useSecureCookies: process.env.NODE_ENV === "production", defaultCookieAttributes: { httpOnly: true, sameSite: "lax" } },
    user: { modelName: "oc_client_user", additionalFields: {
      firstName: { type: "string", required: true }, lastName: { type: "string", required: true },
      rutCipher: { type: "string", required: true, returned: false }, rutHash: { type: "string", required: true, returned: false },
      whatsappCipher: { type: "string", required: true, returned: false },
      category: { type: "string", input: false, defaultValue: "start" },
      identityVerified: { type: "boolean", input: false, defaultValue: false },
      whatsappVerified: { type: "boolean", input: false, defaultValue: false },
      privacyVersion: { type: "string", input: false, defaultValue: "2026-10-28" },
    } },
    account: { modelName: "oc_client_account" }, verification: { modelName: "oc_client_verification", storeIdentifier: "hashed" },
    session: { modelName: "oc_client_session", expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 12, cookieCache: { enabled: false } },
    emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128, autoSignIn: false, resetPasswordTokenExpiresIn: 1800, revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => sendCurrentUserMail(user,url,"reset"),
    },
    emailVerification: { sendOnSignUp: true, autoSignInAfterVerification: false, expiresIn: CUSTOMER_EMAIL_VERIFICATION_SECONDS,
      sendVerificationEmail: async ({ user, url }) => sendCurrentUserMail(user,url,"verify"),
    },
    rateLimit: { enabled: true, storage: "database", modelName: "oc_client_auth_rate_limit", window: 60, max: 30,
      customRules: { "/sign-in/email": { window: 900, max: 8 }, "/request-password-reset": { window: 3600, max: 3 }, "/send-verification-email": { window: 3600, max: 3 } },
    },
  });
}
let auth: ReturnType<typeof createClientAuth> | undefined;
export function clientAuth() { return auth ??= createClientAuth(clientPool()); }
export async function customerSession() { return clientAuth().api.getSession({ headers: await headers() }); }
