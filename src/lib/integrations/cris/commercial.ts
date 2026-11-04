import 'server-only';
import {brand,store,storeHours} from '@/components/site/content';
import {CONVENIO,convenioFaqs} from '@/lib/convenios';
import {fail,digest} from './security';
/** Only existing public facts. Missing policies cannot be completed by a model. */
export function commercialInformation(){
 const content={brand:{name:brand.name,whatsapp:brand.phone},location:store.fullAddress,timeZone:'America/Santiago',regularHours:storeHours,exceptions:null,openNow:null,pricesFrom:null,promotions:null,warranty:null,delivery:null,shipping:null,companies:{...CONVENIO,policies:convenioFaqs.map(f=>({question:f.question,answer:f.answer}))}};
 if(digest(JSON.stringify(content))!=='68400f58d344e84768f20f3c650eee897b2cac4c3ccb9d69e5789ef02b60fbc8')fail('COMMERCIAL_NOT_APPROVED','La fuente comercial cambió y requiere revisión.',503);
 return {version:`public-fbff703-${digest(JSON.stringify(content)).slice(0,16)}`,approvalBasis:'EXISTING_PUBLISHED_CONTENT',effectiveFrom:null,effectiveUntil:null,content,pending:['pricesFrom','promotions','warranty','delivery','shipping','exceptions','openNow'],sources:['src/components/site/content.ts','src/components/clients/CustomerOptic.tsx (published hours)','src/lib/convenios.ts'],requiresHumanConfirmation:['exceptions','booking','companyAgreement','shipping','delivery']};
}
