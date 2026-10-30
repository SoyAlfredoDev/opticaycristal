import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('next/dynamic',()=>({default:()=>()=>null}));
vi.mock('next/navigation',()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
import {AuthForm} from './AuthForm';
afterEach(()=>vi.unstubAllGlobals());
describe('Mensajes de acceso y bienvenida',()=>{
 it.each(['login','register'] as const)('explica el crédito directo en %s con beneficios confirmados',mode=>{
  render(<AuthForm mode={mode}/>);expect(screen.getByRole('heading',{name:'La única óptica con crédito directo en Chile.'})).toBeVisible();for(const text of ['No consultamos DICOM.','No pedimos liquidaciones de sueldo.','No cobramos intereses.','Porque confiamos en nuestros clientes.'])expect(screen.getByText(text)).toBeVisible();expect(screen.queryByText(/Una mirada nueva/)).not.toBeInTheDocument();
 });
 it('usa el nombre ingresado y el cupo recibido sin cambiar la respuesta neutral ni enviar pruebas reales',async()=>{
  const fetcher=vi.fn(async()=>({ok:true,json:async()=>({message:'Registro procesado',welcome:{tierName:'Start',maxAmount:40000,maxPercent:30,maxInstallments:1}})}));vi.stubGlobal('fetch',fetcher);
  render(<AuthForm mode="register"/>);const first=screen.getByLabelText('Nombre');fireEvent.change(first,{target:{value:'Alfredo'}});fireEvent.change(screen.getByLabelText('Apellido'),{target:{value:'Prueba'}});fireEvent.change(screen.getByLabelText(/^Contraseña/,{selector:'input'}),{target:{value:'clave-de-prueba'}});fireEvent.change(screen.getByLabelText('Repite la contraseña'),{target:{value:'clave-de-prueba'}});fireEvent.submit(first.closest('form')!);
  expect(await screen.findByRole('heading',{name:'¡Gracias, Alfredo, por sumarte!'})).toBeVisible();await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));expect(screen.getByRole('status')).toHaveTextContent('Tu categoría es Start');expect(screen.queryByText('Revisa tu correo')).not.toBeInTheDocument();
 });
});
