import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {useState} from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {AdminMemory} from '@/components/admin/AdminMemory';
import {AdminClients} from './AdminClients';
import type {CustomerSummary} from '@/lib/clients/types';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it('busca RUT sin usar URL o storage y conserva el filtro al volver de una ficha',async()=>{
 const storage=vi.spyOn(Storage.prototype,'setItem');
 const fetcher=vi.fn(async(url:string,init?:RequestInit)=>({ok:Boolean(url&&init),json:async()=>({customers:[],hasMore:false})}));vi.stubGlobal('fetch',fetcher);
 function Harness(){const[details,setDetails]=useState(false);return <AdminMemory><button onClick={()=>setDetails(value=>!value)}>{details?'Volver':'Abrir ficha'}</button>{details?<p>Ficha de prueba</p>:<AdminClients initialCustomers={[]}/>}</AdminMemory>;}
 render(<Harness/>);await screen.findByText('No hay clientes para mostrar');fireEvent.change(screen.getByRole('textbox',{name:'Buscar por nombre, correo o RUT'}),{target:{value:'12.345.678-5'}});fireEvent.click(screen.getByRole('button',{name:'Buscar'}));await waitFor(()=>expect(fetcher.mock.calls.some(([,init])=>JSON.parse(String((init as RequestInit)?.body||'{}')).q==='12.345.678-5')).toBe(true));
 expect(fetcher.mock.calls.every(([url])=>url==='/api/admin/clientes')).toBe(true);expect(storage).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Abrir ficha'}));fireEvent.click(screen.getByRole('button',{name:'Volver'}));expect(screen.getByRole('textbox')).toHaveValue('12.345.678-5');
});

it('una búsqueda fallida oculta resultados anteriores y permite reintentar sin perder la consulta',async()=>{
 const customer:CustomerSummary={id:'qa-user',firstName:'Persona',lastName:'Prueba',email:'qa@example.invalid',emailVerified:true,whatsappVerified:false,identityVerified:false,createdAt:'2026-10-30T10:00:00Z',tier:{code:'start',name:'Start',maxPercent:30,maxAmount:40000,maxInstallments:1},credit:{principalOutstanding:0,capacity:40000,available:40000,enabled:true,needsIdentity:false}};
 const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({customers:[customer],hasMore:false})}).mockResolvedValueOnce({ok:false,json:async()=>({error:'Servicio temporalmente no disponible.'})}).mockResolvedValueOnce({ok:true,json:async()=>({customers:[],hasMore:false})});vi.stubGlobal('fetch',fetcher);
 render(<AdminClients initialCustomers={[customer]}/>);await screen.findByText('Persona Prueba');fireEvent.change(screen.getByRole('textbox'),{target:{value:'Otra persona'}});fireEvent.click(screen.getByRole('button',{name:'Buscar'}));await screen.findByRole('alert');expect(screen.queryByText('Persona Prueba')).not.toBeInTheDocument();expect(screen.queryByText('No hay clientes para mostrar')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Reintentar'}));await screen.findByText('No hay clientes para mostrar');expect(screen.getByRole('textbox')).toHaveValue('Otra persona');
});
