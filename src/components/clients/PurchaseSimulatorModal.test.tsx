import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeAll,afterEach,it,expect,vi} from 'vitest';
import type {SimulationConditions} from '@/lib/clients/purchase-simulation';
import {PurchaseSimulator} from './PurchaseSimulator';
vi.mock('next/dynamic',()=>({default:()=>function LoadedSimulator(props:SimulationConditions&{embedded?:boolean}){return <PurchaseSimulator {...props}/>;}}));
import {PurchaseSimulatorModal} from './PurchaseSimulatorModal';
beforeAll(()=>{Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});Element.prototype.scrollIntoView=vi.fn();});
afterEach(()=>vi.unstubAllGlobals());
it('mantiene solo el acceso en Inicio y permite calcular, cerrar y volver a abrir sin resultados antiguos',async()=>{
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 render(<PurchaseSimulatorModal tier={{maxPercent:30,maxAmount:40000,maxInstallments:1}} outstanding={0} emailVerified/>);
 expect(screen.queryByRole('textbox')).not.toBeInTheDocument();const trigger=screen.getByRole('button',{name:'Simular mi compra'});fireEvent.click(trigger);
 const dialog=await screen.findByRole('dialog',{name:'Simula tu compra'});expect(document.body.style.overflow).toBe('hidden');expect(screen.getAllByRole('heading',{name:'Simula tu compra'})).toHaveLength(1);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'45.000'}});fireEvent.click(screen.getByRole('button',{name:'Consultar'}));expect(screen.getByRole('status')).toHaveTextContent('$31.500');
 fireEvent.click(screen.getByRole('button',{name:'Cerrar simulador'}));await waitFor(()=>expect(dialog).not.toHaveAttribute('open'));expect(document.body.style.overflow).not.toBe('hidden');
 fireEvent.click(trigger);expect(screen.getByRole('textbox')).toHaveValue('');expect(screen.queryByRole('status')).not.toBeInTheDocument();
 fireEvent(dialog,new Event('cancel',{cancelable:true}));await waitFor(()=>expect(dialog).not.toHaveAttribute('open'));
});
