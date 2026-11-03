import {render,screen,within} from '@testing-library/react';
import {it,expect} from 'vitest';
import {FinancingExplanation} from './FinancingExplanation';
it('explica que el tope no paga toda la compra y muestra el pie obligatorio',()=>{
 render(<FinancingExplanation tier={{maxAmount:80000,maxPercent:60,maxInstallments:3}}/>);
 const card=screen.getByRole('complementary',{name:'Cómo se calcula tu financiamiento'});
 expect(card).toHaveTextContent('hasta el 60% del precio');expect(card).toHaveTextContent('no un descuento');
 expect(within(card).getByText('$48.000')).toBeVisible();expect(within(card).getByText('$32.000')).toBeVisible();expect(card).toHaveTextContent('Tu pie');
});
