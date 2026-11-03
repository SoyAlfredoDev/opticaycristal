// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { createClientAuth } from '@/lib/clients/auth';
const db=new PGlite();
let transaction=false,committed=false;
const visibility:boolean[]=[];
const connection={query:async(sql:string,values?:unknown[])=>{
 if(/^begin/i.test(sql))transaction=true;
 const r=await db.query(sql,values);
 if(/^commit/i.test(sql)){transaction=false;committed=true;}
 if(/^rollback/i.test(sql))transaction=false;
 return {...r,rowCount:r.affectedRows??r.rows.length};
},release(){}};
const pool={connect:async()=>connection,query:async(sql:string,values?:unknown[])=>{
 if(/^SELECT email FROM .*oc_client_user.*FOR SHARE/i.test(sql)){
  visibility.push(transaction);
  // A second PostgreSQL connection cannot see an INSERT before its transaction commits.
  if(transaction&&!committed)return {rows:[],rowCount:0};
 }
 return connection.query(sql,values);
}} as unknown as Pool;
const send=vi.fn(async()=>{});
let auth:ReturnType<typeof createClientAuth>;
beforeAll(async()=>{
 vi.stubEnv('CLIENT_DATABASE_SCHEMA','public');vi.stubEnv('CLIENT_AUTH_SECRET',randomBytes(32).toString('base64'));vi.stubEnv('CLIENT_APP_URL','http://localhost:3097');
 await db.exec(await readFile('sql/clients/001-customers.sql','utf8'));auth=createClientAuth(pool,send);
},30000);
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
it('envía después del commit aunque otra conexión no pueda ver las escrituras pendientes',async()=>{
 const response=await auth.api.signUpEmail({body:{name:'Cliente Ficticio',email:'visibility@example.invalid',password:'Synthetic-only-password-2026',firstName:'Cliente',lastName:'Ficticio',rutCipher:'synthetic',rutHash:'synthetic',whatsappCipher:'synthetic'},asResponse:true});
 expect(response.status).toBe(200);
 expect(visibility).toEqual([false]);
 expect(send).toHaveBeenCalledOnce();
 expect((await db.query<{count:number}>('SELECT count(*)::int AS count FROM oc_client_user')).rows[0].count).toBe(1);
 await auth.api.sendVerificationEmail({body:{email:'visibility@example.invalid',callbackURL:'/mi-cuenta/perfil'}});
 expect(send).toHaveBeenCalledTimes(2);
},20000);
