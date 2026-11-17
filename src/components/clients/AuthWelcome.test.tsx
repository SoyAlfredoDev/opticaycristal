import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('next/dynamic',()=>({default:()=>()=>null}));
vi.mock('next/navigation',()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
import {AuthForm} from './AuthForm';
afterEach(()=>vi.unstubAllGlobals());
describe('Mensajes de acceso y bienvenida',()=>{
 it('explica el crédito directo en el acceso con beneficios confirmados',()=>{
  render(<AuthForm mode="login"/>);expect(screen.getByRole('heading',{name:'La única óptica con crédito directo en Chile.'})).toBeVisible();for(const text of ['No consultamos DICOM.','No pedimos liquidaciones de sueldo.','No cobramos intereses.','Porque confiamos en nuestros clientes.'])expect(screen.getByText(text)).toBeVisible();expect(screen.queryByText(/Una mirada nueva/)).not.toBeInTheDocument();
 });
 it('muestra el formulario antes de la galería y abre el recorrido al solicitarlo',()=>{
  render(<AuthForm mode="register"/>);
  const submit=screen.getByRole('button',{name:'Crear mi cuenta'});
  const gallery=screen.getByRole('region',{name:'Conoce nuestra óptica'});
  expect(submit.compareDocumentPosition(gallery) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(gallery.querySelector('video')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Ver recorrido'}));
  expect(gallery.querySelector('video')).toHaveAttribute('src','/videos/recorrido-optica-local-18.mp4');
  expect(screen.getByRole('button',{name:'Pausar galería'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Cerrar recorrido'}));
  expect(gallery.querySelector('video')).toBeNull();
 });
 it('usa el nombre ingresado y el cupo recibido sin cambiar la respuesta neutral ni enviar pruebas reales',async()=>{
  const fetcher=vi.fn(async()=>({ok:true,json:async()=>({message:'Registro procesado',welcome:{tierName:'Start',maxAmount:40000,maxPercent:30,maxInstallments:1}})}));vi.stubGlobal('fetch',fetcher);
  render(<AuthForm mode="register"/>);const first=screen.getByLabelText('Nombre');fireEvent.change(first,{target:{value:'Alfredo'}});fireEvent.change(screen.getByLabelText('Apellido'),{target:{value:'Prueba'}});fireEvent.change(screen.getByLabelText(/^Contraseña/,{selector:'input'}),{target:{value:'clave-de-prueba'}});fireEvent.change(screen.getByLabelText('Repite la contraseña'),{target:{value:'clave-de-prueba'}});fireEvent.submit(first.closest('form')!);
  expect(await screen.findByRole('heading',{name:'¡Gracias, Alfredo, por sumarte!'})).toBeVisible();await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));expect(screen.getByRole('status')).toHaveTextContent('Tu nivel es Start');expect(screen.queryByText('Revisa tu correo')).not.toBeInTheDocument();
 });
});
