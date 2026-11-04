// @vitest-environment node
import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import Ajv from 'ajv';
it('resuelve todos los esquemas y valida ejemplos de consumo y respuestas',async()=>{
 const spec=JSON.parse(await readFile('docs/integraciones/openapi-cris.json','utf8'));
 expect(spec.openapi).toBe('3.1.0');expect(Object.keys(spec.paths)).toHaveLength(17);
 for(const operations of Object.values(spec.paths)){
  const operation=(operations as {post?:{requestBody?:{content:Record<string,{schema:object;example:unknown}>};responses:Record<string,{content?:Record<string,{schema:object;example?:unknown}>}>}}).post;
  if(!operation)continue;
  const items=[...Object.values(operation.requestBody?.content??{}),...Object.values(operation.responses).flatMap(r=>Object.values(r.content??{}))];
  for(const item of items){const validate=new Ajv({allErrors:true,unknownFormats:'ignore'}).compile({components:spec.components,...item.schema});if('example'in item)expect(validate(item.example),JSON.stringify(validate.errors)).toBe(true);}
 }
});
