"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  relationshipLabels,
  followupLabels,
  type WorkspaceData,
  type WorkspaceCompany,
  type Followup,
} from "@/lib/radar/workspace-model";
import styles from "./RadarWorkspace.module.css";
type View = "dashboard" | "clients" | "followups";
const date = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("es-CL", {
        timeZone: "America/Santiago",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Sin registro";
async function post(path: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/admin/radar/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    d = await r.json();
  if (!r.ok) throw Error(d.error || "No se pudo guardar.");
  return d;
}
export function RadarWorkspace({
  view,
  onOpenCompany,
  onNavigate,
}: {
  view: View;
  onOpenCompany: (id: string) => void;
  onNavigate: (
    view: "buscar" | "prospectos" | "campanas" | "seguimientos",
  ) => void;
}) {
  const [data, setData] = useState<WorkspaceData | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [relation, setRelation] = useState(""),
    [page, setPage] = useState(0),
    [busy, setBusy] = useState(false),
    [followFilter, setFollowFilter] = useState("pending"),
    [selected, setSelected] = useState<Followup | null>(null),
    [addCompany, setAddCompany] = useState<WorkspaceCompany | null>(null),
    [importOpen, setImportOpen] = useState(false),
    [upload, setUpload] = useState<{ format: string; file: string } | null>(
      null,
    ),
    [preview, setPreview] = useState<{
      valid: number;
      duplicates: number;
      errors: { row: number; error: string }[];
      rows: { row: number; company: string; email: string }[];
    } | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null),
    dialogOpen = !!selected || !!addCompany || importOpen;
  useEffect(() => {
    if (!dialogOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog
      ?.querySelector<HTMLElement>("button,input,select,textarea,a")
      ?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setAddCompany(null);
        setImportOpen(false);
      }
      if (e.key !== "Tab") return;
      const items = dialog?.querySelectorAll<HTMLElement>(
        "button:not(:disabled),input,select,textarea,a[href]",
      );
      if (!items?.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [dialogOpen]);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const r = await fetch(
            `/api/admin/radar/workspace?q=${encodeURIComponent(query)}&relation=${encodeURIComponent(relation)}&page=${page}`,
            { signal, cache: "no-store" },
          ),
          d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (!signal?.aborted) {
          setData(d);
          setError("");
        }
      } catch (e) {
        if (!signal?.aborted)
          setError(e instanceof Error ? e.message : "Error de conexión.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [query, relation, page],
  );
  useEffect(() => {
    const c = new AbortController();
    const timer = setTimeout(() => void refresh(c.signal), 250);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [refresh]);
  async function action(body: Record<string, unknown>, message: string) {
    setBusy(true);
    setNotice("");
    try {
      await post("workspace", body);
      setNotice(message);
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function loadFile(file: File) {
    setPreview(null);
    if (file.size > 1000000) {
      setError("El archivo supera 1 MB.");
      return;
    }
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const value = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setUpload({ format: "xlsx", file: value });
      } else setUpload({ format: "csv", file: await file.text() });
    } catch {
      setError("No se pudo leer el archivo.");
    }
  }
  async function importFile(commit: boolean) {
    if (!upload) return;
    setBusy(true);
    setError("");
    try {
      const d = await post("workspace/import", { ...upload, commit });
      if (commit) {
        setNotice(
          `${d.imported} contactos incorporados, ${d.duplicates} duplicados omitidos, ${d.errors.length} filas con error.`,
        );
        setImportOpen(false);
        setUpload(null);
        setPreview(null);
        await refresh();
      } else setPreview(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de importación.");
    } finally {
      setBusy(false);
    }
  }
  const pending =
    data?.followups.filter(
      (f) => !["closed", "not_interested", "automatic"].includes(f.status),
    ) || [];
  return (
    <section
      className={styles.workspace}
      aria-label={
        view === "clients"
          ? "Clientes"
          : view === "followups"
            ? "Seguimientos"
            : "Dashboard comercial"
      }
    >
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {loading && !data && <p role="status">Consultando los registros…</p>}
      {data && view === "dashboard" && (
        <>
          <div className={styles.kpis}>
            {[
              [data.kpis.companies, "Empresas guardadas"],
              [data.kpis.uniqueEmails, "Emails únicos"],
              [data.kpis.ready, "Listos para campañas"],
              [data.kpis.followups, "Seguimientos activos"],
            ].map(([value, label]) => (
              <article key={String(label)}>
                <strong>{value}</strong>
                <span>{label}</span>
              </article>
            ))}
          </div>
          <div className={styles.split}>
            <section className={styles.surface}>
              <h2>La próxima acción</h2>
              <div className={styles.actionRow}>
                <div>
                  <b>{data.kpis.pending} contactos pendientes de llamada</b>
                  <p>
                    Confirma el contacto y habilita el envío cuando hayan
                    aceptado.
                  </p>
                </div>
                <button onClick={() => onNavigate("prospectos")}>
                  Ver clientes
                </button>
              </div>
              <div className={styles.actionRow}>
                <div>
                  <b>
                    {data.kpis.companies - data.kpis.withEmail} empresas sin
                    correo
                  </b>
                  <p>Completa los datos desde sus páginas corporativas.</p>
                </div>
                <button onClick={() => onNavigate("buscar")}>
                  Abrir Radar
                </button>
              </div>
              <div className={styles.actionRow}>
                <div>
                  <b>{data.kpis.interested} empresas interesadas</b>
                  <p>Interés confirmado por formulario o por el ejecutivo.</p>
                </div>
                <button onClick={() => onNavigate("seguimientos")}>
                  Atender
                </button>
              </div>
            </section>
            <section className={styles.surface}>
              <h2>Resultados registrados</h2>
              <dl className={styles.stats}>
                {[
                  ["Envíos aceptados", data.kpis.sent],
                  ["Entregados", data.kpis.delivered],
                  ["Aperturas registradas", data.kpis.opened],
                  ["Sin apertura registrada", data.kpis.noOpen],
                  ["Rechazados o rebotados", data.kpis.rejected],
                  ["Clics en CTA", data.kpis.clicked],
                  ["Empresas que respondieron", data.kpis.replied],
                  ["Emails con rebote permanente", data.kpis.bounced],
                  ["Bajas solicitadas", data.kpis.unsubscribed],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p className={styles.help}>
                Una apertura no prueba lectura. Las respuestas y solicitudes son
                la señal para iniciar una conversación.
              </p>
            </section>
          </div>
          <section className={styles.surface}>
            <div className={styles.sectionHead}>
              <h2>Respuestas que requieren atención</h2>
              <button onClick={() => onNavigate("seguimientos")}>
                Ver bandeja
              </button>
            </div>
            {pending.slice(0, 4).map((f) => (
              <div className={styles.actionRow} key={f.id}>
                <div>
                  <b>{f.company_name}</b>
                  <p>
                    {f.subject} · {followupLabels[f.status]} ·{" "}
                    {date(f.received_at)}
                  </p>
                </div>
                <span>{f.owner}</span>
              </div>
            ))}
            {!pending.length && (
              <p className={styles.help}>
                Las respuestas y solicitudes aparecerán aquí cuando se reciban.
              </p>
            )}
          </section>
        </>
      )}
      {data && view === "clients" && (
        <>
          <div className={styles.tools}>
            <input
              aria-label="Buscar empresa o email"
              placeholder="Buscar empresa o email"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
            <select
              aria-label="Filtrar relación comercial"
              value={relation}
              onChange={(e) => {
                setRelation(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Todas las relaciones</option>
              {Object.entries(relationshipLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button onClick={() => setImportOpen(true)}>
              Importar contactos
            </button>
            <a href="/api/admin/radar/workspace/excel">Exportar Excel</a>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Emails y marketing</th>
                  <th>Relación</th>
                  <th>Registros de campaña</th>
                  <th>Gestión</th>
                </tr>
              </thead>
              <tbody>
                {data.companies.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button
                        className={styles.companyButton}
                        onClick={() => onOpenCompany(p.id)}
                      >
                        {p.name}
                      </button>
                      <small>{p.address || "Dirección sin publicar"}</small>
                      <small>
                        {p.employee_estimate
                          ? `≈ ${p.employee_estimate} trabajadores`
                          : "Dotación pendiente"}
                      </small>
                      {p.phone && <a href={`tel:${p.phone}`}>{p.phone}</a>}
                    </td>
                    <td>
                      {p.contacts.map((c) => (
                        <div key={c.id} className={styles.contact}>
                          <a href={`mailto:${c.email}`}>{c.email}</a>
                          <span>
                            {c.suppression_reason || c.status === "unsubscribed"
                              ? "Excluido de campañas"
                              : c.marketing_ready
                                ? "Habilitado"
                                : "Pendiente de llamada"}
                          </span>
                          {!c.suppression_reason &&
                            c.status !== "unsubscribed" && (
                              <button
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    !c.marketing_ready &&
                                    !window.confirm(
                                      `¿Confirmas que ${c.email} aceptó recibir propuestas durante la llamada? Los respaldos permanecen en su sistema interno.`,
                                    )
                                  )
                                    return;
                                  void action(
                                    {
                                      action: "contactReady",
                                      id: c.id,
                                      ready: !c.marketing_ready,
                                    },
                                    c.marketing_ready
                                      ? "Contacto deshabilitado."
                                      : "Contacto habilitado tras la llamada.",
                                  );
                                }}
                              >
                                {c.marketing_ready
                                  ? "Pausar marketing"
                                  : "Confirmar llamada"}
                              </button>
                            )}
                        </div>
                      ))}
                      {!p.contacts.length && (
                        <span className={styles.help}>
                          Sin correo publicado
                        </span>
                      )}
                      <button
                        className={styles.linkButton}
                        onClick={() => setAddCompany(p)}
                      >
                        Añadir email
                      </button>
                    </td>
                    <td>
                      <select
                        aria-label={`Relación de ${p.name}`}
                        disabled={busy}
                        value={p.relationship_status}
                        onChange={(e) =>
                          void action(
                            {
                              action: "relationship",
                              id: p.id,
                              status: e.target.value,
                            },
                            "Relación actualizada.",
                          )
                        }
                      >
                        {Object.entries(relationshipLabels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <b>{p.sent_count} envíos</b>
                      <small>Último: {date(p.last_sent_at)}</small>
                    </td>
                    <td>
                      <button onClick={() => onOpenCompany(p.id)}>
                        Registrar gestión
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.companies.length && (
              <p className={styles.empty}>
                No hay empresas para estos filtros. Busca en el Radar o importa
                tu lista.
              </p>
            )}
          </div>
          <div className={styles.pagination}>
            <button
              disabled={!page || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span>Página {page + 1} · hasta 50 empresas</span>
            <button
              disabled={!data.hasMore || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
      {data && view === "followups" && (
        <>
          {!data.configuration.inboundReady && (
            <p className={styles.notice}>
              Recepción automática pendiente de configurar en Resend. Las
              solicitudes del formulario web y las conversaciones registradas ya
              generan seguimiento.
            </p>
          )}
          <div className={styles.tools}>
            <select
              aria-label="Filtrar seguimientos"
              value={followFilter}
              onChange={(e) => setFollowFilter(e.target.value)}
            >
              <option value="pending">Pendientes de atención</option>
              <option value="interested">Interesados</option>
              <option value="all">Todos</option>
              <option value="quarantine">Por verificar</option>
            </select>
            <button onClick={() => void refresh()}>Actualizar bandeja</button>
            <span>{pending.length} pendientes mostrados</span>
          </div>
          <div className={styles.followups}>
            {data.followups
              .filter(
                (f) =>
                  followFilter === "all" ||
                  (followFilter === "pending" &&
                    !["closed", "not_interested", "automatic"].includes(
                      f.status,
                    )) ||
                  f.status === followFilter,
              )
              .map((f) => (
                <article key={f.id} className={styles.surface}>
                  <div className={styles.sectionHead}>
                    <div>
                      <span className={styles.badge}>
                        {followupLabels[f.status]}
                      </span>
                      <h3>{f.company_name}</h3>
                      <p>
                        {f.email || f.source} · {date(f.received_at)}
                      </p>
                    </div>
                    <button onClick={() => setSelected(f)}>Gestionar</button>
                  </div>
                  <b>{f.subject}</b>
                  <p className={styles.message}>{f.message.slice(0, 500)}</p>
                  <small>
                    {f.owner} · Próxima acción: {f.next_action} ·{" "}
                    {date(f.due_at)}
                  </small>
                </article>
              ))}
          </div>
          {!data.followups.length && (
            <p className={styles.empty}>
              Cuando un cliente responda o solicite información, se creará un
              seguimiento para el ejecutivo.
            </p>
          )}
          {data.followupsTruncated && (
            <p className={styles.help}>
              Se muestran los primeros 100 seguimientos. La API mantiene los
              registros completos.
            </p>
          )}
        </>
      )}
      {importOpen && (
        <div className={styles.overlay}>
          <section
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
          >
            <button
              onClick={() => {
                setImportOpen(false);
                setPreview(null);
              }}
            >
              Cerrar
            </button>
            <h2 id="import-title">Importar contactos</h2>
            <p>
              Una fila por email. Hasta 500 contactos; se omiten correos ya
              registrados y duplicados del archivo.
            </p>
            <a href="/api/admin/radar/workspace/excel?template=true">
              Descargar plantilla Excel
            </a>
            <input
              type="file"
              accept=".xlsx,.csv"
              aria-label="Archivo de contactos"
              onChange={(e) => {
                if (e.target.files?.[0]) void loadFile(e.target.files[0]);
              }}
            />
            <button
              disabled={busy || !upload}
              onClick={() => void importFile(false)}
            >
              Revisar archivo
            </button>
            {preview && (
              <>
                <p>
                  {preview.valid} nuevos · {preview.duplicates} duplicados ·{" "}
                  {preview.errors.length} errores
                </p>
                <ul>
                  {preview.rows.map((r) => (
                    <li key={r.row}>
                      {r.company} · {r.email}
                    </li>
                  ))}
                </ul>
                {preview.errors.map((e) => (
                  <p key={e.row}>
                    Fila {e.row}: {e.error}
                  </p>
                ))}
                <button
                  disabled={busy || !preview.valid}
                  onClick={() => void importFile(true)}
                >
                  Importar {preview.valid} contactos
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {addCompany && (
        <div className={styles.overlay}>
          <section
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-contact"
          >
            <button onClick={() => setAddCompany(null)}>Cerrar</button>
            <h2 id="add-contact">Email de {addCompany.name}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  b = Object.fromEntries(new FormData(form));
                setBusy(true);
                try {
                  await post("crm", {
                    action: "contact",
                    prospectId: addCompany.id,
                    ...b,
                  });
                  setAddCompany(null);
                  setNotice("Correo incorporado al CRM.");
                  await refresh();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "No se pudo guardar.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Nombre
                <input name="name" maxLength={200} />
              </label>
              <label>
                Cargo
                <input name="role" maxLength={200} />
              </label>
              <button disabled={busy}>Guardar contacto</button>
            </form>
          </section>
        </div>
      )}
      {selected && (
        <div className={styles.overlay}>
          <section
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="followup-title"
          >
            <button onClick={() => setSelected(null)}>Cerrar</button>
            <h2 id="followup-title">Seguimiento · {selected.company_name}</h2>
            <p className={styles.message}>{selected.message}</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const b = Object.fromEntries(new FormData(e.currentTarget));
                if (
                  await action(
                    {
                      action: "followup",
                      id: selected.id,
                      ...b,
                      dueAt: new Date(String(b.dueAt)).toISOString(),
                    },
                    "Seguimiento actualizado.",
                  )
                )
                  setSelected(null);
              }}
            >
              <label>
                Estado
                <select name="status" defaultValue={selected.status}>
                  {Object.entries(followupLabels)
                    .filter(([k]) => k !== "automatic")
                    .map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Ejecutivo
                <input
                  name="owner"
                  defaultValue={selected.owner}
                  required
                  maxLength={200}
                />
              </label>
              <label>
                Próxima acción
                <textarea
                  name="nextAction"
                  defaultValue={selected.next_action}
                  required
                  maxLength={1000}
                />
              </label>
              <label>
                Fecha
                <input
                  type="datetime-local"
                  name="dueAt"
                  required
                  defaultValue={new Date(
                    Date.parse(selected.due_at) -
                      new Date(selected.due_at).getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16)}
                />
              </label>
              <button disabled={busy}>Guardar seguimiento</button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
