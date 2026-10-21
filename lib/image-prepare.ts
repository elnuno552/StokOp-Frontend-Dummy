// Shrinks a large photo in the browser before upload. Vercel rejects request bodies over ~4.5 MB before
// the app sees them, so a 5 MB-allowed photo straight from a phone camera used to fail with no useful message.
// The size/dimension maths is pure and tested; prepareImage() itself needs a browser (canvas).

/** Aim below Vercel's 4.5 MB request limit, leaving room for the other form fields. */
export const UPLOAD_TARGET_BYTES = 3.5 * 1024 * 1024;
/** Longest side after shrinking. Plenty for identifying an item. */
export const MAX_PHOTO_SIDE = 2560;
/** Photos we are willing to try to decode in memory. */
const MAX_SOURCE_BYTES = 40 * 1024 * 1024;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55];

export type PreparedImage = { ok: true; file: File } | { ok: false; error: string };

/** Size that fits within `maxSide` on the longest side, never enlarging. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** "IMG_001.PNG" -> "IMG_001.jpg" */
export function jpegName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "").trim();
  return `${base || "foto"}.jpg`;
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Returns the file unchanged when it is small enough; otherwise a JPEG that fits under UPLOAD_TARGET_BYTES.
 * HEIC (and anything the browser cannot decode) cannot be shrunk here, so it is only accepted when small enough.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size <= UPLOAD_TARGET_BYTES) return { ok: true, file };

  const tooBigToShrink = (): PreparedImage => ({
    ok: false,
    error: "Foto terlalu besar dan tidak dapat dikecilkan otomatis. Gunakan foto JPG atau PNG, atau kecilkan fotonya dahulu (maksimal 4 MB).",
  });
  if (file.size > MAX_SOURCE_BYTES) return tooBigToShrink();

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // HEIC in most browsers: allowed only up to the platform limit.
    return file.size <= 4 * 1024 * 1024 ? { ok: true, file } : tooBigToShrink();
  }

  try {
    let side = MAX_PHOTO_SIDE;
    for (let round = 0; round < 4; round++) {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, side);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return tooBigToShrink();
      context.fillStyle = "#ffffff"; // PNG transparency would turn black in a JPEG
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      for (const quality of QUALITY_STEPS) {
        const blob = await toBlob(canvas, quality);
        if (blob && blob.size <= UPLOAD_TARGET_BYTES) {
          return { ok: true, file: new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: Date.now() }) };
        }
      }
      side = Math.round(side * 0.75);
    }
    return tooBigToShrink();
  } finally {
    bitmap.close();
  }
}
