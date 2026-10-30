import { render,screen,fireEvent,waitFor } from '@testing-library/react';
import { beforeAll,describe,it,expect,vi } from 'vitest';
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams(),usePathname:()=>'/mi-cuenta',useRouter:()=>({replace:vi.fn()})}));
import { CategoryModalProvider,CategoryTrigger } from './CategoryModal';
beforeAll(()=>{Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});});
describe('Modal de categorías',()=>{
 it('abre desde el nivel, limita el scroll del fondo y permite cerrar con botón y Escape',async()=>{
  render(<CategoryModalProvider tiers={[{code:'start',name:'Start',maxAmount:40000,maxPercent:30,maxInstallments:1}]} currentCategory="start"><CategoryTrigger>Start · Ver categorías</CategoryTrigger></CategoryModalProvider>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Start · Ver categorías'}));
  const dialog=await screen.findByRole('dialog',{name:'Encuentra tu siguiente nivel'});expect(document.body.style.overflow).toBe('hidden');expect(screen.getByText('Tu categoría')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Cerrar categorías'}));await waitFor(()=>expect(dialog).not.toHaveAttribute('open'));expect(document.body.style.overflow).not.toBe('hidden');
  fireEvent.click(screen.getByRole('button',{name:'Start · Ver categorías'}));fireEvent(dialog,new Event('cancel',{bubbles:false,cancelable:true}));await waitFor(()=>expect(dialog).not.toHaveAttribute('open'));
 });
});
