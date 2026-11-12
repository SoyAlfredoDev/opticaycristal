import "server-only";
import sharp from "sharp";
import type { Suggestion } from "./shared";

export async function normalizePhoto(base64: unknown) {
  if (typeof base64 !== "string" || base64.length > 2_800_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error("Invalid image");
  const input = Buffer.from(base64, "base64");
  if (input.length > 2_000_000) throw new Error("Image too large");
  const pipeline = sharp(input, { limitInputPixels: 16_000_000, failOn: "warning" });
  const meta = await pipeline.metadata();
  if (!["jpeg", "png", "webp"].includes(meta.format ?? "") || (meta.pages ?? 1) !== 1 || !meta.width || !meta.height || Math.min(meta.width, meta.height) < 256 || meta.width / meta.height > 3 || meta.height / meta.width > 3) throw new Error("Invalid image");
  return pipeline.rotate().resize({ width: 1440, height: 1440, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
}

export function imageEditPrompt(suggestion: Suggestion) {
  return [
    "Edit this original photograph; do not recreate the person or make a new scene. Add ONLY a highly photorealistic pair of clear prescription eyeglasses.",
    `The required frame shape is ${suggestion.shape}; color is ${suggestion.colors[0]}. Use realistic optical-frame proportions, refined rims and appropriate materials: thin metal for aviador, otherwise natural acetate or fine metal suitable for the chosen shape.`,
    "Preserve the original identity, exact facial features, eyes, gaze, expression, beard, hair, skin texture and pores, pose, clothing, background, lighting and camera framing. No beauty retouch, smoothing or face reshaping. Do not restore, reconstruct or invent missing facial details, eyelashes or skin texture; retain the real detail level of the supplied photograph.",
    "Change only the eyeglass area and necessary contact shadows. Fit the bridge naturally on the nose and temples towards the ears with correct occlusion. Clear untinted lenses, subtle real-world reflections matching the original light, original eyes plainly visible. No opaque lenses, sunglasses, oversized frames, flat overlay or obvious 3D appearance.",
    "Return ONE full original composition, same aspect ratio, no cropping, no collage, no text, no watermark, no logos. A reference style, not a specific brand or product.",
  ].join(" ");
}

export async function editFramePhoto(photo: Buffer, suggestion: Suggestion) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("Image provider unavailable");
  const meta = await sharp(photo).metadata();
  const ratio = meta.width! / meta.height!;
  const width = ratio >= 1 ? 1024 : Math.round(1024 * ratio / 16) * 16;
  const height = ratio <= 1 ? 1024 : Math.round(1024 / ratio / 16) * 16;
  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(140_000),
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-2", images: [{ image_url: `data:image/jpeg;base64,${photo.toString("base64")}` }],
      prompt: imageEditPrompt(suggestion), n: 1, quality: "medium", size: `${width}x${height}`, output_format: "jpeg", output_compression: 90 }),
  });
  if (!response.ok) throw new Error(`Image provider status ${response.status}`);
  const data = await response.json() as { data?: { b64_json?: string }[] };
  const encoded = data.data?.[0]?.b64_json;
  if (!encoded || encoded.length > 8_000_000 || data.data?.length !== 1) throw new Error("Invalid image response");
  // Decode and re-encode: reject corrupt outputs and strip metadata before private delivery.
  return sharp(Buffer.from(encoded, "base64"), { limitInputPixels: 4_000_000 }).jpeg({ quality: 90 }).toBuffer();
}
