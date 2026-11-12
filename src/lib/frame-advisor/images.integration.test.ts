// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ pool: null as unknown, user: "test-a" as string | null }));
vi.mock("@/lib/clients/db", () => ({ clientPool: () => state.pool, clientTable: (name: string) => `"${name}"` }));
vi.mock("@/lib/clients/auth", () => ({ customerSession: async () => state.user ? { user: { id: state.user } } : null }));
import { GET, POST } from "@/app/api/clientes/asesor-de-monturas/imagenes/route";
import { purgeExpiredFrameImages } from "./image-store";
const db = new PGlite();
const connection = { query: async (sql: string, params?: unknown[]) => {
  const result = await db.query(sql,params); return { ...result,rowCount:result.affectedRows ?? result.rows.length };
}, release() {} };
state.pool = { query:connection.query, connect:async()=>connection };
const origin="https://opticaycristal.cl";
const id=randomUUID();
let photo:string, output:string;
const suggestions=[{shape:"rectangular",colors:["negro","carey"],reason:"Te sugeriría esta forma por sus líneas definidas."},{shape:"panto",colors:["carey","dorado"],reason:"Te ofrece una silueta suave y clásica."},{shape:"aviador",colors:["dorado","plata"],reason:"El puente doble te da un aire retro."}];
const input=(index=0)=>({adviceId:id,index,photo,consent:"photo-edit-v1"});
const post=(body:unknown,from=origin)=>POST(new Request(`${origin}/api/clientes/asesor-de-monturas/imagenes`,{method:"POST",headers:{Origin:from,"Content-Type":"application/json"},body:JSON.stringify(body)}));
const get=()=>GET(new Request(`${origin}/api/clientes/asesor-de-monturas/imagenes?adviceId=${id}`));
const success=()=>new Response(JSON.stringify({data:[{b64_json:output}]}));
beforeAll(async()=>{
  await db.exec("CREATE TABLE oc_client_user(id text PRIMARY KEY); INSERT INTO oc_client_user VALUES('test-a'),('test-b');");
  for(const file of ["025-frame-advisor.sql","026-frame-photo-edits.sql","026-frame-photo-edits.sql"]) await db.exec(await readFile(`sql/clients/${file}`,"utf8"));
  photo=(await sharp({create:{width:512,height:688,channels:3,background:"#babaaf"}}).jpeg().toBuffer()).toString("base64");
  output=(await sharp({create:{width:768,height:1024,channels:3,background:"#aabbcc"}}).jpeg().toBuffer()).toString("base64");
  vi.stubEnv("CLIENT_APP_URL",origin);vi.stubEnv("CLIENT_DATA_KEY",randomBytes(32).toString("base64"));
  vi.stubEnv("CLIENT_FRAME_ADVISOR_ENABLED","true");vi.stubEnv("CLIENT_FRAME_ADVISOR_PROVIDER","openai");vi.stubEnv("OPENAI_API_KEY","synthetic-test-only");
});
beforeEach(async()=>{
  await db.exec("TRUNCATE oc_client_frame_image,oc_client_frame_image_budget,oc_client_frame_advice,oc_client_frame_pilot; INSERT INTO oc_client_frame_pilot VALUES('test-a');");
  await db.query("INSERT INTO oc_client_frame_advice(id,user_id,request_id,result) VALUES($1,'test-a',$2,$3)",[id,randomUUID(),JSON.stringify(suggestions)]);
  state.user="test-a";vi.stubEnv("CLIENT_FRAME_PHOTO_EDITS_ENABLED","true");vi.stubGlobal("fetch",vi.fn(async()=>success()));
});
afterAll(async()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();await db.close();});
it("bloquea sesiones, origen, fuera de piloto y propietario incorrectos",async()=>{
  state.user=null;expect((await post(input())).status).toBe(401);expect((await get()).status).toBe(401);
  state.user="test-a";expect((await post(input(),"https://evil.invalid")).status).toBe(403);
  state.user="test-b";expect((await post(input())).status).toBe(404);
  await db.exec("INSERT INTO oc_client_frame_pilot VALUES('test-b')");
  expect((await post(input())).status).toBe(404);expect(await (await get()).json()).toEqual({images:[]});expect(fetch).not.toHaveBeenCalled();
});
it("requiere consentimiento y rechaza datos arbitrarios, imágenes corruptas y cuerpos grandes",async()=>{
  for(const payload of [{...input(),consent:false},{...input(),prompt:"another person"},{...input(),index:3},{...input(),photo:"bm90IGFuIGltYWdl"},{...input(),photo:"A".repeat(2_900_000)}])expect((await post(payload)).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
it("crea exactamente tres ediciones, una sola vez, cifra resultados y no envía identidad ni instrucciones del cliente",async()=>{
  for(let index=0;index<3;index++)expect((await post(input(index))).status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(3);
  const repeated=await post(input());expect(repeated.status).toBe(200);expect(repeated.headers.get("Cache-Control")).toContain("no-store");expect(fetch).toHaveBeenCalledTimes(3);
  const restored=await (await get()).json();expect(restored.images).toHaveLength(3);expect(restored.images.every((i:{state:string,image:string})=>i.state==="ready"&&!!i.image)).toBe(true);
  const rows=(await db.query("SELECT * FROM oc_client_frame_image")).rows;
  expect(JSON.stringify(rows)).not.toContain(output);expect(JSON.stringify(rows)).not.toContain(photo);
  for(const [url,options] of vi.mocked(fetch).mock.calls){
    expect(url).toBe("https://api.openai.com/v1/images/edits");
    const payload=JSON.parse(String(options?.body));expect(payload).toMatchObject({model:"gpt-image-2",n:1,quality:"medium",output_format:"jpeg"});
    expect(payload.prompt).toContain("Preserve the original identity");expect(payload).not.toHaveProperty("input_fidelity");expect(payload.images).toHaveLength(1);expect(JSON.stringify(payload)).not.toContain("test-a");
  }
});
it("vincula las tres propuestas a la misma foto",async()=>{
  expect((await post(input())).status).toBe(200);
  const different=(await sharp({create:{width:512,height:688,channels:3,background:"#000000"}}).jpeg().toBuffer()).toString("base64");
  expect((await post({...input(1),photo:different})).status).toBe(409);expect(fetch).toHaveBeenCalledTimes(1);
});
it("reserva antes de enviar, bloquea duplicados simultáneos y no reenvía un fallo ambiguo",async()=>{
  const started=Promise.withResolvers<void>(),provider=Promise.withResolvers<Response>();
  vi.mocked(fetch).mockImplementation(()=>{started.resolve();return provider.promise;});
  const request=post(input());await started.promise;
  expect((await post(input())).status).toBe(409);expect((await post(input(1))).status).toBe(409);
  provider.resolve(new Response("",{status:503}));expect((await request).status).toBe(503);expect((await post(input())).status).toBe(503);expect(fetch).toHaveBeenCalledTimes(1);
});
it("limita el presupuesto global incluso si se borran asesorías",async()=>{
  await db.exec("INSERT INTO oc_client_frame_image_budget VALUES(date_trunc('month',now() AT TIME ZONE 'America/Santiago')::date,89)");
  expect((await post(input())).status).toBe(200);expect((await post(input(1))).status).toBe(429);expect(fetch).toHaveBeenCalledTimes(1);
});
it("caduca y purga las imágenes, conserva la reserva y no vuelve a generar",async()=>{
  expect((await post(input())).status).toBe(200);
  await db.exec("UPDATE oc_client_frame_image SET expires_at=now()-interval '1 second'");
  expect((await (await get()).json()).images[0]).toMatchObject({state:"expired",image:null});
  await purgeExpiredFrameImages();expect((await db.query("SELECT image_encrypted,state FROM oc_client_frame_image")).rows[0]).toEqual({image_encrypted:null,state:"expired"});
  expect((await post(input())).status).toBe(410);expect(fetch).toHaveBeenCalledTimes(1);
});
it("permite apagar solo la edición sin abrir acceso a otras cuentas",async()=>{
  vi.stubEnv("CLIENT_FRAME_PHOTO_EDITS_ENABLED","false");expect((await post(input())).status).toBe(404);expect((await get()).status).toBe(404);expect(fetch).not.toHaveBeenCalled();
});
it("limita también las imágenes por cliente y día aunque queden asesorías antiguas",async()=>{
  for(let n=0;n<3;n++){
    const other=randomUUID();
    await db.query("INSERT INTO oc_client_frame_advice(id,user_id,request_id,result) VALUES($1,'test-a',$2,$3)",[other,randomUUID(),JSON.stringify(suggestions)]);
    for(let i=0;i<3;i++) await db.query("INSERT INTO oc_client_frame_image(advice_id,option_index,photo_fingerprint,state) VALUES($1,$2,'synthetic','failed')",[other,i]);
  }
  expect((await post(input())).status).toBe(429);expect(fetch).not.toHaveBeenCalled();
});
it("rechaza salidas corruptas del proveedor sin guardarlas ni volver a gastar",async()=>{
  vi.mocked(fetch).mockImplementation(async()=>new Response(JSON.stringify({data:[{b64_json:"bm90IGFuIGltYWdl"}]})));
  expect((await post(input())).status).toBe(503);expect((await post(input())).status).toBe(503);
  expect((await (await get()).json()).images[0]).toMatchObject({state:"failed",image:null});expect(fetch).toHaveBeenCalledTimes(1);
});
it("no vuelve a generar una petición que quedó pendiente más de tres minutos",async()=>{
  expect((await post(input())).status).toBe(200);
  await db.exec("UPDATE oc_client_frame_image SET state='pending',image_encrypted=NULL,created_at=now()-interval '4 minutes'");
  expect((await post(input())).status).toBe(503);expect(fetch).toHaveBeenCalledTimes(1);
});
it("rechaza asesorías de más de un día antes de llamar al proveedor",async()=>{
  await db.exec("UPDATE oc_client_frame_advice SET created_at=now()-interval '25 hours'");
  expect((await post(input())).status).toBe(410);expect(fetch).not.toHaveBeenCalled();
});
it("la limpieza programada exige el secreto de servidor",async()=>{
  const {GET:cleanup}=await import("@/app/api/cron/asesor-imagenes/route");
  vi.stubEnv("CRON_SECRET","synthetic-cron-test-only");
  expect((await cleanup(new Request(`${origin}/api/cron/asesor-imagenes`))).status).toBe(401);
  expect((await cleanup(new Request(`${origin}/api/cron/asesor-imagenes`,{headers:{Authorization:"Bearer wrong"}}))).status).toBe(401);
  expect((await cleanup(new Request(`${origin}/api/cron/asesor-imagenes`,{headers:{Authorization:"Bearer synthetic-cron-test-only"}}))).status).toBe(200);
});
