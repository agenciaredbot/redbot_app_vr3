/**
 * Late API Client
 *
 * Handles all communication with Late (getlate.dev) API.
 * Each tenant uses their own Late API key.
 *
 * Late API docs: https://docs.getlate.dev
 * OpenAPI spec: https://docs.getlate.dev/api/openapi
 * Base URL: https://getlate.dev/api/v1
 */

import type {
  LateAccount,
  LateRawAccount,
  LatePresignedUrlResponse,
  LatePostResponse,
} from "./types";

const LATE_BASE_URL = "https://getlate.dev/api/v1";

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

function lateHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function lateRequest<T>(
  apiKey: string,
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const res = await fetch(`${LATE_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...lateHeaders(apiKey),
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let errorMsg = `Late API error (${res.status})`;
      try {
        const json = JSON.parse(text);
        errorMsg = json.message || json.error || errorMsg;
      } catch {
        if (text) errorMsg = text;
      }
      return { data: null, error: errorMsg, status: res.status };
    }

    const data = (await res.json()) as T;
    return { data, error: null, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de conexión con Late";
    return { data: null, error: msg, status: 0 };
  }
}

// ──────────────────────────────────────────────
//  Validate API Key
// ──────────────────────────────────────────────

/**
 * Validates a Late API key by attempting to list accounts.
 * Returns the list of connected accounts if valid.
 */
export async function validateApiKey(
  apiKey: string
): Promise<{ valid: boolean; accounts: LateAccount[]; error?: string }> {
  const result = await listAccounts(apiKey);

  if (result.error) {
    if (result.status === 401 || result.status === 403) {
      return { valid: false, accounts: [], error: "API Key inválida. Verifica tu clave de Late." };
    }
    return { valid: false, accounts: [], error: result.error };
  }

  return { valid: true, accounts: result.accounts };
}

// ──────────────────────────────────────────────
//  List Connected Accounts
// ──────────────────────────────────────────────

/**
 * Lists all connected social media accounts for the given API key.
 * Optionally filter by platform (e.g., "instagram").
 *
 * Late API: GET /v1/accounts
 * Response: { accounts: [{ _id, platform, username, displayName, ... }] }
 */
export async function listAccounts(
  apiKey: string,
  platformFilter?: string
): Promise<{ accounts: LateAccount[]; error: string | null; status: number }> {
  // Late returns { accounts: [...] } wrapper
  const { data, error, status } = await lateRequest<{ accounts: LateRawAccount[] }>(
    apiKey,
    "/accounts"
  );

  if (error || !data) {
    return { accounts: [], error, status };
  }

  // Handle both { accounts: [...] } and direct array responses
  const rawAccounts: LateRawAccount[] = Array.isArray(data)
    ? data
    : (data.accounts || []);

  // Normalize Late API field names → our internal LateAccount shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let accounts: LateAccount[] = rawAccounts.map((raw: any) => ({
    id: raw._id || raw.accountId || raw.id || "",
    platform: raw.platform || "",
    username: (raw.username || "").replace(/^@/, ""),
    displayName: raw.displayName || raw.username || "",
    profilePictureUrl: raw.profileUrl || raw.profileImage || raw.profilePictureUrl,
  }));

  if (platformFilter) {
    accounts = accounts.filter(
      (a) => a.platform?.toLowerCase() === platformFilter.toLowerCase()
    );
  }

  return { accounts, error: null, status };
}

/**
 * Lists only Instagram accounts.
 */
export async function listInstagramAccounts(
  apiKey: string
): Promise<{ accounts: LateAccount[]; error: string | null }> {
  const result = await listAccounts(apiKey, "instagram");
  return { accounts: result.accounts, error: result.error };
}

// ──────────────────────────────────────────────
//  Upload Media
// ──────────────────────────────────────────────

/**
 * Gets a presigned URL from Late, downloads the image from source,
 * and uploads it to Late's storage.
 *
 * Late API: POST /v1/media/presign  { filename, contentType }
 * Response: { uploadUrl, publicUrl }
 *
 * @param apiKey - Late API key
 * @param imageUrl - Source image URL (from Supabase storage)
 * @returns The public URL on Late's storage
 */
export async function uploadImage(
  apiKey: string,
  imageUrl: string
): Promise<{ publicUrl: string | null; error: string | null }> {
  // Determine content type from URL
  const contentType = imageUrl.endsWith(".png") ? "image/png" : "image/jpeg";
  const ext = contentType === "image/png" ? "png" : "jpg";
  const filename = `property-image-${Date.now()}.${ext}`;

  // Step 1: Get presigned URL via POST /media/presign
  const { data: presigned, error: presignError } =
    await lateRequest<LatePresignedUrlResponse>(
      apiKey,
      "/media/presign",
      {
        method: "POST",
        body: JSON.stringify({ filename, contentType }),
      }
    );

  if (presignError || !presigned) {
    return { publicUrl: null, error: presignError || "No se pudo obtener URL de carga" };
  }

  // Step 2: Download the image from source
  let imageBuffer: ArrayBuffer;
  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) {
      return { publicUrl: null, error: `No se pudo descargar la imagen: ${imgRes.status}` };
    }
    imageBuffer = await imgRes.arrayBuffer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error descargando imagen";
    return { publicUrl: null, error: msg };
  }

  // Step 3: Upload to Late's presigned URL
  try {
    const uploadRes = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: imageBuffer,
    });

    if (!uploadRes.ok) {
      return { publicUrl: null, error: `Error subiendo imagen a Late: ${uploadRes.status}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error subiendo imagen";
    return { publicUrl: null, error: msg };
  }

  return { publicUrl: presigned.publicUrl, error: null };
}

