export type CompressedImage = {
  blob: Blob;
  dataUrl: string;
  mimeType: "image/webp" | "image/jpeg";
  width: number;
  height: number;
  byteSize: number;
  thumbnailDataUrl: string;
  thumbnailByteSize: number;
};

const MAX_WIDTH = 1600;
const THUMBNAIL_MAX_WIDTH = 320;
const TARGET_MAX_BYTES = 500 * 1024;
const TARGET_MIN_BYTES = 200 * 1024;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25] as const;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function scaledDimensions(width: number, height: number, maxWidth: number) {
  if (width <= maxWidth) {
    return { width, height };
  }

  const scale = maxWidth / width;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function renderToCanvas(file: File, maxWidth: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = scaledDimensions(bitmap.width, bitmap.height, maxWidth);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare image for compression");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas;
}

async function createThumbnail(
  source: HTMLCanvasElement,
  mimeType: "image/webp" | "image/jpeg",
): Promise<{ dataUrl: string; byteSize: number }> {
  const { width, height } = scaledDimensions(source.width, source.height, THUMBNAIL_MAX_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not generate thumbnail");
  }

  context.drawImage(source, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, mimeType, 0.75);

  if (!blob) {
    throw new Error("Could not generate thumbnail");
  }

  return {
    dataUrl: await blobToDataUrl(blob),
    byteSize: blob.size,
  };
}

async function encodeCanvas(canvas: HTMLCanvasElement): Promise<CompressedImage> {
  const mimeTypes: Array<"image/webp" | "image/jpeg"> = ["image/webp", "image/jpeg"];

  let bestUnderMax: CompressedImage | null = null;

  for (const mimeType of mimeTypes) {
    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, mimeType, quality);

      if (!blob) continue;

      if (blob.size <= TARGET_MAX_BYTES) {
        const dataUrl = await blobToDataUrl(blob);
        const thumbnail = await createThumbnail(canvas, mimeType);
        const candidate: CompressedImage = {
          blob,
          dataUrl,
          mimeType,
          width: canvas.width,
          height: canvas.height,
          byteSize: blob.size,
          thumbnailDataUrl: thumbnail.dataUrl,
          thumbnailByteSize: thumbnail.byteSize,
        };

        if (blob.size >= TARGET_MIN_BYTES) {
          return candidate;
        }

        if (!bestUnderMax || blob.size > bestUnderMax.byteSize) {
          bestUnderMax = candidate;
        }
      }
    }
  }

  if (bestUnderMax) {
    return bestUnderMax;
  }

  const fallbackBlob = await canvasToBlob(canvas, "image/jpeg", 0.25);

  if (!fallbackBlob) {
    throw new Error("Could not compress image");
  }

  const thumbnail = await createThumbnail(canvas, "image/jpeg");

  return {
    blob: fallbackBlob,
    dataUrl: await blobToDataUrl(fallbackBlob),
    mimeType: "image/jpeg",
    width: canvas.width,
    height: canvas.height,
    byteSize: fallbackBlob.size,
    thumbnailDataUrl: thumbnail.dataUrl,
    thumbnailByteSize: thumbnail.byteSize,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read compressed image"));
    reader.readAsDataURL(blob);
  });
}

/** Resize, re-encode (strips EXIF), and target 200–500KB WebP/JPEG. */
export async function compressImageFile(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file");
  }

  let canvas = await renderToCanvas(file, MAX_WIDTH);
  let result = await encodeCanvas(canvas);

  if (result.byteSize > TARGET_MAX_BYTES && canvas.width > 960) {
    canvas = await renderToCanvas(file, 960);
    result = await encodeCanvas(canvas);
  }

  return result;
}

export function formatImageByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}
