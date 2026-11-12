import "server-only";
import { clientPool, clientTable } from "@/lib/clients/db";
import { clientFingerprint, protectClientValue, revealClientValue } from "@/lib/clients/privacy";
import type { Suggestion } from "./shared";

export const imageDailyLimit = 9;
export const imageMonthlyLimit = 90;
const images = () => clientTable("oc_client_frame_image");
const advice = () => clientTable("oc_client_frame_advice");
const month = "date_trunc('month', now() AT TIME ZONE 'America/Santiago')::date";
export type ImageState = "ready" | "pending" | "failed" | "expired" | "missing";
type Reservation = { state: "reserved"; suggestion: Suggestion } | { state: "ready"; image: Buffer } | { state: "pending" | "failed" | "expired" | "missing" | "mismatch" | "limit" };

export async function purgeExpiredFrameImages() {
  await clientPool().query(`UPDATE ${images()} SET image_encrypted=NULL,state='expired' WHERE expires_at<=now() AND state<>'expired'`);
}

export async function readFrameImages(userId: string, id: string) {
  const { rows } = await clientPool().query(`SELECT i.option_index,
    CASE WHEN i.expires_at<=now() THEN 'expired'
      WHEN i.state='pending' AND i.created_at<now()-interval '3 minutes' THEN 'failed' ELSE i.state END AS state,
    CASE WHEN i.expires_at>now() AND i.state='ready' THEN i.image_encrypted END AS image_encrypted
    FROM ${images()} i JOIN ${advice()} a ON a.id=i.advice_id WHERE a.user_id=$1 AND a.id=$2 ORDER BY i.option_index`, [userId, id]);
  return rows.map(row => ({ index: row.option_index as number, state: row.state as ImageState,
    image: row.image_encrypted ? revealClientValue(row.image_encrypted, "frame-image") : null }));
}

export async function reserveFrameImage(userId: string, id: string, index: number, photo: Buffer): Promise<Reservation> {
  const fingerprint = clientFingerprint(photo.toString("base64"), `frame-photo:${id}`);
  const client = await clientPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(198226, 26119)");
    const owner = (await client.query(`SELECT result,created_at>now()-interval '24 hours' AS fresh FROM ${advice()} WHERE id=$1 AND user_id=$2`, [id, userId])).rows[0];
    let decision: Reservation;
    if (!owner?.result?.[index]) decision = { state: "missing" };
    else if (!owner.fresh) decision = { state: "expired" };
    else {
      const all = (await client.query(`SELECT *,expires_at>now() AS fresh,created_at>now()-interval '3 minutes' AS active FROM ${images()} WHERE advice_id=$1`, [id])).rows;
      const existing = all.find(row => row.option_index === index);
      if (all.some(row => row.photo_fingerprint !== fingerprint)) decision = { state: "mismatch" };
      else if (existing) {
        if (!existing.fresh) decision = { state: "expired" };
        else if (existing.state === "ready") decision = { state: "ready", image: Buffer.from(revealClientValue(existing.image_encrypted, "frame-image"), "base64") };
        else decision = { state: existing.state === "pending" && existing.active ? "pending" : "failed" };
      } else {
        const limits = (await client.query(`SELECT count(*) FILTER(WHERE i.created_at >= (date_trunc('day',now() AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago'))::int AS used,
          coalesce(bool_or(i.state='pending' AND i.created_at>now()-interval '3 minutes'),false) AS pending
          FROM ${images()} i JOIN ${advice()} a ON a.id=i.advice_id WHERE a.user_id=$1`, [userId])).rows[0];
        if (limits.pending) decision = { state: "pending" };
        else if (limits.used >= imageDailyLimit) decision = { state: "limit" };
        else {
          const budget = clientTable("oc_client_frame_image_budget");
          const used = await client.query(`INSERT INTO ${budget} AS b(month,used) VALUES(${month},1)
            ON CONFLICT(month) DO UPDATE SET used=b.used+1 WHERE b.used<$1 RETURNING used`, [imageMonthlyLimit]);
          if (!used.rowCount) decision = { state: "limit" };
          else {
            await client.query(`INSERT INTO ${images()}(advice_id,option_index,photo_fingerprint) VALUES($1,$2,$3)`, [id,index,fingerprint]);
            decision = { state: "reserved", suggestion: owner.result[index] };
          }
        }
      }
    }
    await client.query("COMMIT");
    return decision;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

export async function finishFrameImage(userId: string, id: string, index: number, image: Buffer | null) {
  const result = await clientPool().query(`UPDATE ${images()} i SET state=$4,image_encrypted=$5
    FROM ${advice()} a WHERE a.id=i.advice_id AND a.user_id=$1 AND i.advice_id=$2 AND i.option_index=$3 AND i.state='pending' AND i.expires_at>now()`,
  [userId,id,index,image ? "ready" : "failed",image ? protectClientValue(image.toString("base64"), "frame-image") : null]);
  return result.rowCount === 1;
}
