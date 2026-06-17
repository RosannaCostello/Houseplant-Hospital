export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const commaIndex = dataUrl.indexOf(",");

  if (commaIndex === -1) {
    throw new Error("Invalid image data");
  }

  const base64 = dataUrl.slice(commaIndex + 1);

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function mimeTypeToExtension(mimeType: "image/webp" | "image/jpeg"): "webp" | "jpg" {
  return mimeType === "image/webp" ? "webp" : "jpg";
}