/**
 * Upload multiple images in sequence.
 * Returns array of public URLs (skips failed uploads).
 */
export async function uploadImages(
  apiKey: string,
  imageUrls: string[]
): Promise<{ publicUrls: string[]; errors: string[] }> {
  const publicUrls: string[] = [];
  const errors: string[] = [];

  for (const url of imageUrls) {
    const result = await uploadImage(apiKey, url);
    if (result.publicUrl) {
      publicUrls.push(result.publicUrl);
    } else {
      errors.push(result.error || `Error con imagen: ${url}`);
      console.warn(`[late] Failed to upload image ${url}: ${result.error}`);
    }
  }

  return { publicUrls, errors };
}

// ──────────────────────────────────────────────
//  Publish Carousel
// ──────────────────────────────────────────────

/**
 * Publishes a carousel post to Instagram via Late API.
 *
 * Late API: POST /v1/posts
 * Body: { content, mediaItems: [{type,url}], platforms: [{platform,accountId}], publishNow }
 *
 * Flow:
 * 1. Upload all images to Late's storage
 * 2. Create post with media URLs
 * 3. Return post URL
 */
export async function publishCarousel(
  apiKey: string,
  params: {
    accountId: string;
    caption: string;
    imageUrls: string[];
  }
): Promise<{
  success: boolean;
  postUrl?: string;
  postId?: string;
  error?: string;
}> {
  const { accountId, caption, imageUrls } = params;

  if (imageUrls.length === 0) {
    return { success: false, error: "Se requiere al menos una imagen." };
  }

  if (imageUrls.length > 10) {
    return { success: false, error: "Máximo 10 imágenes por carrusel." };
  }

  // Step 1: Upload images to Late
  console.log(`[late] Uploading ${imageUrls.length} images...`);
  const { publicUrls, errors: uploadErrors } = await uploadImages(apiKey, imageUrls);

  if (publicUrls.length === 0) {
    return {
      success: false,
      error: `No se pudieron subir las imágenes. ${uploadErrors[0] || ""}`,
    };
  }

  if (uploadErrors.length > 0) {
    console.warn(`[late] ${uploadErrors.length} image upload(s) failed, continuing with ${publicUrls.length} images`);
  }

  // Step 2: Create post via POST /v1/posts
  console.log(`[late] Creating carousel post with ${publicUrls.length} images...`);
  const { data, error } = await lateRequest<LatePostResponse>(
    apiKey,
    "/posts",
    {
      method: "POST",
      body: JSON.stringify({
        content: caption,
        mediaItems: publicUrls.map((url) => ({ type: "image", url })),
        platforms: [
          {
            platform: "instagram",
            accountId,
          },
        ],
        publishNow: true,
      }),
    }
  );

  if (error || !data) {
    return { success: false, error: error || "Error creando post en Late" };
  }

  // Extract post URL from response
  const instagramResult = data.platforms?.find(
    (p) => p.platform === "instagram"
  );
  const postUrl = instagramResult?.platformPostUrl;
  const postId = instagramResult?.platformPostId || data._id;

  console.log(`[late] Post created: ${postId}, URL: ${postUrl || "pending"}`);

  return {
    success: true,
    postUrl: postUrl || undefined,
    postId: postId || undefined,
  };
}
