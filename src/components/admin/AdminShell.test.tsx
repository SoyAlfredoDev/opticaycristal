import {render,screen,within,fireEvent,waitFor} from '@testing-library/react';
import {beforeAll,it,expect,vi} from 'vitest';
const navigation=vi.hoisted(()=>({path:'/admin/clientes'}));
vi.mock('next/navigation',()=>({usePathname:()=>navigation.path}));
vi.mock('@/app/admin/actions',()=>({logoutAction:vi.fn()}));
vi.mock('./AdminNotifications',()=>({AdminNotificationBell:()=> <button>Avisos</button>}));
import {AdminShell} from './AdminShell';
beforeAll(()=>{Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});});
it('mantiene todas las vistas al cambiar entre módulos y marca solo la sección correcta',()=>{
 const{rerender}=render(<AdminShell allowCustomers><main>Contenido</main></AdminShell>);
 expect(screen.queryByRole('banner')).not.toBeInTheDocument();expect(within(screen.getByRole('complementary')).getByRole('button',{name:'Avisos'})).toBeInTheDocument();
 for(const path of ['/admin','/admin/clientes','/admin/clientes/qa','/admin/clientes/ventas','/admin/clientes/niveles','/admin/clientes/simulador','/admin/clientes/compromisos','/admin/clientes/soporte','/admin/pedidos','/admin/radar','/admin/notificaciones']){
  navigation.path=path;rerender(<AdminShell allowCustomers><main>Contenido</main></AdminShell>);
  const nav=screen.getByRole('navigation',{name:'Menú administrativo'});for(const label of ['Solicitudes','Clientes','Ventas','Niveles y beneficios','Simulador de crédito','Compromisos','Soporte','Pedidos web','Radar B2B','Notificaciones'])expect(within(nav).getByRole('link',{name:label})).toBeInTheDocument();
  expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
 }
});
it('muestra avisos web pero no módulos de clientes sin permiso de clientes',()=>{
 navigation.path='/admin';render(<AdminShell allowCustomers={false}><main>Contenido</main></AdminShell>);const nav=screen.getByRole('navigation',{name:'Menú administrativo'});for(const label of ['Clientes','Ventas','Niveles y beneficios','Simulador de crédito','Compromisos','Soporte'])expect(within(nav).queryByRole('link',{name:label})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Avisos'})).toBeInTheDocument();expect(within(nav).getByRole('link',{name:'Notificaciones'})).toBeInTheDocument();
});
it('abre y cierra el menú móvil sin perder navegación ni bloquear el fondo al salir',async()=>{
 navigation.path='/admin/clientes';render(<AdminShell allowCustomers><main>Contenido</main></AdminShell>);fireEvent.click(screen.getByRole('button',{name:'Abrir menú administrativo'}));const dialog=screen.getByRole('dialog',{name:'Administración'});expect(document.body.style.overflow).toBe('hidden');expect(within(dialog).getByRole('button',{name:'Avisos'})).toBeInTheDocument();expect(screen.getAllByRole('button',{name:'Avisos'})).toHaveLength(1);expect(within(dialog).getByRole('button',{name:'Cerrar sesión'})).toBeInTheDocument();const link=within(dialog).getByRole('link',{name:'Ventas'});link.addEventListener('click',event=>event.preventDefault());fireEvent.click(link);await waitFor(()=>expect(dialog).not.toHaveAttribute('open'));expect(document.body.style.overflow).not.toBe('hidden');
});
it('excluye los documentos imprimibles del menú y la campana',()=>{navigation.path='/admin/clientes/ventas/qa/compromiso';render(<AdminShell allowCustomers><main>Compromiso</main></AdminShell>);expect(screen.queryByRole('navigation')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Avisos'})).not.toBeInTheDocument();});
