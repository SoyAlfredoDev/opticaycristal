import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {buildOverpassQuery,buildStructuredOverpassQuery,interpretSearch,mergeSearchIntents,parseSearchIntent,searchCompanies,searchCompaniesByFilters} from "./search";
import {getCommercialFit} from "./types";

describe("radar company search",()=>{
 beforeEach(()=>{vi.stubEnv("RADAR_AI_API_KEY","");vi.stubEnv("RADAR_AI_BASE_URL","");vi.stubEnv("RADAR_AI_MODEL","");vi.stubEnv("OVERPASS_API_URL","https://overpass.example/api/interpreter")});
 afterEach(()=>vi.unstubAllEnvs());

 it("classifies company potential without excluding small businesses",()=>{
  expect(getCommercialFit(1)).toBe("convenio_bajo");expect(getCommercialFit(5)).toBe("convenio");expect(getCommercialFit(20)).toBe("convenio");expect(getCommercialFit(21)).toBe("ambas");expect(getCommercialFit(null)).toBe("por_clasificar");
 });

 it("extracts rubro, comuna and employee threshold without treating estimates as facts",async()=>{
  const query="Buscar empresas de transporte en Santiago con más de 30 trabajadores";
  expect(parseSearchIntent(query)).toMatchObject({category:"transport",location:"Santiago",employeeThreshold:30});
  const criteria=await interpretSearch(query);
  expect(criteria.query).toBe(query);
  expect(criteria.explanation).toContain("no verificable en OpenStreetMap");
 });

 it("uses AI normalization to clarify a vague category while preserving original location and employee criteria",()=>{
  expect(mergeSearchIntents("organizaciones que puedan requerir una solución preventiva en Santiago con más de 30 trabajadores","empresas de transporte en Quilicura")).toMatchObject({category:"transport",location:"Santiago",employeeThreshold:30});
 });

 it("builds a bounded Overpass query for the selected comuna and business tags",()=>{
  const intent=parseSearchIntent("empresas de transporte en Quilicura");
  const query=buildOverpassQuery(intent,{south:-33.4,west:-70.8,north:-33.3,east:-70.7});
  expect(query).toContain('nwr(-33.4,-70.8,-33.3,-70.7)');
  expect(query).toContain('"office"="logistics"');
  expect(query).toContain(');\nout center tags;');
  expect(query).toContain("out center tags;");
 });

 it("maps only returned OSM records and preserves source identifiers",async()=>{
  const polygon={type:"Polygon",coordinates:[[[-70.8,-33.4],[-70.7,-33.4],[-70.7,-33.3],[-70.8,-33.3],[-70.8,-33.4]]]};
  const fetchMock=vi.fn()
   .mockResolvedValueOnce(Response.json([{boundingbox:["-33.4","-33.3","-70.8","-70.7"],geojson:polygon}]))
   .mockResolvedValueOnce(Response.json({elements:[{type:"node",id:8241,lat:-33.36,lon:-70.73,tags:{name:"Transportes Ejemplo",office:"logistics",phone:"+56 2 2000 0000",website:"https://example.cl"}}]}));
  vi.stubGlobal("fetch",fetchMock);
  const results=await searchCompanies(`empresas de transporte en Quilicura OSM-${Date.now()}`);
  expect(results).toHaveLength(1);
  expect(results[0]).toMatchObject({providerId:"osm:node:8241",name:"Transportes Ejemplo",phone:"+56 2 2000 0000",website:"https://example.cl/",source:"OpenStreetMap · Overpass"});
  expect(fetchMock).toHaveBeenCalledTimes(2);
 });

 it("builds a structured regional industry query, including a safe custom rubro",()=>{
  const bounds={south:-33.6,west:-71,north:-33.2,east:-70.5};
  expect(buildStructuredOverpassQuery({region:"Metropolitana de Santiago",industry:"transport"},bounds)).toContain('["office"~"^(logistics|transport|shipping)$"]');
  expect(buildStructuredOverpassQuery({region:"Metropolitana de Santiago",industry:"transport"},bounds)).toContain('nwr(-33.6,-71,-33.2,-70.5)');
  expect(buildStructuredOverpassQuery({region:"Metropolitana de Santiago",industry:"other",otherIndustry:"solar.*"},bounds)).toContain("solar\\\\.\\\\*");
 });

 it("returns more than 100 matching businesses when the provider supplies them",async()=>{
  const polygon={type:"Polygon",coordinates:[[[-71,-33.6],[-70.5,-33.6],[-70.5,-33.2],[-71,-33.2],[-71,-33.6]]]};
  const elements=Array.from({length:130},(_,i)=>({type:"node" as const,id:9000+i,lat:-33.4,lon:-70.8,tags:{name:`Empresa ${i+1}`}}));
  vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(Response.json([{boundingbox:["-33.6","-33.2","-71","-70.5"],geojson:polygon}])).mockResolvedValueOnce(Response.json({elements})));
  const result=await searchCompaniesByFilters({region:"Valparaíso",industry:"company"});
  expect(result.companies).toHaveLength(130);expect(result.warning).toBeNull();
 });

 it("keeps small companies and companies without a published employee count",async()=>{
  const polygon={type:"Polygon",coordinates:[[[-71,-33.6],[-70.5,-33.6],[-70.5,-33.2],[-71,-33.2],[-71,-33.6]]]};
  const fetchMock=vi.fn()
   .mockResolvedValueOnce(Response.json([{boundingbox:["-33.6","-33.2","-71","-70.5"],geojson:polygon}]))
   .mockImplementation(async()=>Response.json({elements:[
    {type:"node",id:1101,lat:-33.4,lon:-70.8,tags:{name:"Taller 19",employees:"19"}},
    {type:"node",id:1102,lat:-33.4,lon:-70.8,tags:{name:"Taller 20",staff_count:"20"}},
    {type:"node",id:1103,lat:-33.4,lon:-70.8,tags:{name:"Taller sin dato"}},
   ]}));
  vi.stubGlobal("fetch",fetchMock);
  const results=await searchCompaniesByFilters({region:"Metropolitana de Santiago",industry:"automotive"});
  expect(results.companies.map(item=>item.name)).toEqual(["Taller 19","Taller 20","Taller sin dato"]);
  expect(results.companies[0]).toMatchObject({employeeEstimate:19,employeeEstimateSource:"OpenStreetMap · etiqueta de dotación"});
  expect(results.partial).toBe(false);
  expect(fetchMock).toHaveBeenCalledTimes(2);
 });
});
