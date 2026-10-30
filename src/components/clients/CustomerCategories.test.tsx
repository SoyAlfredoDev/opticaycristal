import {render,screen,within} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {CustomerCategories} from './CustomerCategories';
const tiers=[{code:'start',name:'Start',maxPercent:30,maxAmount:40000,maxInstallments:1},{code:'vip',name:'VIP',maxPercent:40,maxAmount:60000,maxInstallments:2},{code:'premium',name:'Premium',maxPercent:60,maxAmount:80000,maxInstallments:3},{code:'elite',name:'Elite',maxPercent:70,maxAmount:150000,maxInstallments:4}];
describe('Comparación de categorías',()=>{
 it('marca solo la categoría asignada y muestra las condiciones consultadas sin acciones de autoascenso',()=>{
  render(<CustomerCategories tiers={tiers} currentCategory="vip"/>);
  expect(screen.getAllByText('Tu categoría')).toHaveLength(1);
  expect(within(screen.getByRole('region',{name:'VIP'})).getByText('Tu categoría')).toBeVisible();
  for(const name of ['Start','VIP','Premium','Élite'])expect(screen.getByRole('region',{name})).toBeVisible();
  expect(screen.getByText('Hasta el 70%')).toBeVisible();expect(screen.getByText('$150.000')).toBeVisible();
  expect(screen.getByRole('link',{name:'Volver a Inicio'})).toHaveAttribute('href','/mi-cuenta');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
 });
});
