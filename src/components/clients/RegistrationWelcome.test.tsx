import {render,screen} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
vi.mock('next/dynamic',()=>({default:()=>()=>null}));
import {RegistrationWelcome} from './RegistrationWelcome';
it('presenta el cupo inicial del servidor y mantiene explícita la verificación pendiente',()=>{
 render(<RegistrationWelcome welcome={{tierName:'Start',maxAmount:40000,maxPercent:30,maxInstallments:1}}/>);
 expect(screen.getByRole('heading',{name:'¡Gracias por sumarte!'})).toBeInTheDocument();expect(screen.getByRole('status')).toHaveTextContent('$40.000');expect(screen.getByText('Verifica tu cuenta para habilitar el financiamiento.')).toBeInTheDocument();expect(screen.getByRole('link',{name:'Ir a mi cuenta'})).toHaveAttribute('href','/mi-cuenta/ingresar');expect(screen.getByRole('status')).not.toHaveTextContent('Disponible');
});
