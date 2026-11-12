import "server-only";
import { clientPool, clientTable } from "@/lib/clients/db";
import { protectClientValue, revealClientValue } from "@/lib/clients/privacy";
import type { Advice, Suggestion } from "./shared";

const dailyLimit = 3;
const monthlyLimit = 300;
const tables = () => ({
  advice: clientTable("oc_client_frame_advice"),
  budget: clientTable("oc_client_frame_budget"),
  pilot: clientTable("oc_client_frame_pilot"),
});
const chileDay = "date_trunc('day', now() AT TIME ZONE 'America/Santiago')";
const month = "date_trunc('month', now() AT TIME ZONE 'America/Santiago')::date";

type Reservation =
  | { status: "reserved"; id: string }
  | { status: "ready"; advice: Advice }
  | { status: "daily-limit" | "monthly-limit" | "pending" | "failed" };

export async function isFrameAdvisorPilot(userId: string) {
  const { pilot } = tables();
  const result = await clientPool().query(`SELECT 1 FROM ${pilot} WHERE user_id=$1`, [userId]);
  return result.rows.length === 1;
}

export async function reserveAdvice(userId: string, requestId: string): Promise<Reservation> {
  const { advice, budget } = tables();
  const client = await clientPool().connect();
  try {
    await client.query("BEGIN");
    // Keep the monthly budget, per-user limit and idempotency decision atomic across server instances.
    await client.query("SELECT pg_advisory_xact_lock(198226, 25119)");
    const existing = (await client.query(
      `SELECT id, result, rating, failed_at IS NOT NULL OR created_at < now() - interval '1 minute' AS expired
       FROM ${advice} WHERE user_id=$1 AND request_id=$2`, [userId, requestId],
    )).rows[0];
    let decision: Reservation;
    if (existing?.result) {
      decision = { status: "ready", advice: { id: existing.id, suggestions: existing.result, rating: existing.rating } };
    } else if (existing) {
      decision = { status: existing.expired ? "failed" : "pending" };
    } else {
      const { daily, pending } = (await client.query(
        `SELECT count(*) FILTER (WHERE created_at >= (${chileDay} AT TIME ZONE 'America/Santiago'))::int AS daily,
          coalesce(bool_or(result IS NULL AND failed_at IS NULL AND created_at > now() - interval '1 minute'), false) AS pending
          FROM ${advice} WHERE user_id=$1 AND created_at >= LEAST((${chileDay} AT TIME ZONE 'America/Santiago'),now() - interval '1 minute')`,
        [userId],
      )).rows[0];
      if (pending) {
        decision = { status: "pending" };
      } else if (daily >= dailyLimit) {
        decision = { status: "daily-limit" };
      } else {
        const updated = await client.query(
          `INSERT INTO ${budget} AS b(month,used) VALUES (${month},1)
           ON CONFLICT (month) DO UPDATE SET used=b.used+1 WHERE b.used<$1 RETURNING used`, [monthlyLimit],
        );
        if (!updated.rowCount) {
          decision = { status: "monthly-limit" };
        } else {
          const saved = await client.query(
            `INSERT INTO ${advice}(user_id, request_id) VALUES ($1,$2) RETURNING id`, [userId, requestId],
          );
          decision = { status: "reserved", id: saved.rows[0].id };
        }
      }
    }
    await client.query("COMMIT");
    return decision;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function finishAdvice(userId: string, id: string, suggestions: Suggestion[] | null) {
  const { advice } = tables();
  const saved = await clientPool().query(
    `UPDATE ${advice} SET result=$3::jsonb, failed_at=CASE WHEN $3::jsonb IS NULL THEN now() END
     WHERE id=$1 AND user_id=$2 AND failed_at IS NULL AND result IS NULL`,
    [id, userId, suggestions ? JSON.stringify(suggestions) : null],
  );
  return saved.rowCount === 1;
}

export async function lastAdvice(userId: string): Promise<Advice | null> {
  const { advice } = tables();
  const { rows } = await clientPool().query(
    `SELECT id, result AS suggestions, rating FROM ${advice} WHERE user_id=$1 AND result IS NOT NULL ORDER BY created_at DESC LIMIT 1`, [userId],
  );
  return rows[0] ?? null;
}

export async function rateAdvice(userId: string, id: string, rating: number, feedback: string) {
  const { advice } = tables();
  const { rows } = await clientPool().query(
    `UPDATE ${advice} SET rating=$3, feedback=$4, rated_at=now()
     WHERE id=$1 AND user_id=$2 AND result IS NOT NULL AND rating IS NULL RETURNING rating`, [id, userId, rating, feedback ? protectClientValue(feedback, "frame-feedback") : null],
  );
  if (rows[0]) return rows[0].rating as number;
  const previous = await clientPool().query(`SELECT rating FROM ${advice} WHERE id=$1 AND user_id=$2 AND result IS NOT NULL`, [id, userId]);
  return previous.rows[0]?.rating as number | undefined;
}

export async function frameAdviceMetrics() {
  const { advice, budget } = tables();
  const result = await clientPool().query<{ used: number | null; completed: number; rated: number; average: number | null }>(`SELECT
    (SELECT used FROM ${budget} WHERE month=${month}) AS used,
    count(*) FILTER (WHERE result IS NOT NULL)::int AS completed,
    count(rating)::int AS rated, round(avg(rating),1)::float AS average
    FROM ${advice} WHERE created_at >= (${month}::timestamp AT TIME ZONE 'America/Santiago')`);
  const feedback = await clientPool().query<{ id: string; rating: number; feedback: string | null }>(
    `SELECT id, rating, feedback FROM ${advice} WHERE rated_at IS NOT NULL ORDER BY rated_at DESC LIMIT 30`,
  );
  return { ...result.rows[0], feedback: feedback.rows.map(row => ({ ...row, feedback: row.feedback ? revealClientValue(row.feedback, "frame-feedback") : null })), monthlyLimit };
}
