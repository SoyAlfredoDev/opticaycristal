// @vitest-environment node
import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session:vi.fn(), request:vi.fn() }));
vi.mock("@/lib/clients/auth", () => ({ customerSession:mocks.session }));
vi.mock("@/lib/clients/digital-agreement", () => ({
 DigitalAgreementError:class extends Error {},
 requestAgreementCode:mocks.request,
 signDigitalAgreement:vi.fn(),
 sendDigitalAgreementCopy:vi.fn(),
}));
import { POST } from "./route";

it("rechaza otro origen y usa el cliente de la sesión para solicitar el código", async () => {
 const id = "00000000-0000-4000-8000-000000000001";
 const origin = new URL(process.env.CLIENT_APP_URL || "https://opticaycristal.cl").origin;
 const call = (requestOrigin:string) => POST(new Request(`${origin}/api/clientes/compras/${id}/compromiso/firma`, {
  method:"POST",
  headers:{origin:requestOrigin,"content-type":"application/json"},
  body:JSON.stringify({action:"request",userId:"otro-cliente",email:"otro@example.invalid"}),
 }), {params:Promise.resolve({id})});
 expect((await call("https://otro.example.invalid")).status).toBe(403);
 mocks.session.mockResolvedValueOnce(null);
 expect((await call(origin)).status).toBe(401);
 mocks.session.mockResolvedValueOnce({user:{id:"cliente-de-sesion"}});
 mocks.request.mockResolvedValueOnce({requestId:"qa"});
 const response = await call(origin);
 expect(response.status).toBe(200);
 expect(response.headers.get("cache-control")).toContain("no-store");
 expect(mocks.request).toHaveBeenCalledExactlyOnceWith(id,"cliente-de-sesion");
});
