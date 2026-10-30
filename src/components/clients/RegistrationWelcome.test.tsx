import {render,screen} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
vi.mock('next/dynamic',()=>({default:()=>()=>null}));
import {RegistrationWelcome} from './RegistrationWelcome';
it('personaliza el agradecimiento y presenta la categoría sin el bloque de verificación',()=>{
 render(<RegistrationWelcome firstName="Alfredo" welcome={{tierName:'Start',maxAmount:40000,maxPercent:30,maxInstallments:1}}/>);
 expect(screen.getByRole('heading',{name:'¡Gracias, Alfredo, por sumarte!'})).toBeInTheDocument();expect(screen.getByRole('status')).toHaveTextContent('Tu categoría es Start');expect(screen.getByRole('status')).toHaveTextContent('$40.000');expect(screen.queryByText(/Cupo inicial|Revisa tu correo|Verifica tu cuenta/)).not.toBeInTheDocument();expect(screen.getByRole('link',{name:'Ir a mi cuenta'})).toHaveAttribute('href','/mi-cuenta/ingresar');expect(screen.getByText('Óptica & Cristal',{selector:'strong'})).toBeInTheDocument();expect(screen.getByRole('status')).not.toHaveTextContent('Disponible');
});
it('mantiene una bienvenida válida si no hay nombre y trata el texto como contenido seguro',()=>{
 render(<RegistrationWelcome firstName="<script>prueba</script>" welcome={null}/>);expect(screen.getByRole('heading')).toHaveTextContent('¡Gracias, <script>prueba</script>, por sumarte!');expect(document.querySelector('script')).toBeNull();
});
