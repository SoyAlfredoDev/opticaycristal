import {describe,it,expect,vi,afterEach} from 'vitest';
const mock=vi.hoisted(()=>({send:vi.fn(async(message:unknown)=>({ok:Boolean(message),id:'test',error:null}))}));
vi.mock('@/lib/mail/resend',()=>({enviarConResend:mock.send}));
import {clientEmailContent,sendClientMail} from './mail';
afterEach(()=>vi.clearAllMocks());
describe('Correos corporativos de clientes',()=>{
 it('incluye logo, identificación tributaria y datos corporativos en HTML y texto',()=>{
  const m=clientEmailContent({to:'prueba@example.invalid',url:'https://opticaycristal.cl/api/clientes/auth/verify-email?token=example&callbackURL=%2Fmi-cuenta',kind:'verify'});
  expect(m.html).toContain('cid:logo-opticaycristal');expect(m.html).toContain('77.068.257-6');expect(m.html).toContain('Óptica y Cristal Limitada');expect(m.html).toContain('Huérfanos 713, local 18');expect(m.html).toContain('contacto@opticaycristal.cl');expect(m.html).toContain('token=example&amp;callbackURL=');expect(m.text).toContain('77.068.257-6');expect(m.html).toContain('24 horas');
 });
 it('diferencia recuperación y conserva el vencimiento de treinta minutos',()=>{const m=clientEmailContent({to:'prueba@example.invalid',url:'https://opticaycristal.cl/mi-cuenta/restablecer',kind:'reset'});expect(m.html).toContain('30 minutos');expect(m.html).toContain('Crear nueva contraseña');expect(m.html).not.toContain('Verificar mi correo');});
 it('activa el HTML corporativo después de desactivar el seguimiento del dominio',async()=>{await sendClientMail({to:'prueba@example.invalid',url:'https://opticaycristal.cl/mi-cuenta',kind:'verify'});expect(mock.send).toHaveBeenCalledWith(expect.objectContaining({html:expect.stringContaining('cid:logo-opticaycristal'),replyTo:'contacto@opticaycristal.cl'}));expect(mock.send.mock.calls[0][0]).not.toHaveProperty('textOnly');});
});

it('presenta el código temporal con identidad corporativa y sin enlace de verificación',async()=>{const {staffVerificationEmailContent}=await import('./mail');const result=staffVerificationEmailContent('0042');expect(result.html).toContain('0042');expect(result.html).toContain('10 minutos');expect(result.html).toContain('cid:logo-opticaycristal');expect(result.html).toContain('local 18');expect(result.html).not.toContain('href=""');expect(result.text).toContain('único uso');});
