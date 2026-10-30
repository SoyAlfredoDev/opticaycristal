import {render,screen,fireEvent,within} from '@testing-library/react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {PurchaseSimulator} from './PurchaseSimulator';
const conditions={tier:{maxPercent:30,maxAmount:40000,maxInstallments:1},outstanding:0,emailVerified:true};
beforeEach(()=>{vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})));Element.prototype.scrollIntoView=vi.fn();});
afterEach(()=>vi.unstubAllGlobals());
it('consulta sin enviar solicitudes y elimina el resultado anterior cuando cambia el precio',()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);render(<PurchaseSimulator {...conditions}/>);
 fireEvent.change(screen.getByRole('textbox',{name:'Precio total con IVA'}),{target:{value:'45.000'}});fireEvent.click(screen.getByRole('button',{name:'Consultar'}));
 const result=screen.getByRole('status');expect(result).toHaveTextContent('Pie estimado');expect(result).toHaveTextContent('$31.500');expect(result).toHaveTextContent('$13.500');expect(result).toHaveTextContent('El pie final se confirma en la óptica');expect(fetcher).not.toHaveBeenCalled();
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'50.000'}});expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('muestra el ajuste de la última cuota y restringe la selección a la categoría asignada',()=>{
 render(<PurchaseSimulator {...conditions} tier={{maxPercent:70,maxAmount:150000,maxInstallments:4}}/>);
 expect(within(screen.getByRole('combobox')).getAllByRole('option')).toHaveLength(4);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'119.002'}});fireEvent.click(screen.getByRole('button',{name:'Consultar'}));
 expect(screen.getByRole('status')).toHaveTextContent('4 cuotas mensuales');expect(screen.getByRole('status')).toHaveTextContent('Última cuota: $20.826');
});
it('explica el correo pendiente sin prometer crédito aprobado',()=>{
 render(<PurchaseSimulator {...conditions} emailVerified={false}/>);expect(screen.getByRole('link',{name:'verifica tu correo'})).toHaveAttribute('href','/mi-cuenta/perfil');
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'45.000'}});fireEvent.click(screen.getByRole('button',{name:'Consultar'}));expect(screen.getByRole('status')).toHaveTextContent('Pago al contado');expect(screen.getByRole('status')).not.toHaveTextContent('cuota mensual');
});
