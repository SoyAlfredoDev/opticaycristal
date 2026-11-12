import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { Profile } from "./shared";
import { assessPhotoQuality, enhancePhotoPixels, type PhotoQuality } from "./photo-quality";

export type Portrait = { original: Blob; prepared: Blob; profile: Profile; quality: PhotoQuality };
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
  const resize = Math.min(1, 1440 / Math.max(bitmap.width, bitmap.height));
  source.width = Math.max(1, Math.round(bitmap.width * resize));
  source.height = Math.max(1, Math.round(bitmap.height * resize));
  try {
    source.getContext("2d")?.drawImage(bitmap, 0, 0, source.width, source.height);
  } finally {
    bitmap.close();
  }

  if (Math.min(source.width, source.height) < 256) throw new Error("La foto es muy pequeña. Toma otra más cerca y con buena luz.");

  const model = await getDetector().catch(() => {
    throw new Error("No pudimos analizar la foto en este dispositivo. Intenta de nuevo o usa otro navegador.");
  });
  const faces = model.detect(source).faceLandmarks;
  if (!faces.length) throw new Error("No distinguimos bien tu rostro. Toma una foto nítida, de frente y con buena luz.");
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
  if (faceWidth < 180 || eyeDistance < 65) throw new Error("Acerca un poco más tu rostro y toma otra foto.");
  const left=Math.max(0,Math.min(point(234).x,point(454).x));
  const top=Math.max(0,point(10).y);
  const cropWidth=Math.min(faceWidth,source.width-left), cropHeight=Math.min(faceHeight,source.height-top);
  const sample=document.createElement("canvas");sample.width=256;sample.height=256;
  const sampleContext=sample.getContext("2d",{willReadFrequently:true})!;
  sampleContext.drawImage(source,left,top,cropWidth,cropHeight,0,0,256,256);
  const quality=assessPhotoQuality(sampleContext.getImageData(0,0,256,256));
  if(quality.action==="retake") throw new Error(quality.reason==="light" ? "Tu rostro necesita más luz uniforme. Toma otra foto cerca de una ventana, sin contraluz." : "La foto está demasiado borrosa. Limpia la cámara, mantén el teléfono quieto y toma otra foto.");

  const jawRatio = Math.hypot(point(172).x - point(397).x, point(172).y - point(397).y) / faceWidth;
  const lengthRatio = faceHeight / faceWidth;
  const profile = lengthRatio > 1.51 ? "alargado" : jawRatio > 0.80 ? "definido" : lengthRatio < 1.29 ? "suave" : "equilibrado";

  const encode=()=>new Promise<Blob>((resolve,reject)=>source.toBlob(blob=>blob?resolve(blob):reject(new Error("No pudimos preparar la foto.")),"image/jpeg",.94));
  const original=await encode();
  if(quality.action==="enhance") {
    const context=source.getContext("2d")!;
    const pixels=context.getImageData(0,0,source.width,source.height);
    pixels.data.set(enhancePhotoPixels(pixels));context.putImageData(pixels,0,0);
  }
  return { original, prepared:quality.action==="enhance"?await encode():original, profile, quality };
}
