// @vitest-environment node
import { afterEach,expect,it,vi } from "vitest";
const mock=vi.hoisted(()=>({created:vi.fn(),attach:vi.fn()}));
vi.mock("pg",()=>({Pool:class { options:unknown;on=vi.fn();constructor(options:unknown){this.options=options;mock.created(options);} }}));
vi.mock("@vercel/functions",()=>({attachDatabasePool:mock.attach}));
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
it("reutiliza un pool acotado, conserva TLS y permite reutilizar la conexión entre refrescos locales",async()=>{
 vi.stubEnv("CLIENT_DATABASE_URL","postgresql://test:placeholder@ep-test-pooler.us-east-2.aws.neon.tech/db");vi.stubEnv("NODE_ENV","development");
 const {clientPool}=await import("./db");expect(clientPool()).toBe(clientPool());expect(mock.created).toHaveBeenCalledOnce();expect(mock.attach).toHaveBeenCalledOnce();
 const options=mock.created.mock.calls[0][0];expect(options).toMatchObject({max:4,idleTimeoutMillis:60000,keepAlive:true});expect(new URL(options.connectionString).searchParams.get("sslmode")).toBe("verify-full");
});
it("libera conexiones en Vercel mediante el helper oficial y un timeout corto",async()=>{
 vi.stubEnv("CLIENT_DATABASE_URL","postgresql://test:placeholder@localhost/db");vi.stubEnv("NODE_ENV","production");vi.stubEnv("VERCEL","1");
 const {clientPool}=await import("./db");clientPool();expect(mock.created.mock.calls[0][0].idleTimeoutMillis).toBe(5000);expect(mock.attach).toHaveBeenCalledOnce();
});
