import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { colorPaint, type Color, type Profile, type Shape } from "./shared";

const size = 512;
type Point = { x: number; y: number };
export type Portrait = { image: HTMLCanvasElement; center: Point; width: number; angle: number; profile: Profile };
let detector: Promise<FaceLandmarker> | undefined;

function getDetector() {
  detector ??= import("@mediapipe/tasks-vision").then(async ({ FaceLandmarker, FilesetResolver }) => {
    const files = await FilesetResolver.forVisionTasks("/asesor-monturas/wasm");
    return FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: "/asesor-monturas/face-landmarker-v1.task", delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: 2,
    });
  }).catch(error => { detector = undefined; throw error; });
  return detector;
}

export async function analyzePortrait(file: File): Promise<Portrait> {
  if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) {
    throw new Error("Elige una imagen de hasta 12 MB.");
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("No pudimos abrir esa foto. Prueba con JPG, PNG o la cámara.");
  });
  const source = document.createElement("canvas");
  const resize = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
  source.width = Math.max(1, Math.round(bitmap.width * resize));
  source.height = Math.max(1, Math.round(bitmap.height * resize));
  try {
    source.getContext("2d")?.drawImage(bitmap, 0, 0, source.width, source.height);
  } finally {
    bitmap.close();
  }

  const model = await getDetector().catch(() => {
    throw new Error("No pudimos iniciar el probador en este dispositivo. Puedes continuar sin foto.");
  });
  const faces = model.detect(source).faceLandmarks;
  if (faces.length !== 1) throw new Error("Toma una foto de frente en la que aparezcas solo tú.");
  const face = faces[0];
  const point = (i: number) => ({ x: face[i].x * source.width, y: face[i].y * source.height });
  const [eyeA, eyeB] = [point(468), point(473)].sort((a, b) => a.x - b.x);
  const eyeDistance = Math.hypot(eyeB.x - eyeA.x, eyeB.y - eyeA.y);
  const angle = Math.atan2(eyeB.y - eyeA.y, eyeB.x - eyeA.x);
  const center = { x: (eyeA.x + eyeB.x) / 2, y: (eyeA.y + eyeB.y) / 2 };
  const nose = point(1);
  const faceWidth = Math.hypot(point(234).x - point(454).x, point(234).y - point(454).y);
  const faceHeight = Math.hypot(point(10).x - point(152).x, point(10).y - point(152).y);
  if (eyeDistance < 35 || Math.abs(angle) > 0.32 || Math.abs(nose.x - center.x) > eyeDistance * 0.29 || faceWidth < 1) {
    throw new Error("Mira de frente y acerca tu rostro un poco más.");
  }
  const jawRatio = Math.hypot(point(172).x - point(397).x, point(172).y - point(397).y) / faceWidth;
  const lengthRatio = faceHeight / faceWidth;
  const profile = lengthRatio > 1.51 ? "alargado" : jawRatio > 0.80 ? "definido" : lengthRatio < 1.29 ? "suave" : "equilibrado";

  const crop = Math.min(source.width, source.height, Math.max(faceWidth * 1.55, faceHeight * 1.42));
  const left = Math.max(0, Math.min(source.width - crop, center.x - crop / 2));
  const top = Math.max(0, Math.min(source.height - crop, center.y - crop * 0.43));
  const image = document.createElement("canvas");
  image.width = size;
  image.height = size;
  image.getContext("2d")?.drawImage(source, left, top, crop, crop, 0, 0, size, size);
  return {
    image,
    center: { x: (center.x - left) * size / crop, y: (center.y - top) * size / crop },
    width: eyeDistance * size / crop,
    angle,
    profile,
  };
}

const outlines: Record<Shape, string> = {
  cuadrada: "M-38 -22 Q-35 -28 -25 -28 L24 -27 Q35 -26 37 -19 L32 19 Q30 26 20 27 L-22 27 Q-32 26 -34 17 Z",
  rectangular: "M-39 -13 Q-37 -21 -27 -21 L27 -20 Q37 -20 38 -13 L34 12 Q32 21 24 21 L-25 21 Q-35 20 -36 13 Z",
  redonda: "M-33 0 A33 29 0 1 1 33 0 A33 29 0 1 1 -33 0 Z",
  ovalada: "M-36 0 A36 22 0 1 1 36 0 A36 22 0 1 1 -36 0 Z",
  "cat-eye": "M-39 -28 Q-18 -20 26 -19 Q36 -19 36 -7 Q35 24 12 25 Q-27 27 -39 -28 Z",
  aviador: "M-38 -18 Q-32 -29 17 -27 Q37 -26 37 -12 Q35 12 13 26 Q-7 36 -22 26 Q-37 12 -38 -18 Z",
  panto: "M-35 -16 Q-34 -25 0 -24 Q34 -24 35 -16 Q37 7 23 21 Q0 37 -23 21 Q-36 8 -35 -16 Z",
  browline: "M-37 -19 Q-30 -28 28 -24 Q36 -23 37 -15 L32 10 Q27 27 7 27 Q-24 28 -31 14 Z",
};

export function drawTryOn(canvas: HTMLCanvasElement, portrait: Portrait | null, shape: Shape, color: Color) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, size, size);
  if (portrait) ctx.drawImage(portrait.image, 0, 0);
  else {
    ctx.fillStyle = "#edf8f3";
    ctx.fillRect(0, 0, size, size);
  }
  const center = portrait?.center ?? { x: 256, y: 256 };
  const scale = (portrait?.width ?? 205) / 94;
  ctx.save();
  ctx.translate(center.x, center.y + 2);
  ctx.rotate(portrait?.angle ?? 0);
  ctx.scale(scale, scale);
  ctx.strokeStyle = colorPaint[color];
  ctx.lineWidth = shape === "aviador" ? 2.6 : 3.7;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-12, -7);
  ctx.quadraticCurveTo(0, -16, 12, -7);
  if (shape === "aviador") {
    ctx.moveTo(-16, -20);
    ctx.quadraticCurveTo(0, -26, 16, -20);
  }
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 47, 0);
    ctx.scale(-side, 1);
    ctx.stroke(new Path2D(outlines[shape]));
    if (shape === "browline") {
      ctx.lineWidth = 6;
      ctx.stroke(new Path2D("M-37 -19 Q-30 -28 28 -24 Q36 -23 37 -15"));
    }
    ctx.restore();
  }
  ctx.restore();
}
