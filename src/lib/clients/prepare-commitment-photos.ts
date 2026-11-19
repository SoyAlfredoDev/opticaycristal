import { COMMITMENT_UPLOAD_BYTES, COMMITMENT_UPLOAD_FILES } from "./commitment-upload-types";

/** Resize camera photos locally; the original never needs to leave the device. */
export async function prepareCommitmentPhotos(files: File[]): Promise<File[]> {
  if (!files.length || files.length > COMMITMENT_UPLOAD_FILES) throw new Error("Selecciona un PDF o hasta cuatro fotos.");
  if (files.length === 1 && (files[0].type === "application/pdf" || /\.pdf$/i.test(files[0].name))) {
    if (files[0].size > COMMITMENT_UPLOAD_BYTES) throw new Error("El PDF no puede superar 3 MB.");
    return files;
  }
  if (files.some(file => !["image/jpeg", "image/png"].includes(file.type) || file.size > 12 * 1024 * 1024))
    throw new Error("Usa un PDF o fotos JPG/PNG de hasta 12 MB cada una.");
  async function convert(file: File, edge: number, quality: number) {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No pudimos preparar la foto. Intenta con un PDF.");
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("No pudimos preparar la foto.")), "image/jpeg", quality));
      return new File([blob], "hoja.jpg", { type: "image/jpeg" });
    } finally { bitmap.close(); }
  }
  let result: File[] = [];
  for (const [edge, quality] of [[2400, .9], [1800, .82]]) {
    result = [];
    for (const file of files) result.push(await convert(file, edge, quality));
    if (result.reduce((total, file) => total + file.size, 0) <= COMMITMENT_UPLOAD_BYTES) return result;
  }
  throw new Error("Las fotos superan 3 MB. Selecciona imágenes de menor tamaño.");
}
