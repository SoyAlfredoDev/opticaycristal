import {describe,expect,it} from "vitest";
import {extractWebsiteFacts} from "./website";
import {isPublicAddress,publicWebUrl,robotsAllows} from "./public-web";
import {assessCompany} from "./assessment";

describe("public website enrichment",()=>{
 it("keeps literal corporate facts and evidence, excludes personal inboxes and unrelated counts",()=>{
  const facts=extractWebsiteFacts('<p>Contamos con más de 1.200 colaboradores. Atendemos 450 clientes.</p><a href="mailto:ventas@empresa.cl">Ventas</a><a href="mailto:ana@empresa.cl">Ana</a><a href="tel:+56223456789">Llamar</a><a href="/contacto">Contacto</a><a href="https://otro.cl/nosotros">Otro</a>','https://empresa.cl/','2026-10-12T00:00:00Z');
  expect(facts.emails).toEqual(["ventas@empresa.cl"]);expect(facts.phones).toEqual(["+56223456789"]);expect(facts.employeeEstimate).toBe(1200);
  expect(facts.pages).toEqual(["https://empresa.cl/contacto"]);expect(facts.evidence).toContainEqual(expect.objectContaining({field:"employeeEstimate",url:"https://empresa.cl/",excerpt:"Contamos con más de 1.200 colaboradores"}));
 });
 it("does not guess worker counts from job adverts, company age, decimals or a missing figure",()=>{
  for(const text of ["20 años de experiencia y 500 clientes","30 trabajadores postulantes a vacantes","Somos 2,5 colaboradores","Somos una empresa grande"]){expect(extractWebsiteFacts(text,'https://empresa.cl/','2026-10-12').employeeEstimate).toBeNull()}
 });
 it("extracts a company-name mailbox and a Chilean corporate phone printed without links",()=>{
  const facts=extractWebsiteFacts('<footer>(56 2) 2718 5800 · kipreos@kipreos.cl</footer>','https://kipreos.cl/','2026-10-12');
  expect(facts.emails).toEqual(["kipreos@kipreos.cl"]);expect(facts.phones).toEqual(["+56227185800"]);
 });
 it("blocks internal, link-local, reserved and mapped IPv6 addresses",()=>{
  for(const value of ["127.0.0.1","10.1.2.3","169.254.169.254","100.64.0.1","192.168.1.1","::1","::ffff:127.0.0.1","fd00::1","2001:db8::1"]){expect(isPublicAddress(value)).toBe(false)}
  expect(isPublicAddress("8.8.8.8")).toBe(true);expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  expect(()=>publicWebUrl("file:///secret")).toThrow();expect(()=>publicWebUrl("https://localhost:444")).toThrow();expect(()=>publicWebUrl("https://user:password@example.com")).toThrow();
 });
 it("honors robots rules with specific agents, longest match and wildcards",()=>{
  expect(robotsAllows('User-agent: *\nDisallow: /','/contacto')).toBe(false);
  const text='User-agent: *\nDisallow: /privado\nAllow: /privado/contacto\nDisallow: /*?';
  expect(robotsAllows(text,'/privado')).toBe(false);expect(robotsAllows(text,'/privado/contacto')).toBe(true);expect(robotsAllows(text,'/contacto?x=1')).toBe(false);
  expect(robotsAllows('User-agent: *\nDisallow: /\nUser-agent: OpticaCristalRadar\nAllow: /','/')).toBe(true);
 });
 it("prioritizes channels while preserving unknown and small-company modalities",()=>{
  const company={providerId:"osm:node:1",name:"Company",address:null,website:null,phone:null,mapsUrl:null,categories:[],source:"OSM",fetchedAt:"2026-10-12"};
  expect(assessCompany(company)).toMatchObject({score:0,commercialFit:"por_clasificar"});expect(assessCompany({...company,employeeEstimate:3}).commercialFit).toBe("convenio_bajo");
  expect(assessCompany({...company,employeeEstimate:21,phone:"+56223456789",emails:["ventas@empresa.cl"]}).score).toBeGreaterThan(assessCompany(company).score);
 });
});
