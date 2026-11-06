import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {WhatsappVerification} from './WhatsappVerification';
const pending=()=>({requestId:'00000000-0000-4000-8000-000000000001',expiresAt:new Date(Date.now()+300000).toISOString(),resendAfterSeconds:60});
const json=(body:unknown,status=200,headers?:HeadersInit)=>new Response(JSON.stringify(body),{status,headers});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
async function start(){fireEvent.click(await screen.findByRole('button',{name:'Enviar código por WhatsApp'}));return screen.findByLabelText('Código de 4 caracteres');}
it('envía al cliente y solo confirma después de validar el código en Perfil, aceptando minúsculas',async()=>{
 const verified=vi.fn(),p=pending();const fetcher=vi.fn().mockResolvedValueOnce(json({available:true,verified:false,pending:null})).mockResolvedValueOnce(json({...p,verified:false})).mockResolvedValueOnce(json({verified:true}));vi.stubGlobal('fetch',fetcher);
 render(<WhatsappVerification available verified={false} onVerified={verified}/>);const input=await start();expect(verified).not.toHaveBeenCalled();expect(screen.queryByRole('link')).not.toBeInTheDocument();
 fireEvent.change(input,{target:{value:'a7k2'}});fireEvent.click(screen.getByRole('button',{name:'Validar código'}));expect(await screen.findByText('WhatsApp verificado')).toBeInTheDocument();expect(verified).toHaveBeenCalledTimes(1);
 expect(fetcher.mock.calls[2][0]).toBe('/api/clientes/whatsapp/confirmar');expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({requestId:p.requestId,code:'a7k2'});
});
it('restaura un código pendiente sin enviar otro mensaje ni consultar continuamente',async()=>{
 const fetcher=vi.fn().mockResolvedValue(json({available:true,verified:false,pending:pending()}));vi.stubGlobal('fetch',fetcher);render(<WhatsappVerification available verified={false}/>);
 const input=await screen.findByLabelText('Código de 4 caracteres');expect(input).toHaveAttribute('maxlength','4');expect(input).toHaveAttribute('autocomplete','one-time-code');expect(screen.getByRole('button',{name:'Reenviar en 60 s'})).toBeDisabled();
 for(let i=0;i<10;i++)fireEvent(window,new Event('focus'));expect(fetcher).toHaveBeenCalledTimes(1);
});
it('sin conexión habilitada no ofrece un enlace inverso ni envía mensajes',()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);render(<WhatsappVerification verified={false}/>);expect(fetcher).not.toHaveBeenCalled();expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(screen.getByText(/no está disponible/)).toBeInTheDocument();});
it('bloquea el reenvío con Retry-After y muestra el error',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(json({pending:null})).mockResolvedValueOnce(json({error:'Espera antes de solicitar otro código.'},429,{'retry-after':'90'})));
 render(<WhatsappVerification available verified={false}/>);fireEvent.click(await screen.findByRole('button',{name:'Enviar código por WhatsApp'}));expect(await screen.findByRole('button',{name:'Reenviar en 90 s'})).toBeDisabled();expect(screen.getByRole('alert')).toHaveTextContent('Espera');
});
it('un código incorrecto o un fallo de red no marca el número verificado',async()=>{
 const verified=vi.fn();vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(json({pending:pending()})).mockResolvedValueOnce(json({error:'Código incorrecto.'},400)));
 render(<WhatsappVerification available verified={false} onVerified={verified}/>);fireEvent.change(await screen.findByLabelText('Código de 4 caracteres'),{target:{value:'a7k2'}});fireEvent.click(screen.getByRole('button',{name:'Validar código'}));expect(await screen.findByRole('alert')).toHaveTextContent('incorrecto');expect(verified).not.toHaveBeenCalled();
});
it('impide dobles clics mientras se envía',async()=>{
 let finish!:(r:Response)=>void;const fetcher=vi.fn().mockResolvedValueOnce(json({pending:null})).mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',fetcher);
 render(<WhatsappVerification available verified={false}/>);const button=await screen.findByRole('button',{name:'Enviar código por WhatsApp'});fireEvent.click(button);fireEvent.click(button);expect(fetcher).toHaveBeenCalledTimes(2);finish(json(pending()));await screen.findByLabelText('Código de 4 caracteres');
});
it('no permite restaurar una solicitud vencida',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(json({pending:{...pending(),expiresAt:'2020-01-01'}})));render(<WhatsappVerification available verified={false}/>);await screen.findByRole('button',{name:'Enviar código por WhatsApp'});expect(screen.queryByLabelText('Código de 4 caracteres')).not.toBeInTheDocument();});
