import type {CompanyResult} from "./types";

function normalize(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-CL").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ")}
function domain(value:string|null|undefined){if(!value)return"";try{return new URL(/^https?:\/\//i.test(value)?value:`https://${value}`).hostname.toLowerCase().replace(/^www\./,"")}catch{return""}}
export function prospectIdentity(value:Pick<CompanyResult,"name"|"address"|"website"> & {rut?:string|null;source?:string;providerId?:string}){
 const rut=value.rut?.toUpperCase().replace(/[^0-9K]/g,"");if(rut)return`rut:${rut}`;
 const name=normalize(value.name),site=domain(value.website);if(site&&!/(^|\.)(facebook\.com|instagram\.com|linkedin\.com|google\.com|google\.cl|linktr\.ee|sites\.google\.com|wixsite\.com|wordpress\.com)$/.test(site))return`name-domain:${name}|${site}`;
 const address=normalize(value.address??"");return address?`name-address:${name}|${address}`:value.providerId?`provider:${value.source||""}|${value.providerId}`:`name:${name}`;
}

export function deduplicateCompanies(companies:CompanyResult[]){const unique=new Map<string,CompanyResult>();for(const company of companies){const key=prospectIdentity(company),existing=unique.get(key);if(!existing){unique.set(key,{...company,categories:[...company.categories]});continue}unique.set(key,{...existing,address:existing.address??company.address,website:existing.website??company.website,phone:existing.phone??company.phone,mapsUrl:existing.mapsUrl??company.mapsUrl,categories:[...new Set([...existing.categories,...company.categories])],emails:[...new Set([...(existing.emails||[]),...(company.emails||[])])],socialLinks:[...new Set([...(existing.socialLinks||[]),...(company.socialLinks||[])])],evidence:[...(existing.evidence||[]),...(company.evidence||[])],employeeEstimate:existing.employeeEstimate??company.employeeEstimate,employeeEstimateSource:existing.employeeEstimateSource??company.employeeEstimateSource})}return[...unique.values()]}
