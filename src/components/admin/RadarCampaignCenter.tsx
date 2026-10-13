"use client";
import { useEffect, useState, useCallback } from "react";
import type { CrmSnapshot } from "@/lib/radar/crm-model";
import { relationshipLabels } from "@/lib/radar/workspace-model";
import { RadarCrm } from "./RadarCrm";
import styles from "./RadarWorkspace.module.css";
function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}`;
}
export function RadarCampaignCenter() {
  const [data, setData] = useState<CrmSnapshot | null>(null),
    [month, setMonth] = useState(currentMonth),
    [campaign, setCampaign] = useState(""),
    [relation, setRelation] = useState("prospecto"),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0),
    [start, setStart] = useState("");
  const refresh = useCallback(async () => {
    const r = await fetch("/api/admin/radar/crm", { cache: "no-store" }),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
    setVersion((v) => v + 1);
  }, []);
  useEffect(() => {
    const c = new AbortController();
    void fetch("/api/admin/radar/crm", { signal: c.signal, cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (!c.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, []);
  async function mutate(path: string, body: Record<string, unknown>) {
    const r = await fetch(`/api/admin/radar/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    return d;
  }
  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const result = await mutate("workspace", body);
      setNotice(
        body.action === "enrollSegment"
          ? `${result.created} emails nuevos preparados, sin duplicar destinatarios.`
          : "Configuración guardada.",
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  const chosen = data?.campaigns.find((c) => c.id === campaign);
  async function send() {
    if (
      !chosen ||
      !window.confirm(
        `¿Enviar correos reales de «${chosen.name}» a los destinatarios preparados? Se respetan bajas, llamadas confirmadas y el límite diario.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    let sent = 0,
      failed = 0,
      uncertain = 0;
    try {
      for (let i = 0; i < 10; i++) {
        const d = await mutate("crm", {
          action: "dispatch",
          campaignId: chosen.id,
          confirmSend: true,
        });
        sent += d.sent;
        failed += d.failed;
        uncertain += d.uncertain;
        setNotice(`Procesando campaña: ${sent} enviados.`);
        if (!d.sent || d.uncertain) break;
      }
      setNotice(
        `Campaña procesada: ${sent} enviados, ${failed} fallidos, ${uncertain} por conciliar. Los demás permanecen en la cola dentro del presupuesto y la frecuencia.`,
      );
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar el envío.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.workspace}>
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
      <section className={styles.surface}>
        <h2>Campañas del mes</h2>
        <p>
          Dos modelos para invitar a una jornada y abrir una conversación.
          Revisa el contenido, elige la audiencia y aprueba antes de enviar.
        </p>
        <div className={styles.tools}>
          <input
            type="month"
            aria-label="Mes de campaña"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button
            disabled={busy || !month}
            onClick={() => void run({ action: "seedMonthly", month })}
          >
            Crear los dos modelos del mes
          </button>
          <button disabled={busy} onClick={() => void refresh()}>
            Actualizar campañas
          </button>
        </div>
      </section>
      <section className={styles.surface}>
        <h2>Preparar y enviar</h2>
        <div className={styles.tools}>
          <select
            aria-label="Campaña a preparar"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
          >
            <option value="">Selecciona una campaña</option>
            {data?.campaigns
              .filter(
                (c) =>
                  c.status !== "archived" && (!c.month || c.month === month),
              )
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.status}
                </option>
              ))}
          </select>
          <select
            aria-label="Segmento comercial"
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
          >
            <option value="all">Todas las relaciones</option>
            {Object.entries(relationshipLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button
            disabled={busy || !campaign}
            onClick={() =>
              void run({
                action: "enrollSegment",
                campaignId: campaign,
                relation,
              })
            }
          >
            Preparar toda la audiencia
          </button>
        </div>
        <p className={styles.help}>
          Solo se incorporan emails habilitados tras la llamada, sin bajas ni
          seguimientos activos. Una misma dirección recibe la campaña una sola
          vez.
        </p>
        {chosen && (
          <>
            <div className={styles.tools}>
              <label>
                Programar
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <button
                disabled={busy || !start}
                onClick={() =>
                  void run({
                    action: "campaignSchedule",
                    id: chosen.id,
                    month,
                    scheduledAt: new Date(start).toISOString(),
                  })
                }
              >
                Guardar programación
              </button>
              <button
                disabled={
                  busy ||
                  chosen.status !== "approved" ||
                  !!data?.configuration.missing.length
                }
                onClick={() => void send()}
              >
                {busy ? "Procesando…" : "Enviar campaña ahora"}
              </button>
            </div>
            <p className={styles.help}>
              {chosen.status !== "approved"
                ? "Aprueba el modelo desde el editor de campañas para habilitar el envío."
                : "El envío manual solicita confirmación. Las campañas programadas respetan la vigencia del mes."}
            </p>
          </>
        )}
      </section>
      <section className={styles.surface}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Automatización</h2>
            <p>
              Máximo un correo por email cada siete días. Las respuestas
              detienen la secuencia y pasan al ejecutivo.
            </p>
          </div>
          <button
            disabled={busy || !data || !!data.configuration.missing.length}
            onClick={() => {
              const enabled = !data?.configuration.sendingEnabled;
              if (
                enabled &&
                !window.confirm(
                  "¿Activar el envío automático de campañas aprobadas y programadas?",
                )
              )
                return;
              void run({ action: "sendingSetting", enabled });
            }}
          >
            {data?.configuration.sendingEnabled
              ? "Pausar automatización"
              : "Activar automatización"}
          </button>
        </div>
        <p className={styles.help}>
          El trabajo diario requiere CRON_SECRET en el servidor. La recepción de
          respuestas requiere un subdominio de Resend verificado.
        </p>
      </section>
      <RadarCrm campaignOnly initialView="campanas" key={version} />
    </section>
  );
}
