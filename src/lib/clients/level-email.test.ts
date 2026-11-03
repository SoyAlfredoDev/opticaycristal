import {expect,it} from 'vitest';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {levelUpgradeEmailContent,type LevelUpgradeMail} from './level-email';
const data:LevelUpgradeMail={to:'persona@example.invalid',firstName:'Valentina',previousName:'VIP',tier:{code:'premium',name:'Premium',maxAmount:80000,maxPercent:60,maxInstallments:3},capacity:80000,available:80000,outstanding:0,emailVerified:true,changedAt:'2026-11-02T15:00:00Z'};
it('felicita con porcentaje, tope, pie y ejemplo coherentes y ofrece texto alternativo',async()=>{
 const mail=levelUpgradeEmailContent(data);
 expect(mail.title).toContain('Premium');for(const amount of ['$80.000','$48.000','$32.000','60%']){expect(mail.html).toContain(amount);expect(mail.text).toContain(amount);}
 expect(mail.html).toContain('lang="es"');expect(mail.html.match(/<h1/g)).toHaveLength(1);expect(mail.html).toContain('alt="Óptica &amp; Cristal"');expect(mail.html).toContain('no un descuento');expect(mail.text).toContain('devuelves el monto financiado');
 expect(Buffer.byteLength(mail.html,'utf8')).toBeLessThan(102400);
 if(process.env.UPGRADE_QA_OUTPUT){await mkdir(process.env.UPGRADE_QA_OUTPUT,{recursive:true});const logo=(await readFile('public/images/home/oc-logo-oficial.png')).toString('base64');await writeFile(process.env.UPGRADE_QA_OUTPUT+'/felicitacion-premium.html',mail.html.replaceAll('cid:logo-opticaycristal','data:image/png;base64,'+logo));await writeFile(process.env.UPGRADE_QA_OUTPUT+'/felicitacion-premium.txt',mail.text);}
});
it('escapa nombres y no convierte datos de clientes en HTML ejecutable',()=>{
 const mail=levelUpgradeEmailContent({...data,firstName:'<script>alert(1)</script>'});expect(mail.html).not.toContain('<script>');expect(mail.html).toContain('&lt;script&gt;');
});

it('mantiene los tokens corporativos, el logo original y los canales oficiales de contacto',()=>{
 const mail=levelUpgradeEmailContent(data);
 for(const color of ['#681c30','#f4e7d4','#9bcb5a','#3d0b1a'])expect(mail.html).toContain(color);
 expect(mail.html).not.toMatch(/#c9ed9a|#142b3a|#00674d|#536574/);
 expect(mail.html).toContain('cid:logo-opticaycristal');
 expect(mail.html).toContain('mailto:contacto@opticaycristal.cl');expect(mail.html).toContain('https://wa.me/');
 expect(mail.html).toContain('Tu mirada, nuestra prioridad.');expect(mail.text).toContain('Tu mirada, nuestra prioridad.');
 expect(mail.html).toContain('<!--[if mso]>');expect(mail.html).toContain('width="580"');
});
it('mantiene un disponible de cero y la explicación de la deuda sin presentar el máximo como utilizable',async()=>{
 const mail=levelUpgradeEmailContent({...data,capacity:70000,available:0,outstanding:10000});
 expect(mail.html).toContain('cuando pagues el saldo pendiente');expect(mail.text).toContain('Disponible para utilizar al preparar este correo: $0');
 if(process.env.UPGRADE_QA_OUTPUT){const logo=(await readFile('public/images/home/oc-logo-oficial.png')).toString('base64');await writeFile(process.env.UPGRADE_QA_OUTPUT+'/felicitacion-con-deuda.html',mail.html.replaceAll('cid:logo-opticaycristal','data:image/png;base64,'+logo));}
});
it('prepara casos extremos para revisar el ajuste de nombres y montos en móvil',async()=>{
 const mail=levelUpgradeEmailContent({...data,firstName:'Valentina'.repeat(8),tier:{...data.tier,maxAmount:1000000000},capacity:1000000000,available:1000000000});
 expect(mail.html).toContain('overflow-wrap:anywhere');
 if(process.env.UPGRADE_QA_OUTPUT){const logo=(await readFile('public/images/home/oc-logo-oficial.png')).toString('base64');await writeFile(process.env.UPGRADE_QA_OUTPUT+'/felicitacion-caso-largo.html',mail.html.replaceAll('cid:logo-opticaycristal','data:image/png;base64,'+logo));}
});
