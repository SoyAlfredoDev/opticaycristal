import {describe,expect,it} from "vitest";
import {deduplicateCompanies,prospectIdentity} from "./identity";

describe("radar prospect identity",()=>{
 it("uses a normalized Chilean tax ID when available",()=>{
  expect(prospectIdentity({name:"Empresa A",address:"Calle 1",website:null,rut:"76.123.456-7"})).toBe("rut:761234567");
 });
 it("recognizes the same name and address across source spellings",()=>{
  const first=prospectIdentity({name:"Comercial Ñuñoa SpA",address:"Av. Perú 12, Santiago",website:null});
  const second=prospectIdentity({name:"COMERCIAL NUNOA SPA",address:"Av Peru 12 Santiago",website:null});
  expect(first).toBe(second);
 });
 it("uses the company domain with its name when the address is missing",()=>{
  expect(prospectIdentity({name:"Empresa Uno",address:null,website:"https://www.empresa.cl/contacto"})).toBe("name-domain:empresa uno|empresa.cl");
 });
 it("merges branches with the same business name and website",()=>{
  const companies=deduplicateCompanies([
   {providerId:"osm:node:1",name:"Pullman Go",address:null,website:"https://pullmango.cl/",phone:null,mapsUrl:null,categories:["office: logistics"],source:"OSM",fetchedAt:"2026-01-01"},
   {providerId:"osm:node:2",name:"PULLMAN GO",address:"Terminal",website:"https://www.pullmango.cl/",phone:"+56 2 2000 0000",mapsUrl:"https://osm.org/node/2",categories:["amenity: bus_station"],source:"OSM",fetchedAt:"2026-01-02"},
  ]);
  expect(companies).toHaveLength(1);
  expect(companies[0]).toMatchObject({phone:"+56 2 2000 0000",address:"Terminal",categories:["office: logistics","amenity: bus_station"]});
 });
 it("keeps separate locations when only a shared name is known",()=>{
  const companies=deduplicateCompanies([
   {providerId:"osm:node:1",name:"Starken",address:"Avenida Central 1",website:null,phone:null,mapsUrl:null,categories:["office: transport"],source:"OpenStreetMap · Overpass",fetchedAt:"2026-01-01"},
   {providerId:"osm:node:2",name:"STARKEN",address:"Calle Norte 2",website:null,phone:"+56 2 2000 0000",mapsUrl:null,categories:["office: logistics"],source:"OpenStreetMap · Overpass",fetchedAt:"2026-01-02"},
  ]);
  expect(companies).toHaveLength(2);
  expect(companies[1]).toMatchObject({address:"Calle Norte 2",phone:"+56 2 2000 0000"});
 });
});
