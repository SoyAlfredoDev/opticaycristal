import { currentCustomer } from "@/lib/clients/current";
import { CustomerShell } from "@/components/clients/CustomerShell";
export const dynamic = "force-dynamic";
export default async function CustomerLayout({children}: {children:React.ReactNode}) {const customer=await currentCustomer();return <CustomerShell customer={{firstName:customer.firstName,lastName:customer.lastName}}>{children}</CustomerShell>;}
