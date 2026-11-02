import { protectClientValue } from "@/lib/clients/privacy";
/** Explicit legacy-rate fixture. Never used by application code or production seeds. */
export async function seedLegacyContractSettings(db:{query:(sql:string,values?:unknown[])=>Promise<unknown>}){
 const settings={representativeName:"Representante Prueba",representativeRut:"123456785",signature:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NwAAAABJRU5ErkJggg==",paymentMethod:"both",webpayUrl:null,legalAnnualMaximum:41.02,latePolicyEffectiveAt:"2100-01-01T00:00:00.000Z"};
 await db.query("INSERT INTO oc_client_contract_settings(id,payload_enc,updated_by) VALUES(true,$1,'qa-owner') ON CONFLICT(id) DO UPDATE SET payload_enc=EXCLUDED.payload_enc",[protectClientValue(JSON.stringify(settings),"contract-settings")]);
}
