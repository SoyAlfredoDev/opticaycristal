import { ClientBrand } from "@/components/clients/ClientBrand";
export default function PublicClientLayout({children}: {children:React.ReactNode}) {return <><ClientBrand prominent /><main id="contenido-principal">{children}</main></>;}
