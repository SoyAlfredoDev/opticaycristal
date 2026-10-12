"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowClockwise, MagnifyingGlass, SignOut } from "@phosphor-icons/react";
import { reenviarAvisoAction, logoutAction } from "@/app/admin/actions";
import { getMesLabel } from "@/lib/jornada-form";
import { convenioInterests } from "@/lib/convenios";
import { ORIGEN_LABEL, type CorreoEstado, type Solicitud } from "@/lib/solicitudes/types";

type Infra = {
  persistencia: "neon" | "mysql" | "archivo";
  resend: boolean;
  destino: string;
  archivoEnProduccion: boolean;
};

type FiltroCorreo = "todas" | CorreoEstado;

const ESTADO: Record<CorreoEstado, { label: string; className: string }> = {
  enviado: { label: "Enviado", className: "bg-emerald-50 text-emerald-900" },
  pendiente: { label: "Pendiente", className: "bg-amber-50 text-amber-950" },
  error: { label: "Error", className: "bg-primary-soft text-primary" },
};

function formatFecha(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(date);
}

function EstadoCorreo({ estado }: { estado: CorreoEstado }) {
  const item = ESTADO[estado];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.className}`}>
      {item.label}
    </span>
  );
}

export default function SolicitudesPanel({
  solicitudes,
  infra,
  errorCarga,
}: {
  solicitudes: Solicitud[];
  infra: Infra;
  errorCarga: string | null;
}) {
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<FiltroCorreo>("todas");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return solicitudes.filter((item) => {
      if (filtro === "enviado" && (item.correoEstado !== "enviado" || item.correoClienteEstado !== "enviado")) {
        return false;
      }
      if (filtro === "pendiente" || filtro === "error") {
        const coincide = item.correoEstado === filtro || item.correoClienteEstado === filtro;
        if (!coincide) return false;
      }
      if (!q) return true;
      return [item.empresa, item.responsable, item.correo, item.telefono, item.region, item.cargo]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [filtro, query, solicitudes]);

  const conProblema = solicitudes.filter(
    (item) => item.correoEstado !== "enviado" || item.correoClienteEstado !== "enviado"
  ).length;

  function reenviar(id: string) {
    setAviso(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await reenviarAvisoAction(id);
      setPendingId(null);
      if (!result.ok) setAviso(result.error);
    });
  }

  return (
    <div className="min-h-dvh bg-warm text-text-primary">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Panel interno
            </p>
            <p className="mt-1 text-sm font-semibold text-brand-dark">Óptica y Cristal</p>
          </div>
          <nav aria-label="Administración" className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/admin" aria-current="page" className="text-primary">Solicitudes</Link>
            <Link href="/admin/pedidos" className="text-text-secondary hover:text-brand-dark">Pedidos</Link><Link href="/admin/radar" className="text-text-secondary hover:text-brand-dark">Radar B2B</Link>
          </nav>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-text-secondary transition-colors hover:text-brand-dark"
            >
              <SignOut size={16} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <main id="contenido-principal" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
              Solicitudes recibidas
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
              Cada formulario queda registrado, confirma al cliente y avisa a {infra.destino}.
            </p>
          </div>
          <p className="text-sm font-semibold text-brand-dark">
            {solicitudes.length} {solicitudes.length === 1 ? "solicitud" : "solicitudes"}
            {conProblema > 0 ? ` · ${conProblema} sin aviso enviado` : ""}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {!infra.resend && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
              Falta la clave de Resend. Las solicitudes se registran, pero todavía no sale la
              confirmación al cliente ni el aviso a {infra.destino}.
            </p>
          )}
          {infra.persistencia === "archivo" && (
            <p className="rounded-2xl border border-border bg-white px-4 py-3 text-sm leading-relaxed text-text-secondary">
              {infra.archivoEnProduccion
                ? "En producción el registro sigue en un archivo local. Conecta la base MySQL de cPanel para que las solicitudes no dependan del disco del servidor."
                : "Por ahora el registro vive en un archivo local. Cuando entregues la conexión MySQL de cPanel, este mismo panel leerá esa base."}
            </p>
          )}
          {errorCarga && (
            <p className="rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary" role="alert">
              {errorCarga}
            </p>
          )}
          {aviso && (
            <p className="rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary" role="alert">
              {aviso}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar solicitudes</span>
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar empresa, responsable, correo o teléfono"
              className="min-h-12 w-full rounded-full border border-border bg-white py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary"
            />
          </label>
          <label className="sr-only" htmlFor="filtro-correo">
            Estado del aviso
          </label>
          <select
            id="filtro-correo"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value as FiltroCorreo)}
            className="min-h-12 rounded-full border border-border bg-white px-4 text-sm font-medium outline-none focus:border-primary"
          >
            <option value="todas">Todos los avisos</option>
            <option value="enviado">Enviados</option>
            <option value="pendiente">Pendientes</option>
            <option value="error">Con error</option>
          </select>
        </div>

        {filtradas.length === 0 ? (
          <div className="mt-8 rounded-[1.25rem] border border-dashed border-border bg-white px-6 py-16 text-center">
            <p className="text-base font-semibold text-brand-dark">
              {solicitudes.length === 0 ? "Todavía no hay solicitudes" : "Ninguna solicitud coincide"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
              {solicitudes.length === 0
                ? "Cuando una empresa complete el formulario de jornada o convenio, aparecerá en este listado con el estado del correo."
                : "Prueba con otro nombre, correo o filtro de aviso."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {filtradas.map((item) => {
              const abiertaEsta = abierta === item.id;
              const reenviando = isPending && pendingId === item.id;
              return (
                <article
                  key={item.id}
                  className="rounded-[1.25rem] border border-border bg-white px-4 py-4 shadow-[var(--shadow-soft)] sm:px-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-brand-dark">{item.empresa}</h2>
                        <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                          Cliente <EstadoCorreo estado={item.correoClienteEstado} />
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                          Equipo <EstadoCorreo estado={item.correoEstado} />
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {item.responsable} · {item.cargo}
                      </p>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <dt className="text-xs text-text-tertiary">Teléfono</dt>
                          <dd>
                            <a className="font-semibold text-brand-dark underline-offset-2 hover:underline" href={`tel:${item.telefono.replace(/\s/g, "")}`}>
                              {item.telefono}
                            </a>
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-xs text-text-tertiary">Correo</dt>
                          <dd className="truncate">
                            <a className="font-semibold text-brand-dark underline-offset-2 hover:underline" href={`mailto:${item.correo}`}>
                              {item.correo}
                            </a>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-text-tertiary">Región</dt>
                          <dd className="font-semibold text-brand-dark">{item.region}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-text-tertiary">Mes estimado</dt>
                          <dd className="font-semibold text-brand-dark">{item.mesEstimado ? getMesLabel(item.mesEstimado) : "No aplica"}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                      <p className="text-xs text-text-tertiary">{formatFecha(item.creadoEn)}</p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        {ORIGEN_LABEL[item.origen]}
                      </p>
                      {(item.correoEstado !== "enviado" || item.correoClienteEstado !== "enviado") && (
                        <button
                          type="button"
                          onClick={() => reenviar(item.id)}
                          disabled={reenviando}
                          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-3 text-sm font-semibold text-brand-dark transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                        >
                          <ArrowClockwise size={14} className={reenviando ? "animate-spin" : ""} />
                          {reenviando ? "Enviando..." : "Reenviar correos"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setAbierta(abiertaEsta ? null : item.id)}
                        className="text-sm font-semibold text-primary"
                        aria-expanded={abiertaEsta}
                      >
                        {abiertaEsta ? "Ocultar detalle" : "Ver detalle"}
                      </button>
                    </div>
                  </div>
                  {abiertaEsta && (
                    <div className="mt-4 border-t border-border-soft pt-4 text-sm leading-relaxed text-text-secondary">
                      {item.detalles ? <dl className="mb-4 grid gap-3 sm:grid-cols-2">
                        {Object.entries({ "Interés del convenio": item.detalles.modalidadConvenio ? convenioInterests[item.detalles.modalidadConvenio] : undefined, "RUT de la empresa": item.detalles.rutEmpresa, "Trabajadores / participantes": item.detalles.trabajadores, "Comuna": item.detalles.comuna, "Dirección": item.detalles.direccion, "Fecha tentativa": item.detalles.fechaTentativa, "Comentarios": item.detalles.comentarios }).filter(([, value]) => value !== undefined && value !== "").map(([label, value]) => <div key={label}><dt className="text-xs text-text-tertiary">{label}</dt><dd className="break-words font-semibold text-brand-dark">{value}</dd></div>)}
                      </dl> : null}
                      <p>
                        Confirmación al cliente
                        {item.correoClienteDetalle ? `: ${item.correoClienteDetalle}` : ": enviada desde contacto@opticaycristal.cl."}
                      </p>
                      <p className="mt-1">
                        Aviso al equipo en <span className="font-semibold text-brand-dark">{item.correoDestino}</span>
                        {item.correoDetalle ? `. ${item.correoDetalle}` : "."}
                      </p>
                      <p className="mt-1">
                        Autorización de datos: {item.autorizacionDatos ? "sí" : "no"}.
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
