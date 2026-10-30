import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({action:vi.fn(),refresh:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:m.refresh})}));
vi.mock("./sales-client",()=>({durableAction:m.action,SalesRequestError:class extends Error{status=400;}}));
import { RecordPayment } from "./RecordPayment";
beforeEach(()=>vi.clearAllMocks());
function enter(){
 fireEvent.change(screen.getByLabelText("Monto recibido"),{target:{value:"10000"}});
 fireEvent.change(screen.getByLabelText("Fecha del pago"),{target:{value:"2026-10-29"}});
 fireEvent.change(screen.getByLabelText(/Referencia o comprobante/),{target:{value:"Transferencia QA"}});
}
describe("Registro de pagos ante fallos de conexión",()=>{
 it("reintenta exactamente el mismo pago aun con los campos bloqueados",async()=>{
  m.action.mockRejectedValueOnce(new Error("Conexión interrumpida")).mockResolvedValueOnce({id:"payment"});
  render(<RecordPayment saleId="sale" remaining={50000}/>);enter();
  fireEvent.click(screen.getByRole("button",{name:"Revisar pago"}));
  fireEvent.click(screen.getByRole("button",{name:"Confirmar pago"}));
  await screen.findByRole("alert");expect(screen.getByLabelText("Monto recibido")).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"Reintentar el mismo pago"}));
  await screen.findByRole("status");
  expect(m.action).toHaveBeenCalledTimes(2);
  expect(m.action.mock.calls[1][0]).toEqual(m.action.mock.calls[0][0]);
  expect(m.action.mock.calls[1][0]).toMatchObject({saleId:"sale",amount:10000,paidOn:"2026-10-29",reference:"Transferencia QA"});
 });
 it("impide dos solicitudes simultáneas del formulario",async()=>{
  let complete!:(value:unknown)=>void;m.action.mockImplementation(()=>new Promise(r=>{complete=r;}));
  render(<RecordPayment saleId="sale" remaining={50000}/>);enter();
  const button=screen.getByRole("button",{name:"Revisar pago"});
  fireEvent.click(button);const confirm=screen.getByRole("button",{name:"Confirmar pago"});fireEvent.click(confirm);fireEvent.click(confirm);
  expect(m.action).toHaveBeenCalledTimes(1);complete({id:"payment"});
  await waitFor(()=>expect(m.refresh).toHaveBeenCalledTimes(1));
 });
});
