import {render,screen,fireEvent,within} from '@testing-library/react';
import {beforeAll,it,expect} from 'vitest';
import {CustomerCreditFaq} from './CustomerCreditFaq';
import {CustomerHelpChat} from './CustomerHelpChat';
beforeAll(()=>{Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});});
it('explica correo obligatorio, WhatsApp futuro, compromiso presencial y precio superior al cupo',()=>{
 render(<CustomerCreditFaq/>);
 fireEvent.click(screen.getByText('¿Qué necesito para usar mi crédito?'));
 expect(screen.getByText(/Para usar tu crédito necesitas estar registrado/)).toHaveTextContent('correo electrónico verificado');
 expect(screen.getByText(/Para usar tu crédito necesitas estar registrado/)).toHaveTextContent('verificación de WhatsApp todavía no está implementada');
 expect(screen.getByText(/Al registrar la venta/)).toHaveTextContent('cuotas mensuales y fechas de pago');
 expect(screen.getByText(/Sí. El límite/)).toHaveTextContent('no al precio total');
});
it('responde a requisitos y compromiso, y no exige verificar WhatsApp',()=>{
 render(<CustomerHelpChat/>);fireEvent.click(screen.getByRole('button',{name:'Abrir chat de ayuda'}));fireEvent.click(screen.getByRole('button',{name:'Requisitos del crédito'}));
 const log=screen.getByRole('log');expect(log).toHaveTextContent('correo electrónico verificado');expect(log).toHaveTextContent('compromiso de pago');
 const input=screen.getByRole('textbox',{name:'Escribe tu consulta'});
 fireEvent.change(input,{target:{value:'¿Es obligatorio verificar WhatsApp?'}});fireEvent.click(screen.getByRole('button',{name:'Consultar al asistente'}));expect(log).toHaveTextContent('La verificación de WhatsApp todavía no está implementada y no es obligatoria por ahora');
 fireEvent.change(input,{target:{value:'¿Cómo firmo el compromiso de pago?'}});fireEvent.click(screen.getByRole('button',{name:'Consultar al asistente'}));expect(within(log).getAllByRole('link',{name:'Ver requisitos y preguntas frecuentes'})).toHaveLength(2);
 fireEvent.change(input,{target:{value:'Necesito hablar con una persona'}});fireEvent.click(screen.getByRole('button',{name:'Consultar al asistente'}));expect(within(log).getByRole('link',{name:'Abrir WhatsApp'})).toBeInTheDocument();
});
