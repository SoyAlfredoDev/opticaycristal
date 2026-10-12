"use client";
import { useCallback, useEffect, useState } from "react";
import {
  dealStages,
  dealLabels,
  type CrmSnapshot,
  type CrmCampaign,
  type CrmTask,
  type CrmDeal,
} from "@/lib/radar/crm-model";
import styles from "./RadarCrm.module.css";
import { campaignTemplates, campaignTemplate } from "@/lib/radar/campaign-templates";
type View = "gestiones" | "oportunidades" | "campanas" | "resultados";
const date = (value: string) =>
  new Date(value).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  });
const eventLabels: Record<string, string> = {
  "activity.llamada": "Llamada",
  "activity.correo": "Correo",
  "activity.reunion": "Reunión",
  "activity.nota": "Nota",
  "campaign.insight": "Aprendizaje de campaña",
  "contact.consent": "Consentimiento registrado",
  "task.created": "Tarea programada",
  "task.completed": "Tarea resuelta",
  "deal.created": "Oportunidad creada",
  "deal.stage": "Avance de oportunidad",
  "campaign.created": "Campaña creada",
  "campaign.edited": "Borrador editado",
  "campaign.status": "Estado de campaña",
  "send.accepted": "Envío aceptado",
  "email.sent": "Enviado",
  "email.delivered": "Entregado",
  "email.opened": "Apertura observada",
  "email.clicked": "Clic observado",
  "email.bounced": "Rebote permanente",
  "email.complained": "Queja",
  "email.failed": "Fallo de envío",
  "email.suppressed": "Bloqueado",
  "cta.redirect": "Acceso al CTA",
  conversation: "Conversación registrada",
  unsubscribe: "Baja solicitada",
};
async function api(body: Record<string, unknown>) {
  const response = await fetch("/api/admin/radar/crm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo guardar.");
  return data;
}
function fields(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries());
}
export function RadarCrm({
  initialView = "gestiones",
}: {
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView),
    [company, setCompany] = useState(""),
    [data, setData] = useState<CrmSnapshot | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [campaign, setCampaign] = useState<CrmCampaign | null>(null),
    [editingCampaign, setEditingCampaign] = useState<CrmCampaign | null>(null),
    [task, setTask] = useState<CrmTask | null>(null),
    [deal, setDeal] = useState<CrmDeal | null>(null),
    [selection, setSelection] = useState<string[]>([]),
    [preview, setPreview] = useState(""),
    [ctaTypes, setCtaTypes] = useState<string[]>(["web"]),
    [templateId, setTemplateId] = useState("convenio"),
    [now, setNow] = useState(0);
  const chosenTemplate = campaignTemplate(editingCampaign?.template_id || templateId);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `/api/admin/radar/crm${company ? `?prospectId=${encodeURIComponent(company)}` : ""}`,
          { signal, cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (signal?.aborted) return;
        setData(result);
        setNow(Date.now());
        setError("");
      } catch (e) {
        if (!signal?.aborted)
          setError(e instanceof Error ? e.message : "Error de conexión");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [company],
  );
  useEffect(() => {
    const c = new AbortController();
    void fetch(
      `/api/admin/radar/crm${company ? `?prospectId=${encodeURIComponent(company)}` : ""}`,
      { signal: c.signal, cache: "no-store" },
    )
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        return result;
      })
      .then((result) => {
        if (!c.signal.aborted) {
          setData(result);
          setNow(Date.now());
          setError("");
        }
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Error de conexión");
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [company]);
  async function mutate(body: Record<string, unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api(body);
      setNotice(message);
      await refresh();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>, action: string) {
    e.preventDefault();
    const form = e.currentTarget,
      b = fields(form);
    if (b.dueAt) b.dueAt = new Date(String(b.dueAt)).toISOString();
    if (b.consentAt) b.consentAt = new Date(String(b.consentAt)).toISOString();
    const result = await mutate(
      {
        ...b,
        action,
        id: crypto.randomUUID(),
        prospectId: company,
        consent: b.consent === "on",
      },
      "Registro guardado en Neon.",
    );
    if (result) form.reset();
  }
  async function saveCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      b = fields(form);
    const variants = ctaTypes.map((kind, index) => ({
      id: `v${index + 1}`,
      kind,
      label: String(b[`label_${kind}`]),
      destination: kind === "web" ? "" : String(b[`destination_${kind}`]),
    }));
    if (
      await mutate(
        {
          action: editingCampaign ? "campaignUpdate" : "campaign",
          id: editingCampaign?.id || crypto.randomUUID(),
          name: b.name,
          objective: b.objective,
          subject: b.subject,
          body: b.body,
          templateId: b.templateId,
          variants,
        },
        "Borrador guardado. Revisa su contenido antes de aprobar.",
      )
    ) {
      form.reset();
      setEditingCampaign(null);
      setCtaTypes(["web"]);
    }
  }
  const selectedCampaign =
    data?.campaigns.find((c) => c.id === campaign?.id) || campaign;
  const eligible =
    data?.contacts.filter(
      (c) =>
        c.status === "subscribed" &&
        !(c as unknown as { suppression_reason?: string }).suppression_reason,
    ) || [];
  async function showPreview(c: CrmCampaign) {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/radar/crm/preview?campaignId=${encodeURIComponent(c.id)}`,
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPreview(result.html);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo previsualizar");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.workspace} aria-label="CRM y email marketing">
      <header className={styles.head}>
        <div>
          <span className={styles.eyebrow}>RELACIONES COMERCIALES</span>
          <h2>De la primera gestión al convenio</h2>
          <p>
            Un historial por empresa, una próxima acción y resultados medibles.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            void refresh();
          }}
          disabled={busy || loading}
        >
          Actualizar
        </button>
      </header>
      <nav className={styles.tabs} aria-label="Áreas del CRM">
        {(
          [
            ["gestiones", "Gestiones y contactos"],
            ["oportunidades", "Oportunidades"],
            ["campanas", "Campañas"],
            ["resultados", "Resultados y aprendizaje"],
          ] as [View, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={view === id}
            onClick={() => {
              setView(id);
              setPreview("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className={styles.filter}>
        <label>
          Empresa
          <select
            disabled={busy || loading}
            value={company}
            onChange={(e) => {
              setLoading(true);
              setCompany(e.target.value);
              setSelection([]);
              setTask(null);
              setDeal(null);
            }}
          >
            <option value="">Todas las empresas</option>
            {data?.companies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <small>
          Selecciona una empresa para crear contactos, tareas u oportunidades.
        </small>
      </div>
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
      {loading && <p role="status">Consultando el CRM…</p>}
      {data && (
        <>
          <div className={styles.metrics}>
            <div>
              <b>{data.tasks.filter((t) => t.status === "pending").length}</b>
              <span>Tareas pendientes mostradas</span>
            </div>
            <div>
              <b>
                {
                  data.tasks.filter(
                    (t) => t.status === "pending" && Date.parse(t.due_at) < now,
                  ).length
                }
              </b>
              <span>Seguimientos vencidos mostrados</span>
            </div>
            <div>
              <b>{eligible.length}</b>
              <span>Contactos autorizados mostrados</span>
            </div>
            <div>
              <b>
                {
                  data.deals.filter(
                    (d) => d.stage !== "perdido" && d.stage !== "ganado",
                  ).length
                }
              </b>
              <span>Oportunidades abiertas mostradas</span>
            </div>
          </div>
          {Object.values(data.truncated).some(Boolean) && (
            <p className={styles.notice}>
              Hay más registros que los mostrados. Filtra por empresa; el agente
              dispone de una API paginada para recorrerlos.
            </p>
          )}
          {view === "gestiones" && (
            <>
              <div className={styles.grid}>
                <section className={styles.card}>
                  <h3>Próxima gestión</h3>
                  <form onSubmit={(e) => void submit(e, "task")}>
                    <label>
                      Acción
                      <input
                        name="title"
                        required
                        maxLength={300}
                        placeholder="Coordinar reunión de beneficios"
                      />
                    </label>
                    <label>
                      Responsable
                      <input
                        name="owner"
                        required
                        maxLength={200}
                        placeholder="Ejecutivo o agente"
                      />
                    </label>
                    <label>
                      Vencimiento
                      <input name="dueAt" type="datetime-local" required />
                    </label>
                    <button disabled={!company || busy}>
                      Programar gestión
                    </button>
                  </form>
                  <h3>Agenda</h3>
                  {data.tasks.map((t) => (
                    <article key={t.id} className={styles.row}>
                      <b>{t.title}</b>
                      <span>
                        {
                          (t as CrmTask & { company_name?: string })
                            .company_name
                        }{" "}
                        · {t.owner}
                      </span>
                      <small
                        className={
                          t.status === "pending" && Date.parse(t.due_at) < now
                            ? styles.overdue
                            : ""
                        }
                      >
                        {date(t.due_at)} ·{" "}
                        {t.status === "pending"
                          ? "Pendiente"
                          : t.status === "done"
                            ? "Completada"
                            : "Cancelada"}
                      </small>
                      {t.result && <p>{t.result}</p>}
                      {t.status === "pending" && (
                        <button
                          className={styles.secondary}
                          onClick={() => setTask(t)}
                        >
                          Registrar resultado
                        </button>
                      )}
                    </article>
                  ))}
                  {!data.tasks.length && (
                    <p className={styles.empty}>Todavía no hay tareas.</p>
                  )}
                  {task && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const b = fields(e.currentTarget);
                        if (
                          await mutate(
                            {
                              action: "taskStatus",
                              id: task.id,
                              status: b.status,
                              result: b.result,
                            },
                            "Gestión resuelta y guardada en el historial.",
                          )
                        )
                          setTask(null);
                      }}
                    >
                      <h4>{task.title}</h4>
                      <label>
                        Resultado
                        <textarea name="result" required maxLength={2000} />
                      </label>
                      <label>
                        Estado
                        <select name="status">
                          <option value="done">Completada</option>
                          <option value="cancelled">Cancelada</option>
                        </select>
                      </label>
                      <button disabled={busy}>Guardar resultado</button>
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => setTask(null)}
                      >
                        Cancelar edición
                      </button>
                    </form>
                  )}
                </section>
                <section className={styles.card}>
                  <h3>Contacto con autorización de marketing</h3>
                  <p>
                    Encontrar un correo en la web no lo incorpora
                    automáticamente a las campañas.
                  </p>
                  <form onSubmit={(e) => void submit(e, "contact")}>
                    <label>
                      Correo comercial
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={254}
                      />
                    </label>
                    <label>
                      Nombre
                      <input name="name" maxLength={200} />
                    </label>
                    <label>
                      Cargo o área
                      <input name="role" maxLength={200} />
                    </label>
                    <label>
                      Fecha y hora de la autorización
                      <input name="consentAt" type="datetime-local" required />
                    </label>
                    <label>
                      Evidencia del consentimiento
                      <textarea
                        name="consentEvidence"
                        required
                        maxLength={1500}
                        placeholder="Fecha, medio y referencia de la autorización"
                      />
                    </label>
                    <label className={styles.checkbox}>
                      <input name="consent" type="checkbox" required /> Confirmo
                      autorización explícita para comunicaciones comerciales.
                    </label>
                    <button disabled={!company || busy}>
                      Guardar contacto autorizado
                    </button>
                  </form>
                  {data.contacts.map((c) => (
                    <article className={styles.row} key={c.id}>
                      <b>{c.email}</b>
                      <span>
                        {c.name} · {c.role}
                      </span>
                      <small>
                        {c.status === "subscribed"
                          ? "Autorizado"
                          : "Dado de baja"}{" "}
                        · {date(c.consented_at)}
                      </small>
                      <p>{c.consent_evidence}</p>
                    </article>
                  ))}
                  {!data.contacts.length && (
                    <p className={styles.empty}>
                      No hay contactos de marketing registrados.
                    </p>
                  )}
                </section>
              </div>
              <section className={styles.card}>
                <h3>Conversación confirmada</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget,
                      b = fields(form);
                    if (
                      await mutate(
                        {
                          action: "conversation",
                          id: crypto.randomUUID(),
                          prospectId: company,
                          note: b.note,
                          deliveryId: b.deliveryId,
                        },
                        "Conversación registrada.",
                      )
                    )
                      form.reset();
                  }}
                >
                  <label>
                    Envío que originó la conversación (opcional)
                    <select name="deliveryId">
                      <option value="">Sin atribución a una campaña</option>
                      {data.deliveries
                        .filter(
                          (d) =>
                            company &&
                            data.contacts.some(
                              (c) =>
                                c.id === d.contact_id &&
                                c.prospect_id === company,
                            ),
                        )
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.email} · {d.variant_id} · {date(d.created_at)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Resultado o interés del cliente
                    <textarea name="note" required maxLength={2000} />
                  </label>
                  <button disabled={!company || busy}>
                    Registrar conversación
                  </button>
                </form>
              </section>
              <section className={styles.card}>
                <h3>Historial comercial</h3>
                {data.events.map((e) => (
                  <article className={styles.row} key={e.id}>
                    <b>{eventLabels[e.kind] || e.kind}</b>
                    <span>
                      {e.company_name || "Campaña"} · {date(e.occurred_at)} ·{" "}
                      {e.source === "agent" ? "Agente" : e.source}
                    </span>
                    {["note", "message", "result", "nextAction", "title"].map(
                      (k) =>
                        e.metadata[k] ? (
                          <p key={k}>{String(e.metadata[k])}</p>
                        ) : null,
                    )}
                    {e.metadata.suspectedAutomation === true && (
                      <small>
                        Posible acceso automático; excluido de clics
                        principales.
                      </small>
                    )}
                  </article>
                ))}
                {!data.events.length && (
                  <p className={styles.empty}>
                    Las gestiones y eventos aparecerán aquí.
                  </p>
                )}
              </section>
            </>
          )}
          {view === "oportunidades" && (
            <>
              <section className={styles.card}>
                <h3>Nueva oportunidad</h3>
                <form
                  className={styles.inlineForm}
                  onSubmit={(e) => void submit(e, "deal")}
                >
                  <label>
                    Nombre
                    <input name="title" required maxLength={200} />
                  </label>
                  <label>
                    Modalidad
                    <select name="offering">
                      <option value="convenio">Convenio</option>
                      <option value="jornada">Jornada</option>
                      <option value="ambas">Ambas</option>
                    </select>
                  </label>
                  <label>
                    Responsable
                    <input name="owner" required maxLength={200} />
                  </label>
                  <label>
                    Monto esperado CLP
                    <input
                      name="amount"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue="0"
                    />
                  </label>
                  <label>
                    Cierre esperado
                    <input name="closeDate" type="date" />
                  </label>
                  <label>
                    Próxima acción
                    <input name="nextAction" required maxLength={500} />
                  </label>
                  <button disabled={!company || busy}>Crear oportunidad</button>
                </form>
              </section>
              <div className={styles.pipeline}>
                {dealStages.map((stage) => (
                  <section key={stage}>
                    <h3>
                      {dealLabels[stage]}{" "}
                      <small>
                        {data.deals.filter((d) => d.stage === stage).length}
                      </small>
                    </h3>
                    {data.deals
                      .filter((d) => d.stage === stage)
                      .map((d) => (
                        <button
                          key={d.id}
                          className={styles.deal}
                          onClick={() => setDeal(d)}
                        >
                          <b>{d.title}</b>
                          <span>
                            {
                              (d as CrmDeal & { company_name?: string })
                                .company_name
                            }
                          </span>
                          <small>
                            {d.owner} ·{" "}
                            {Number(d.amount).toLocaleString("es-CL")} CLP
                          </small>
                          <span>{d.next_action}</span>
                        </button>
                      ))}
                  </section>
                ))}
              </div>
              {deal && (
                <section className={styles.card}>
                  <h3>Actualizar: {deal.title}</h3>
                  <form
                    key={deal.id}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const b = fields(e.currentTarget);
                      if (
                        await mutate(
                          {
                            action: "dealStage",
                            id: deal.id,
                            version: deal.version,
                            stage: b.stage,
                            nextAction: b.nextAction,
                            lossReason: b.lossReason,
                          },
                          "Oportunidad actualizada.",
                        )
                      )
                        setDeal(null);
                    }}
                  >
                    <label>
                      Etapa
                      <select name="stage" defaultValue={deal.stage}>
                        {dealStages.map((s) => (
                          <option key={s} value={s}>
                            {dealLabels[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Próxima acción o evidencia del cierre
                      <textarea
                        name="nextAction"
                        required
                        defaultValue={deal.next_action}
                        maxLength={500}
                      />
                    </label>
                    <label>
                      Motivo si se perdió
                      <textarea
                        name="lossReason"
                        maxLength={1000}
                        defaultValue={deal.loss_reason}
                      />
                    </label>
                    <button disabled={busy}>Guardar avance</button>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => setDeal(null)}
                    >
                      Cancelar edición
                    </button>
                  </form>
                </section>
              )}
            </>
          )}
          {view === "campanas" && (
            <>
              <p className={styles.notice}>
                Resend:{" "}
                {data.configuration.resend ? "clave configurada" : "sin clave"}{" "}
                · Webhook:{" "}
                {data.configuration.webhook ? "configurado" : "pendiente"} ·
                Envío:{" "}
                {data.configuration.sendingEnabled
                  ? "habilitado"
                  : "desactivado"}
                .{" "}
                {data.configuration.missing.length > 0 &&
                  `Falta configurar: ${data.configuration.missing.join(", ")}.`}
              </p>
              <div className={styles.grid}>
                <section className={styles.card}>
                  <h3>Diseñar campaña</h3>
                  <p>Contactos con consentimiento vigente: <strong>{eligible.length}</strong>. {!eligible.length && "Registra o importa contactos y su evidencia de autorización antes de preparar destinatarios."}</p>
                  <p>
                    Un objetivo y un CTA por correo. Mantén el mismo contenido y
                    cambia el canal para comparar.
                  </p>
                  <form
                    key={editingCampaign?.id || `new-campaign-${templateId}`}
                    onSubmit={(e) => void saveCampaign(e)}
                  >
                    <label>
                      Formato corporativo
                      <select name="templateId" value={chosenTemplate.id} onChange={e => {
                        setTemplateId(e.target.value);
                        if (editingCampaign) setEditingCampaign({ ...editingCampaign, template_id: e.target.value });
                      }}>
                        {campaignTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </label>
                    <button type="button" disabled={busy} onClick={async () => {
                      setBusy(true);
                      try {
                        const r = await fetch(`/api/admin/radar/crm/templates?id=${chosenTemplate.id}`);
                        const result = await r.json();
                        if (!r.ok) throw new Error(result.error);
                        setPreview(result.html);
                      } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el formato."); }
                      finally { setBusy(false); }
                    }}>Ver formato corporativo</button>
                    <label>
                      Nombre interno
                      <input
                        name="name"
                        required
                        maxLength={200}
                        defaultValue={editingCampaign?.name || chosenTemplate.name}
                      />
                    </label>
                    <label>
                      Objetivo
                      <select
                        name="objective"
                        defaultValue={editingCampaign?.objective || chosenTemplate.objective}
                      >
                        <option value="convenio">Conseguir convenios</option>
                        <option value="jornada">Coordinar jornadas</option>
                        <option value="ambas">Ambas modalidades</option>
                      </select>
                    </label>
                    <label>
                      Asunto
                      <input
                        name="subject"
                        defaultValue={editingCampaign?.subject || chosenTemplate.subject}
                        required
                        maxLength={150}
                        placeholder="Conversemos sobre beneficios ópticos para {{empresa}}"
                      />
                    </label>
                    <label>
                      Mensaje
                      <textarea
                        name="body"
                        defaultValue={editingCampaign?.body || chosenTemplate.body}
                        required
                        rows={7}
                        maxLength={5000}
                        placeholder="Presenta el beneficio y una razón concreta para conversar. Usa {{empresa}} para personalizar. Sin enlaces en el cuerpo."
                      />
                    </label>
                    <fieldset>
                      <legend>Variantes del CTA principal</legend>
                      {["web", "whatsapp", "email"].map((kind) => (
                        <div key={kind}>
                          <label className={styles.checkbox}>
                            <input
                              type="checkbox"
                              checked={ctaTypes.includes(kind)}
                              onChange={(e) =>
                                setCtaTypes(
                                  e.target.checked
                                    ? [...ctaTypes, kind]
                                    : ctaTypes.filter((k) => k !== kind),
                                )
                              }
                            />
                            {kind === "web"
                              ? "Web · recomendada"
                              : kind === "whatsapp"
                                ? "WhatsApp"
                                : "Correo"}
                          </label>
                          {ctaTypes.includes(kind) && (
                            <>
                              <label>
                                Texto del botón
                                <input
                                  name={`label_${kind}`}
                                  required
                                  maxLength={80}
                                  defaultValue={
                                    editingCampaign?.variants.find(
                                      (v) => v.kind === kind,
                                    )?.label ||
                                    (kind === "web"
                                      ? chosenTemplate.cta
                                      : kind === "whatsapp"
                                        ? "Conversar por WhatsApp"
                                        : "Conversar por correo")
                                  }
                                />
                              </label>
                              {kind !== "web" && (
                                <label>
                                  Destino
                                  <input
                                    name={`destination_${kind}`}
                                    defaultValue={
                                      editingCampaign?.variants.find(
                                        (v) => v.kind === kind,
                                      )?.destination || (kind === "whatsapp" ? "https://wa.me/56922452080" : "mailto:contacto@opticaycristal.cl")
                                    }
                                    required
                                    maxLength={500}
                                    placeholder={
                                      kind === "whatsapp"
                                        ? "https://wa.me/56…"
                                        : "mailto:correo@dominio.cl"
                                    }
                                  />
                                </label>
                              )}
                              {kind === "web" && (
                                <small>
                                  Página de beneficios del Radar con formulario
                                  y atribución a la campaña.
                                </small>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </fieldset>
                    <button disabled={busy || !ctaTypes.length}>
                      {editingCampaign ? "Guardar cambios" : "Guardar borrador"}
                    </button>
                    {editingCampaign && (
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => {
                          setEditingCampaign(null);
                          setCtaTypes(["web"]);
                        }}
                      >
                        Nuevo borrador
                      </button>
                    )}
                  </form>
                </section>
                <section className={styles.card}>
                  <h3>Campañas</h3>
                  {data.campaigns.map((c) => (
                    <article className={styles.row} key={c.id}>
                      <b>{c.name}</b>
                      <span>{c.subject}</span>
                      <small>
                        {
                          {
                            draft: "Borrador",
                            approved: "Aprobada",
                            paused: "Pausada",
                            archived: "Archivada",
                          }[c.status]
                        }{" "}
                        · {c.variants.map((v) => v.kind).join(" / ")}
                      </small>
                      <div className={styles.actions}>
                        <button
                          className={styles.secondary}
                          onClick={() => {
                            setCampaign(c);
                            setPreview("");
                            setSelection([]);
                          }}
                        >
                          Gestionar
                        </button>
                        {c.status === "draft" && (
                          <button
                            className={styles.secondary}
                            disabled={busy}
                            onClick={() => {
                              setEditingCampaign(c);
                              setCtaTypes(c.variants.map((v) => v.kind));
                              setPreview("");
                            }}
                          >
                            Editar borrador
                          </button>
                        )}
                        <button
                          className={styles.secondary}
                          disabled={busy}
                          onClick={() => void showPreview(c)}
                        >
                          Ver correo
                        </button>
                      </div>
                    </article>
                  ))}
                  {!data.campaigns.length && (
                    <p className={styles.empty}>
                      Todavía no hay campañas. Los borradores no envían correos.
                    </p>
                  )}
                </section>
              </div>
              {preview && (
                <section className={styles.card}>
                  <h3>Vista previa · no se envía</h3>
                  <iframe
                    title="Vista previa del correo"
                    sandbox=""
                    srcDoc={preview}
                    className={styles.preview}
                  />
                </section>
              )}
              {selectedCampaign && (
                <section className={styles.card}>
                  <h3>{selectedCampaign.name}</h3>
                  <p>
                    Los contactos se asignan de forma estable a una variante. Un
                    contacto recibe como máximo un envío de esta campaña.
                  </p>
                  <div className={styles.actions}>
                    {selectedCampaign.status !== "archived" && (
                      <>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void mutate(
                              {
                                action: "campaignStatus",
                                id: selectedCampaign.id,
                                status: "approved",
                              },
                              "Campaña aprobada. Todavía no se envía.",
                            )
                          }
                        >
                          Aprobar contenido
                        </button>
                        <button
                          className={styles.secondary}
                          disabled={busy}
                          onClick={() =>
                            void mutate(
                              {
                                action: "campaignStatus",
                                id: selectedCampaign.id,
                                status: "paused",
                              },
                              "Campaña pausada.",
                            )
                          }
                        >
                          Pausar
                        </button>
                        <button
                          className={styles.secondary}
                          disabled={busy}
                          onClick={() =>
                            void mutate(
                              {
                                action: "campaignStatus",
                                id: selectedCampaign.id,
                                status: "archived",
                              },
                              "Campaña archivada.",
                            )
                          }
                        >
                          Archivar
                        </button>
                      </>
                    )}
                  </div>
                  <h4>Destinatarios autorizados</h4>
                  <div className={styles.recipients}>
                    {eligible.map((c) => (
                      <label key={c.id} className={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={selection.includes(c.id)}
                          onChange={(e) =>
                            setSelection(
                              e.target.checked
                                ? [...selection, c.id]
                                : selection.filter((id) => id !== c.id),
                            )
                          }
                        />
                        {c.email} · {c.name}
                      </label>
                    ))}
                  </div>
                  <button
                    disabled={
                      busy ||
                      !selection.length ||
                      selection.length > 100 ||
                      selectedCampaign.status === "archived"
                    }
                    onClick={() =>
                      void mutate(
                        {
                          action: "enroll",
                          campaignId: selectedCampaign.id,
                          contactIds: selection,
                        },
                        "Destinatarios incorporados sin duplicar envíos.",
                      )
                    }
                  >
                    Preparar {selection.length} destinatarios
                  </button>
                  <p>
                    Revisa el mensaje y los destinatarios antes de ejecutar.
                    Cada ejecución procesa hasta cinco envíos; el bot podrá
                    continuar por lotes dentro del presupuesto diario.
                  </p>
                  <button
                    disabled={
                      busy ||
                      selectedCampaign.status !== "approved" ||
                      !data.configuration.sendingEnabled ||
                      !!data.configuration.missing.length
                    }
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Enviar hasta 5 correos reales de «${selectedCampaign.name}» a los destinatarios preparados y autorizados?`,
                        )
                      )
                        return;
                      const result = await mutate(
                        { action: "dispatch", campaignId: selectedCampaign.id },
                        "Lote procesado.",
                      );
                      if (result)
                        setNotice(
                          `Enviados: ${result.sent}. Fallidos: ${result.failed}. Pendientes de conciliación: ${result.uncertain}.`,
                        );
                    }}
                  >
                    Ejecutar lote de envío real
                  </button>
                </section>
              )}
              <section className={styles.card}>
                <h3>Control de envíos</h3>
                <div className={styles.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th>Empresa</th>
                        <th>Correo</th>
                        <th>Variante</th>
                        <th>Estado</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.deliveries.map((d) => (
                        <tr key={d.id}>
                          <td>{d.company_name}</td>
                          <td>{d.email}</td>
                          <td>{d.variant_id}</td>
                          <td>
                            {
                              {
                                queued: "En cola",
                                sending: "En proceso",
                                sent: "Enviado",
                                failed: "Fallido",
                                uncertain: "Conciliar",
                                cancelled: "Cancelado",
                              }[d.status]
                            }
                          </td>
                          <td>{d.error || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!data.deliveries.length && (
                  <p className={styles.empty}>
                    No hay destinatarios preparados.
                  </p>
                )}
              </section>
            </>
          )}
          {view === "resultados" && (
            <section className={styles.card}>
              <h3>Aprender de las conversaciones y los cierres</h3>
              <p>
                Compara dentro de una misma campaña. El indicador principal es
                conversación confirmada / entregados. Los clics son señales; las
                aperturas son orientativas. Un clic en WhatsApp o correo no
                confirma que se haya enviado un mensaje.
              </p>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Campaña / CTA</th>
                      <th>Asignados</th>
                      <th>Enviados</th>
                      <th>Entregados</th>
                      <th>Aperturas*</th>
                      <th>Clics CTA*</th>
                      <th>Accesos CTA*</th>
                      <th>Conversaciones</th>
                      <th>Conversión</th>
                      <th>Cierres asociados**</th>
                      <th>Rebotes / quejas / bajas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.metrics.map((m) => (
                      <tr key={`${m.campaign_id}-${m.variant_id}`}>
                        <td>
                          {data.campaigns.find((c) => c.id === m.campaign_id)
                            ?.name || m.campaign_id}
                          <br />
                          <b>{m.kind}</b>
                        </td>
                        <td>{m.assigned}</td>
                        <td>{m.sent}</td>
                        <td>{m.delivered}</td>
                        <td>{m.opened}</td>
                        <td>{m.clicked}</td>
                        <td>{m.redirected}</td>
                        <td>{m.conversations}</td>
                        <td>
                          {m.delivered
                            ? `${((m.conversations / m.delivered) * 100).toFixed(1)}%`
                            : "Sin base"}
                        </td>
                        <td>{m.won}</td>
                        <td>
                          {m.bounced} / {m.complained} / {m.unsubscribed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.metrics.length && (
                <p className={styles.empty}>
                  Aún no hay resultados. Las métricas se generan con envíos y
                  eventos reales.
                </p>
              )}
              <small>
                * Destinatarios únicos por variante. Los accesos del enlace y
                los clics reportados por Resend se muestran separados para
                evitar sumarlos dos veces. La detección de automatización es
                orientativa; no identifica todos los escáneres.
                <br />
                ** Empresas con conversación atribuida y oportunidad ganada
                después del envío; asociación temporal, no prueba causal. No se
                declara una variante ganadora con muestras pequeñas.
              </small>
              <h3>Notas y próximos experimentos</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  if (
                    await mutate(
                      {
                        action: "insight",
                        id: crypto.randomUUID(),
                        ...fields(form),
                      },
                      "Aprendizaje guardado con su fundamento.",
                    )
                  )
                    form.reset();
                }}
              >
                <label>
                  Campaña
                  <select name="campaignId" required>
                    <option value="">Selecciona campaña</option>
                    {data.campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Observación o hipótesis
                  <textarea name="note" required maxLength={3000} />
                </label>
                <label>
                  Datos que la sustentan
                  <textarea
                    name="basis"
                    required
                    maxLength={2000}
                    placeholder="Periodo, tamaño de muestra y métricas consultadas"
                  />
                </label>
                <label>
                  Próximo experimento
                  <textarea name="nextExperiment" required maxLength={1000} />
                </label>
                <button disabled={busy || !data.campaigns.length}>
                  Guardar aprendizaje
                </button>
              </form>
              {data.events
                .filter((e) => e.kind === "campaign.insight")
                .map((e) => (
                  <article className={styles.row} key={e.id}>
                    <b>{String(e.metadata.note)}</b>
                    <p>{String(e.metadata.basis)}</p>
                    <p>
                      Próximo experimento: {String(e.metadata.nextExperiment)}
                    </p>
                    <small>
                      {date(e.occurred_at)} · Interpretación registrada por{" "}
                      {e.source}
                    </small>
                  </article>
                ))}
              <h3>Registros para el agente</h3>
              <p>
                La API entrega empresas, contactos con consentimiento, tareas,
                oportunidades, variantes, envíos y eventos con fecha y origen.
                El bot podrá documentar hipótesis y registrar acciones; no se
                modifica ni entrena automáticamente ningún modelo de ChatGPT.
              </p>
            </section>
          )}
        </>
      )}
    </section>
  );
}
