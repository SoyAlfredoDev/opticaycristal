// @vitest-environment node
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {sendWhatsappOtpMessage} from './whatsapp-otp-provider';
beforeEach(()=>{vi.stubEnv('WHATSAPP_OTP_ENABLED','true');vi.stubEnv('KAPSO_API_KEY','synthetic-key');vi.stubEnv('KAPSO_PHONE_NUMBER_ID','1368248166370894');vi.stubEnv('KAPSO_OTP_TEMPLATE_NAME','oc_verificacion_whatsapp_v1');vi.stubEnv('KAPSO_OTP_TEMPLATE_LANGUAGE','es_CL');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('envía una plantilla de autenticación con el mismo código en cuerpo y botón, sin otros datos del cliente',async()=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json({messages:[{id:'wamid.synthetic'}]}));vi.stubGlobal('fetch',fetcher);
 expect(await sendWhatsappOtpMessage('+56912345678','A7K2')).toEqual({accepted:true,id:'wamid.synthetic',uncertain:false});
 expect(fetcher).toHaveBeenCalledTimes(1);const [url,options]=fetcher.mock.lastCall!;expect(url).toBe('https://api.kapso.ai/meta/whatsapp/v24.0/1368248166370894/messages');expect(options.redirect).toBe('error');
 const body=JSON.parse(options.body);expect(body.to).toBe('56912345678');expect(body.type).toBe('template');expect(body.template.language.code).toBe('es_CL');expect(body.template.components).toEqual([{type:'body',parameters:[{type:'text',text:'A7K2'}]},{type:'button',sub_type:'otp',index:'0',parameters:[{type:'text',text:'A7K2'}]}]);
 expect(Object.keys(body).sort()).toEqual(['messaging_product','recipient_type','template','to','type']);
});
it.each([400,401,429,500])('rechaza HTTP %s sin reflejar errores privados ni reintentar',async status=>{const fetcher=vi.fn().mockResolvedValue(Response.json({error:'private provider details'},{status}));vi.stubGlobal('fetch',fetcher);expect(await sendWhatsappOtpMessage('+56912345678','A7K2')).toEqual({accepted:false,id:null,uncertain:status>=500||status===429});expect(fetcher).toHaveBeenCalledTimes(1);});
it('un timeout o respuesta sin ID es incierto y no causa un segundo envío',async()=>{const fetcher=vi.fn().mockRejectedValue(Error('timeout'));vi.stubGlobal('fetch',fetcher);expect((await sendWhatsappOtpMessage('+56912345678','A7K2')).uncertain).toBe(true);expect(fetcher).toHaveBeenCalledTimes(1);fetcher.mockResolvedValue(Response.json({}));expect((await sendWhatsappOtpMessage('+56912345678','A7K2')).accepted).toBe(false);});
it('falla cerrado sin configuración o ante destino/código inválido',async()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);for(const code of ['1234','ABCD','A7K22','Ａ7K2'])await expect(sendWhatsappOtpMessage('+56912345678',code)).rejects.toThrow();vi.stubEnv('WHATSAPP_OTP_ENABLED','false');await expect(sendWhatsappOtpMessage('+56912345678','A7K2')).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();});
