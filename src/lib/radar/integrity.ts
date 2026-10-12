import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";
import type {CompanyResult} from "./types";
function payload(c:CompanyResult){return JSON.stringify([c.providerId,c.name,c.address,c.website,c.phone,c.mapsUrl,c.categories,c.source,c.fetchedAt,c.employeeEstimate??null,c.employeeEstimateSource??null,c.region??null,c.emails??[],c.socialLinks??[],c.evidence??[]])}
function digest(c:CompanyResult){const secret=process.env.SESSION_SECRET?.trim();if(!secret||secret.length<32)throw new Error("Falta SESSION_SECRET para firmar los resultados de búsqueda.");return createHmac("sha256",secret).update(payload(c)).digest("base64url")}
export function signResult(c:CompanyResult){return digest(c)}
export function verifyResult(c:CompanyResult,proof:string){try{const a=Buffer.from(digest(c)),b=Buffer.from(proof);return a.length===b.length&&timingSafeEqual(a,b)}catch{return false}}
