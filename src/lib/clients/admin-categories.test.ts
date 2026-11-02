import { afterEach,describe,expect,it,vi } from "vitest";
import { canManageCustomerCategories } from "./admin";
afterEach(()=>vi.unstubAllEnvs());
describe("Permiso para niveles",()=>{
 it("permite al administrador de clientes validado editar sin heredar el permiso de costos",()=>{vi.stubEnv("CLIENT_CATEGORY_ADMIN_USERS","");vi.stubEnv("CLIENT_COST_ADMIN_USERS","owner");expect(canManageCustomerCategories("OWNER")).toBe(true);expect(canManageCustomerCategories("seller")).toBe(true);expect(canManageCustomerCategories("")).toBe(false);});
 it("una lista específica solo habilita a los responsables declarados",()=>{vi.stubEnv("CLIENT_CATEGORY_ADMIN_USERS"," manager, other ");vi.stubEnv("CLIENT_COST_ADMIN_USERS","owner");expect(canManageCustomerCategories("manager")).toBe(true);expect(canManageCustomerCategories("other")).toBe(true);expect(canManageCustomerCategories("owner")).toBe(false);expect(canManageCustomerCategories("cliente")).toBe(false);});
});
