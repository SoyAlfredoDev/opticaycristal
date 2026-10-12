import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompanyRequestForm } from "./CompanyRequestForm";
import { submitCompanyRequest } from "@/lib/company-request";

vi.mock("@/lib/company-request", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/company-request")>(),
  submitCompanyRequest: vi.fn().mockResolvedValue(undefined),
}));

describe("solicitud de incorporación de empresa", () => {
  beforeEach(() => vi.mocked(submitCompanyRequest).mockClear());

  function fill(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }

  function completeForm(interest?: string) {
    for (const [label, value] of [
      ["Nombre de contacto", "Contacto de prueba"], ["Cargo", "Recursos humanos"],
      ["Correo electrónico", "prueba@example.com"], ["Teléfono", "+56 9 1234 5678"],
    ]) fill(label, value);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    for (const [label, value] of [
      ["Nombre de la empresa", "Empresa de prueba"], ["Número de trabajadores", "15"], ["Comuna", "Santiago"],
    ]) fill(label, value);
    fireEvent.change(screen.getByLabelText("Región", { exact: true }), { target: { value: "Metropolitana de Santiago" } });
    if (interest) fireEvent.change(screen.getByLabelText("¿Qué le interesa a tu empresa? (opcional)"), { target: { value: interest } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("checkbox"));
  }

  it("envía la preferencia de financiamiento junto con los datos de la empresa", async () => {
    render(<CompanyRequestForm kind="convenio" />);
    expect(screen.queryByLabelText("Nombre de la empresa", { exact: true })).not.toBeInTheDocument();
    completeForm("financiamiento");
    expect(screen.getByRole("heading", { name: "Confirma la solicitud" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Solicitar registro de mi empresa" }));
    await waitFor(() => expect(submitCompanyRequest).toHaveBeenCalledWith(expect.objectContaining({ origen: "convenio", detalles: expect.objectContaining({ trabajadores: 15, modalidadConvenio: "financiamiento" }) }), ""));
    expect(await screen.findByRole("heading", { name: "Recibimos tu solicitud" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Las cuotas por nómina se habilitan con un contrato");
  });

  it("permite solicitar registro sin elegir financiamiento", async () => {
    render(<CompanyRequestForm kind="convenio" />);
    completeForm();
    fireEvent.click(screen.getByRole("button", { name: "Solicitar registro de mi empresa" }));
    await waitFor(() => expect(submitCompanyRequest).toHaveBeenCalledOnce());
    expect(vi.mocked(submitCompanyRequest).mock.calls[0][0].detalles?.modalidadConvenio).toBeUndefined();
  });

  it("no muestra opciones de convenio en el formulario de jornadas", () => {
    render(<CompanyRequestForm kind="jornada" />);
    expect(screen.queryByLabelText("¿Qué le interesa a tu empresa? (opcional)")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar solicitud de jornada" })).toBeInTheDocument();
  });
});
