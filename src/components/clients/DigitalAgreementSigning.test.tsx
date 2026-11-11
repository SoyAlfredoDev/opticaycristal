import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DigitalAgreementSigning } from "./DigitalAgreementSigning";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("guía al cliente del código al PDF y permite reenviar el aviso", async () => {
 const fetchMock = vi.fn()
  .mockResolvedValueOnce(Response.json({requestId:"qa-request"}))
  .mockResolvedValueOnce(Response.json({signed:true,sent:false}))
  .mockResolvedValueOnce(Response.json({signed:true,sent:true}));
 vi.stubGlobal("fetch", fetchMock);
 render(<DigitalAgreementSigning saleId="qa-sale" signed={false} sent={false} />);
 expect(screen.getByRole("link",{name:"Descargar compromiso para revisión"})).toHaveAttribute("href","/api/clientes/compras/qa-sale/compromiso/pdf");
 fireEvent.click(screen.getByRole("button",{name:"Enviar código a mi correo"}));
 fireEvent.change(await screen.findByLabelText("Código de tu correo"),{target:{value:"123456"}});
 fireEvent.click(screen.getByRole("checkbox"));
 fireEvent.click(screen.getByRole("button",{name:"Confirmar firma"}));
 expect(await screen.findByRole("link",{name:"Descargar copia firmada"})).toHaveAttribute("href","/api/clientes/compras/qa-sale/compromiso/firmado");
 expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({action:"sign",requestId:"qa-request",code:"123456",accepted:true});
 fireEvent.click(screen.getByRole("button",{name:"Reenviar aviso"}));
 expect(await screen.findByText("Aviso enviado a tu correo.")).toBeInTheDocument();
});
