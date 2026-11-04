// curl example with headers in a private temporary file: no token in process arguments.
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';
import {crisRequest} from './cris-client.mjs';
const[action,bodyFile,idempotencyKey]=process.argv.slice(2);if(!action||!bodyFile)throw Error('Usage: node cris-curl.mjs ACTION BODY.json [IDEMPOTENCY_KEY]');
const body=JSON.parse(await readFile(bodyFile,'utf8'));const r=crisRequest(action,body,{idempotencyKey});const dir=await mkdtemp(join(tmpdir(),'cris-curl-'));
try{const headerPath=join(dir,'headers'),bodyPath=join(dir,'body');await writeFile(headerPath,Object.entries(r.headers).map(([k,v])=>k+': '+v).join('\n'),{mode:0o600});await writeFile(bodyPath,r.raw,{mode:0o600});const result=spawnSync('curl',['--silent','--fail-with-body','--show-error','--max-time','20','--request','POST','--header','@'+headerPath,'--data-binary','@'+bodyPath,r.url.href],{stdio:'inherit'});process.exitCode=result.status??1;}finally{await rm(dir,{recursive:true,force:true});}
