import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompanyRequestForm } from "./CompanyRequestForm";
import { getMesOptions } from "@/lib/jornada-form";
import { submitCompanyRequest } from "@/lib/company-request";

vi.mock("@/lib/company-request", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/company-request")>(),
  submitCompanyRequest: vi.fn().mockResolvedValue(undefined),
}));

describe("solicitud de incorporación de empresa", () => {
  beforeEach(() => vi.mocked(submitCompanyRequest).mockReset().mockResolvedValue({ confirmationSent: false }));

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
    fireEvent.click(screen.getByRole("button", { name: "Solicitar información del convenio" }));
    await waitFor(() => expect(submitCompanyRequest).toHaveBeenCalledWith(expect.objectContaining({ origen: "convenio", detalles: expect.objectContaining({ trabajadores: 15, modalidadConvenio: "financiamiento" }) }), "", expect.any(String)));
    expect(await screen.findByRole("heading", { name: "Recibimos tu solicitud" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Las cuotas por nómina se habilitan con un contrato");
  });

  it("permite solicitar registro sin elegir financiamiento", async () => {
    render(<CompanyRequestForm kind="convenio" />);
    completeForm();
    fireEvent.click(screen.getByRole("button", { name: "Solicitar información del convenio" }));
    await waitFor(() => expect(submitCompanyRequest).toHaveBeenCalledOnce());
    expect(vi.mocked(submitCompanyRequest).mock.calls[0][0].detalles?.modalidadConvenio).toBeUndefined();
  });

  it("no muestra opciones de convenio en el formulario de jornadas", () => {
    render(<CompanyRequestForm kind="jornada" />);
    expect(screen.queryByLabelText("¿Qué le interesa a tu empresa? (opcional)")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar solicitud de jornada" })).not.toBeInTheDocument();
  });
  it.each(["jornada", "convenio"] as const)("%s recorre tres pasos y exige confirmar el envío", async (kind) => {
    render(<CompanyRequestForm kind={kind} />);
    expect(screen.getByRole("heading", { name: "Datos de la persona" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("heading", { name: "Datos de la persona" })).toBeInTheDocument();
    for (const [label, value] of [["Nombre de contacto", "Persona de prueba"], ["Cargo", "RRHH"], ["Correo electrónico", "persona@example.invalid"], ["Teléfono", "+56 9 1234 5678"]]) fill(label, value);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("heading", { name: "Datos de la empresa" })).toBeInTheDocument();
    fill("Nombre de la empresa", "Empresa de prueba aislada"); fill("Comuna", "Santiago"); fill("Región", "Metropolitana de Santiago");
    if (kind === "convenio") fill("Número de trabajadores", "5");
    else { fill("Mes estimado", getMesOptions()[0].value); fill("Dirección de la jornada (opcional)", "[Dirección de prueba]"); }
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("heading", { name: "Confirma la solicitud" })).toBeInTheDocument();
    const sendName = kind === "convenio" ? "Solicitar información del convenio" : "Enviar solicitud de jornada";
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: sendName })).toBeDisabled();
    fireEvent.submit(screen.getByRole("form"));
    expect(submitCompanyRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: sendName })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Corregir contacto" }));
    fill("Teléfono", "+56 9 9876 5432");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: sendName }));
    await waitFor(() => expect(submitCompanyRequest).toHaveBeenCalledOnce());
    expect(vi.mocked(submitCompanyRequest).mock.calls[0][0]).toMatchObject({ origen: kind, autorizacionDatos: true, telefono: "+56 9 9876 5432" });
  });

  it("muestra el correo confirmado únicamente cuando el servidor lo confirma", async () => {
    vi.mocked(submitCompanyRequest).mockResolvedValueOnce({ id: "12345678-1234-1234-1234-123456789abc", confirmationSent: true });
    render(<CompanyRequestForm kind="convenio" />); completeForm();
    fireEvent.click(screen.getByRole("button", { name: "Solicitar información del convenio" }));
    const success = await screen.findByRole("status");
    expect(success).toHaveTextContent("Enviamos una confirmación a prueba@example.com");
    expect(success).toHaveTextContent("Referencia: 12345678");
  });
  it("informa que la solicitud está guardada si la confirmación queda pendiente", async () => {
    render(<CompanyRequestForm kind="convenio" />); completeForm();
    fireEvent.click(screen.getByRole("button", { name: "Solicitar información del convenio" }));
    expect(await screen.findByRole("status")).toHaveTextContent("La confirmación por correo está pendiente");
  });
  it("conserva la referencia al reintentar tras un error de red", async () => {
    vi.mocked(submitCompanyRequest).mockRejectedValueOnce(new Error("Error de red aislado"));
    render(<CompanyRequestForm kind="convenio" />); completeForm();
    fireEvent.click(screen.getByRole("button", { name: "Solicitar información del convenio" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Error de red aislado");
    const firstId = vi.mocked(submitCompanyRequest).mock.calls[0][2];
    fireEvent.click(screen.getByRole("button", { name: "Solicitar información del convenio" }));
    await screen.findByRole("status");
    expect(vi.mocked(submitCompanyRequest).mock.calls[1][2]).toBe(firstId);
  });
});
