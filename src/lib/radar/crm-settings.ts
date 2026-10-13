import "server-only";
import { ensureCrmSchema, crmSql } from "./crm-schema";
export async function marketingEnabled() {
  await ensureCrmSchema();
  const rows =
    await crmSql()`SELECT value FROM radar_crm_settings WHERE key='sending_enabled'`;
  return rows.length
    ? rows[0].value === true
    : process.env.RADAR_MARKETING_ENABLED === "true";
}
