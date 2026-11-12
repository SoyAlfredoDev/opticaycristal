import { AuthForm } from "@/components/clients/AuthForm";

export default async function CustomerRegister({ searchParams }: { searchParams: Promise<{ destino?: string }> }) {
  return <AuthForm mode="register" openAdvisor={(await searchParams).destino === "asesor"} />;
}
