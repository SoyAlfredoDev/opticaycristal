import {render,screen,fireEvent,within} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {AdminNotificationBell,AdminNotificationsPage} from './AdminNotifications';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',ticket='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const base={id,kind:'customer_reply',ticketId:ticket,folio:'AYU-00001',label:'El cliente respondió',href:`/admin/clientes/soporte?ticket=${ticket}`,createdAt:'2026-10-30T15:00:00Z',read:false};
afterEach(()=>vi.unstubAllGlobals());
it('sincroniza contador y lectura sin cambiar el ticket',async()=>{
 let read=false;const fetcher=vi.fn(async(_url:string,init?:RequestInit)=>{if(init?.method==='POST'){read=true;return {ok:true,json:async()=>({ok:true})};}return {ok:true,json:async()=>({items:[{...base,read}],unreadCount:read?0:1,hasMore:false,asOf:'2026-10-30T15:00:00Z'})};});vi.stubGlobal('fetch',fetcher);
 render(<><AdminNotificationBell/><AdminNotificationsPage/></>);await screen.findByRole('button',{name:'Sin leer (1)'});fireEvent.click(screen.getByText('Avisos'));const buttons=await screen.findAllByRole('button',{name:'Marcar como leída: El cliente respondió AYU-00001'});fireEvent.click(buttons[0]);await screen.findByRole('button',{name:'Sin leer (0)'});expect(fetcher.mock.calls.filter(([,init])=>init?.method==='POST')).toHaveLength(1);expect(JSON.parse(String(fetcher.mock.calls.find(([,init])=>init?.method==='POST')?.[1]?.body))).toEqual({action:'read',id});
});
it('ofrece filtros y no presenta los fallos de conexión como una bandeja vacía',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,json:async()=>({error:'Tu sesión venció. Vuelve a ingresar.'})})));render(<AdminNotificationsPage/>);const alert=await screen.findByRole('alert');expect(alert).toHaveTextContent('Tu sesión venció');expect(within(alert).getByRole('button',{name:'Reintentar'})).toBeInTheDocument();expect(screen.queryByText('No hay notificaciones para mostrar.')).not.toBeInTheDocument();
});

it('permite salir desde los avisos del menú móvil sin dejar el menú abierto',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({items:[],unreadCount:0,hasMore:false,asOf:'2026-11-02T15:00:00Z'})})));const onNavigate=vi.fn();render(<AdminNotificationBell variant="drawer" onNavigate={onNavigate}/>);fireEvent.click(screen.getByText('Avisos'));const all=screen.getByRole('link',{name:'Ver todas'});all.addEventListener('click',event=>event.preventDefault());fireEvent.click(all);expect(onNavigate).toHaveBeenCalledTimes(1);expect(document.querySelector('details')).not.toHaveAttribute('open');
});

it('filtra eventos comerciales sin confundir pedidos recibidos con ventas pagadas',async()=>{
 const events=[{...base,id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',kind:'order_received',label:'Nuevo pedido web',folio:'PED-demo',href:'/admin/pedidos#pedido-demo'},{...base,id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',kind:'sale_created',label:'Nueva venta registrada',folio:'VEN-demo',href:'/admin/clientes/demo#venta-demo'}];
 const fetcher=vi.fn(async(url:string)=>({ok:true,json:async()=>({items:url.includes('category=orders')?[events[0]]:events,unreadCount:url.includes('category=orders')?1:2,hasMore:false,asOf:'2026-11-02T15:00:00Z'})}));vi.stubGlobal('fetch',fetcher);
 render(<AdminNotificationsPage/>);await screen.findByRole('link',{name:'Nueva venta registrada · VEN-demo'});
 fireEvent.change(screen.getByLabelText('Tipo de aviso'),{target:{value:'orders'}});
 await screen.findByRole('button',{name:'Sin leer (1)'});
 expect(screen.getByRole('link',{name:'Nuevo pedido web · PED-demo'})).toHaveAttribute('href','/admin/pedidos#pedido-demo');
 expect(screen.queryByRole('link',{name:'Nueva venta registrada · VEN-demo'})).not.toBeInTheDocument();
});
