import { beforeEach,describe,expect,it,vi } from "vitest";
import { createHash } from "node:crypto";
const mocks=vi.hoisted(()=>({query:vi.fn(),transaction:vi.fn(),release:vi.fn()}));
vi.mock("./db",()=>({clientTable:(name:string)=>name,clientPool:()=>({query:mocks.query,connect:async()=>({query:mocks.transaction,release:mocks.release})})}));
import { parseContractSettings,validateSignature,prepareCommitment,getStoredCommitment,decodeCommitment } from "./commitments";
import { protectClientValue,revealClientValue } from "./privacy";
const signature="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NwAAAABJRU5ErkJggg==";
const settings={representativeName:"Representante de prueba",representativeRut:"123456785",signature,paymentMethod:"local" as const,webpayUrl:null,legalAnnualMaximum:41.02,latePolicyEffectiveAt:"2026-11-02T00:00:00.000Z",legalLimitChecked:true};
const sale={id:"sale-qa",productName:"Lente de prueba",quantity:1,total:45000,net:37815,vat:7185,deposit:31500,credit:13500,createdAt:"2026-11-02T12:00:00.000Z",installments:[{number:1,dueDate:"2026-12-02",amount:13500,paid:0}]};
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("CLIENT_DATA_KEY",Buffer.alloc(32,7).toString("base64"));});
describe("Compromisos de pago",()=>{
 it("exige autorización expresa y valida RUT y formato de firma",()=>{
  expect(parseContractSettings({...settings,authorizeSignature:true,authorizeCurrentTerms:true},settings)).toEqual(expect.objectContaining({representativeName:settings.representativeName,legalAnnualMaximum:41.02,latePolicyEffectiveAt:settings.latePolicyEffectiveAt}));
  expect(()=>parseContractSettings({...settings,authorizeCurrentTerms:true})).toThrow(/autorización/);
  expect(()=>parseContractSettings({...settings,authorizeSignature:true})).toThrow(/condiciones/);
  expect(()=>parseContractSettings({...settings,authorizeSignature:true,authorizeCurrentTerms:true,representativeRut:"12345678-9"})).toThrow(/RUT/);
  expect(()=>validateSignature("data:image/svg+xml;base64,AAAA")).toThrow(/PNG/);
  const oversized=Buffer.from(signature.split(",")[1],"base64");oversized.writeUInt32BE(2001,16);
  expect(()=>validateSignature(`data:image/png;base64,${oversized.toString("base64")}`)).toThrow(/píxeles/);
 });
 it("conserva una firma existente solo con una nueva autorización explícita",()=>{
  expect(parseContractSettings({...settings,signature:undefined,authorizeSignature:true,authorizeCurrentTerms:true},settings).signature).toBe(signature);
 });
 it("prepara una sola copia cifrada de datos originales sin registrar venta, pago ni firma del cliente",async()=>{
  mocks.transaction.mockImplementation(async(sql:string)=>{
   if(sql.startsWith("SELECT s."))return{rows:[{user_id:"customer-qa",status:"active",signed_at:null,...sale,product_name:sale.productName,created_at:sale.createdAt,remaining:13500,firstName:"Cliente",lastName:"Prueba",email:"qa@example.invalid",rutCipher:protectClientValue("123456785","rut"),whatsappCipher:protectClientValue("+56911111111","whatsapp")}]};
   if(sql.includes("SELECT payload_enc FROM oc_client_contract_settings"))return{rows:[{payload_enc:protectClientValue(JSON.stringify(settings),"contract-settings")}]};
   if(sql.startsWith("SELECT number,due_date"))return{rows:[{number:1,due_date:"2026-12-02",amount:13500}]};
   return{rows:[]};
  });
  await prepareCommitment("sale-qa","owner-qa");
  const writes=mocks.transaction.mock.calls.filter(([sql])=>sql.startsWith("INSERT"));
  expect(writes).toHaveLength(1);expect(writes[0][0]).toContain("oc_client_commitments");
  const args=writes[0][1];expect(args[3]).not.toContain("Cliente");expect(args[3]).not.toContain("123456785");
  const document=JSON.parse(revealClientValue(args[3],"contract-document"));
  expect(document.customer.name).toBe("Cliente Prueba");expect(document.sale.credit).toBe(13500);expect(document.installments).toEqual([{number:1,dueDate:"2026-12-02",amount:13500}]);expect(document.lateAnnualRate).toBe(18);
  expect(createHash("sha256").update(JSON.stringify(document)).digest("hex")).toBe(args[4]);
  expect(mocks.transaction).toHaveBeenLastCalledWith("COMMIT");expect(mocks.release).toHaveBeenCalled();
 });
 it("un reintento conserva el documento existente aunque cambien los datos de la ficha o configuración",async()=>{
  const original=JSON.stringify({representative:{name:"Original"}}),row={payload_enc:protectClientValue(original,"contract-document"),content_hash:createHash("sha256").update(original).digest("hex")};
  mocks.transaction.mockImplementation(async(sql:string)=>({rows:sql.startsWith("SELECT s.")?[{user_id:"customer-qa",status:"active",signed_at:"2026-11-02"}]:sql.includes("SELECT payload_enc,content_hash")?[row]:[]}));
  await prepareCommitment("sale-qa","owner-qa");
  expect(mocks.transaction.mock.calls.some(([sql])=>sql.startsWith("INSERT")||sql.startsWith("UPDATE"))).toBe(false);
 });
 it("no sustituye un documento ya firmado ni crea uno para una venta anulada",async()=>{
  for(const state of [{status:"active",signed_at:"2026-11-02"},{status:"cancelled",signed_at:null}]){
   mocks.transaction.mockImplementation(async(sql:string)=>({rows:sql.startsWith("SELECT s.")?[{...state,user_id:"customer-qa"}]:[]}));
   await expect(prepareCommitment("sale-qa","owner-qa")).rejects.toThrow();expect(mocks.transaction).toHaveBeenLastCalledWith("ROLLBACK");
  }
 });
 it("vincula la consulta al propietario y no oculta errores de integridad",async()=>{
  mocks.query.mockResolvedValue({rows:[]});await expect(getStoredCommitment("sale-qa","other-customer")).resolves.toBeNull();expect(mocks.query.mock.calls[0][1]).toEqual(["sale-qa","other-customer"]);
  const clear=JSON.stringify({version:"test"});expect(()=>decodeCommitment({payload_enc:protectClientValue(clear,"contract-document"),content_hash:"0".repeat(64)})).toThrow(/integridad/);
 });
});
