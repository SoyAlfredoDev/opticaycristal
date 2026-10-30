import { afterEach,describe,expect,it,vi } from "vitest";
import { durableAction,operationSlot } from "./sales-client";
afterEach(()=>{sessionStorage.clear();vi.unstubAllGlobals();});
const body={action:"payment",requestKey:"opaque-only-id",saleId:"sale",amount:10000,paidOn:"2026-10-29",reference:"QA"};
describe("Recuperación durable del navegador",()=>{
 it("conserva solo el identificador ante error o sesión expirada y lo retira al completar",async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error:"Temporary"}),{status:503})).mockResolvedValueOnce(new Response(JSON.stringify({error:"Login"}),{status:401})).mockResolvedValueOnce(new Response(JSON.stringify({requestKey:body.requestKey}),{status:200})).mockResolvedValueOnce(new Response(JSON.stringify({id:"payment"}),{status:200}));vi.stubGlobal("fetch",fetcher);
  await expect(durableAction(body)).rejects.toThrow();expect(sessionStorage.getItem(operationSlot("payment"))).toBe(body.requestKey);expect(Object.values(sessionStorage)).toEqual([body.requestKey]);
  await expect(durableAction(body)).rejects.toThrow();expect(sessionStorage.getItem(operationSlot("payment"))).toBe(body.requestKey);
  expect(await durableAction(body)).toEqual({id:"payment"});expect(sessionStorage.length).toBe(0);
 });
 it("bloquea un segundo registro mientras se desconozca el resultado del primero",async()=>{
  sessionStorage.setItem(operationSlot("payment"),"other-operation");const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
  await expect(durableAction(body)).rejects.toThrow("pendiente");expect(fetcher).not.toHaveBeenCalled();
 });
});
