"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: form.get("usuario"),
          password: form.get("password"),
        }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? "No se pudo iniciar sesión.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("No hay conexión con el servidor. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main
      id="contenido-principal"
      className="flex min-h-dvh items-center justify-center bg-warm px-4 py-16"
    >
      <div className="w-full max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Panel interno</p>
        <h1 className="hero-headline-serif mt-3 text-4xl text-brand-dark">Óptica y Cristal</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Acceso del equipo. Aquí quedan las solicitudes que llegan desde el sitio para que un
          ejecutivo pueda contactar a la empresa.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-[1.25rem] border border-border bg-white p-6 shadow-[var(--shadow-card)]"
        >
          <Input
            label="Usuario"
            name="usuario"
            autoComplete="username"
            required
            disabled={pending}
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
          />
          {error && (
            <p className="text-sm text-primary" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="min-h-[48px] w-full" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
