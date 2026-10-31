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
