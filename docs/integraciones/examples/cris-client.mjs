import {createHash,createHmac,randomBytes} from 'node:crypto';
export function crisRequest(action,body,{idempotencyKey,baseUrl=process.env.CRIS_API_BASE_URL||'https://opticaycristal.cl',token=process.env.CRIS_API_TOKEN,signingSecret=process.env.CRIS_SENDER_SIGNING_SECRET}={}){
 if(!/^[a-z]+(?:-[a-z]+)*$/.test(action))throw Error('Invalid action');
 const base=new URL(baseUrl);const local=['localhost','127.0.0.1'].includes(base.hostname)&&process.env.CRIS_ALLOW_LOCAL==='true';
 if(base.username||base.password||base.search||base.hash||base.pathname!=='/'||(!local&&(base.origin!=='https://opticaycristal.cl')))throw Error('Unapproved API origin');
 if(!token||!/^[A-Za-z0-9_-]{43,128}$/.test(token))throw Error('Server credential missing');
 const url=new URL('/api/integraciones/v1/cris/'+action,base),raw=JSON.stringify(body);
 const headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'};
 if(action!=='consultar-comercial'){
  if(!signingSecret||!/^[A-Za-z0-9_-]{43,128}$/.test(signingSecret))throw Error('Sender adapter credential missing');
  const timestamp=String(Math.floor(Date.now()/1000)),nonce=randomBytes(24).toString('base64url');
  headers['X-Cris-Timestamp']=timestamp;headers['X-Cris-Nonce']=nonce;
  headers['X-Cris-Signature']=createHmac('sha256',signingSecret).update([timestamp,nonce,'POST',url.pathname,createHash('sha256').update(raw).digest('hex')].join('\n')).digest('hex');
 }
 if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey;
 return{url,raw,headers};
}
export async function crisPost(action,body,options={}){
 const {url,raw,headers}=crisRequest(action,body,options);
 const response=await fetch(url,{method:'POST',headers,body:raw,redirect:'error',signal:AbortSignal.timeout(20000)});
 const result=await response.json();
 if(!response.ok){const error=Error('Cris API request failed');error.status=response.status;error.requestId=/^[a-f0-9-]{36}$/.test(result.requestId||'')?result.requestId:null;const codes=new Set(['INVALID_INPUT','INVALID_RUT','INVALID_WHATSAPP','INVALID_CURSOR','UNSUPPORTED_DOCUMENT','CONSENT_REQUIRED','IDEMPOTENCY_REQUIRED','UNAUTHORIZED','SCOPE_REQUIRED','SERVER_ONLY','SENDER_PROOF_REQUIRED','INVALID_SENDER_PROOF','CONTACT_NOT_MATCHED','RESOURCE_NOT_FOUND','NOT_FOUND','REPLAY_DETECTED','IDEMPOTENCY_CONFLICT','ATTACHMENT_EXPIRED','PAYLOAD_TOO_LARGE','UNSUPPORTED_MEDIA_TYPE','INVALID_ATTACHMENT','RATE_LIMITED','ATTACHMENT_LIMIT','NOT_CONFIGURED','COMMERCIAL_NOT_APPROVED','SOURCE_NOT_CONFIGURED','UNAVAILABLE']);error.code=codes.has(result.error?.code)?result.error.code:'INVALID_RESPONSE';error.retryAfter=response.headers.get('Retry-After');throw error;}
 return result; // Personal data: use deterministic server templates; never pass the whole result to an LLM.
}
