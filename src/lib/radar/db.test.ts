import {beforeEach,describe,expect,it,vi} from "vitest";

const mock=vi.hoisted(()=>({queries:[] as string[]}));
vi.mock("server-only",()=>({}));
vi.mock("@neondatabase/serverless",()=>({neon:()=>async(strings:TemplateStringsArray,...values:unknown[])=>{
 const query=strings.reduce((text,part,index)=>text+part+(index<values.length?`$${index+1}`:""),"");
 mock.queries.push(query);
 if(query.startsWith("INSERT INTO radar_prospects"))return[{id:"p1",provider_id:"osm:node:101",name:"Empresa real",address:null,website:null,phone:null,mapsUrl:null,categories:[],source:"OpenStreetMap · Overpass",fetched_at:"2026-10-12T00:00:00.000Z",stage:"nuevo",notes:"",employee_estimate:null,employee_estimate_source:null,commercial_fit:"por_clasificar",created_at:"2026-10-12T00:00:00.000Z",inserted:true}];
 return[];
}}));
import {saveProspectWithStatus} from "./db";

describe("radar persistence",()=>{
 beforeEach(()=>{mock.queries.length=0;vi.stubEnv("DATABASE_URL","postgresql://test.invalid/radar")});
 it("uses an explicit PostgreSQL conflict target and inserts a verifiable prospect",async()=>{
  const result=await saveProspectWithStatus({providerId:"osm:node:101",name:"Empresa real",address:null,website:null,phone:null,mapsUrl:null,categories:[],source:"OpenStreetMap · Overpass",fetchedAt:"2026-10-12T00:00:00.000Z"});
  const insert=mock.queries.find(query=>query.startsWith("INSERT INTO radar_prospects"));
  expect(insert).toContain("ON CONFLICT (source,provider_id) DO NOTHING");
  expect(insert).not.toContain("ON CONFLICT DO UPDATE");
  expect(result).toMatchObject({created:true,prospect:{id:"p1",providerId:"osm:node:101"}});
 });
});
