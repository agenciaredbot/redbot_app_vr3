const DEFAULT_MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;

/**
 * Compress an image file using Canvas API.
 * Resizes to max dimension on longest side, outputs as WebP (or JPEG fallback).
 */
export async function compressImage(
  file: File,
  maxDimension: number = DEFAULT_MAX_DIMENSION
): Promise<File> {
  // Skip non-raster formats (SVGs, etc.)
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Only resize if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first, fallback to JPEG
      const outputType = "image/webp";
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compression didn't help, use original
            resolve(file);
            return;
          }

          const ext = outputType === "image/webp" ? "webp" : "jpg";
          const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
          resolve(new File([blob], name, { type: outputType }));
        },
        outputType,
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // On error, use original
    };

    img.src = url;
  });
}
