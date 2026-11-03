// @vitest-environment node
import {spawnSync} from 'node:child_process';
import {expect,it} from 'vitest';
it.each([
 {ADMIN_NOTIFICATIONS_TARGET:'production',NODE_ENV:'development',CLIENT_DATABASE_SCHEMA:'preview_clients',WEBSITE_DATABASE_SCHEMA:'preview_website'},
 {ADMIN_NOTIFICATIONS_TARGET:'development',NODE_ENV:'production',CLIENT_DATABASE_SCHEMA:'preview_clients',WEBSITE_DATABASE_SCHEMA:'preview_website'},
 {ADMIN_NOTIFICATIONS_TARGET:'development',NODE_ENV:'development',CLIENT_DATABASE_SCHEMA:'oc_customers',WEBSITE_DATABASE_SCHEMA:'preview_website'},
 {ADMIN_NOTIFICATIONS_TARGET:'development',NODE_ENV:'development',CLIENT_DATABASE_SCHEMA:'preview_clients',WEBSITE_DATABASE_SCHEMA:'public'},
])('el ejecutor de desarrollo rechaza el destino antes de conectar: %j',options=>{
 const result=spawnSync(process.execPath,['scripts/migrate-business-notifications-dev.mjs'],{cwd:process.cwd(),env:{...process.env,...options,NODE_ENV:options.NODE_ENV as 'development'|'production',DATABASE_URL:'postgresql://blocked.invalid/development'},encoding:'utf8',timeout:5000});
 expect(result.status).not.toBe(0);expect(result.stderr).toContain('solo permite esquemas explícitos de desarrollo');expect(result.stderr).not.toMatch(/ENOTFOUND|ECONNREFUSED/);
});
