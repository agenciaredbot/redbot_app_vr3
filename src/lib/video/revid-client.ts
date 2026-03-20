/**
 * Revid AI API Client — v3
 *
 * Handles all communication with Revid AI for video rendering.
 * Uses a centralized API key (env var), not per-tenant.
 * Videos are hosted on Revid CDN — zero local storage.
 *
 * API docs: https://documenter.getpostman.com/view/36975521/2sBXcGEfaB
 * Base URL: https://www.revid.ai/api/public/v3
 */

import type {
  RevidRenderPayload,
  RevidRenderResponse,
  RevidStatusResponse,
  RevidCreditEstimate,
} from "./types";

const REVID_BASE_URL = "https://www.revid.ai/api/public/v3";

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.REVID_API_KEY;
  if (!key) {
    throw new Error("[revid] REVID_API_KEY not configured");
  }
  return key;
}

function getWebhookUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://redbot.app";
  const secret = process.env.REVID_WEBHOOK_SECRET || "";
  return `${appUrl}/api/webhooks/revid?secret=${encodeURIComponent(secret)}`;
}

function revidHeaders(includeAuth = true): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (includeAuth) {
    headers["key"] = getApiKey();
  }
  return headers;
}

/**
 * Generic Revid API request wrapper.
 * Returns { data, error, status } like late-client.
 */
async function revidRequest<T>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<{ data: T | null; error: string | null; status: number }> {
  const { skipAuth, ...fetchOptions } = options || {};

  try {
    const res = await fetch(`${REVID_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        ...revidHeaders(!skipAuth),
        ...(fetchOptions?.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let errorMsg = `Revid API error (${res.status})`;
      try {
        const json = JSON.parse(text);
        errorMsg = json.message || json.error || json.detail || errorMsg;
      } catch {
        if (text) errorMsg = text.slice(0, 200);
      }
      console.error(`[revid] ${fetchOptions?.method || "GET"} ${path} → ${res.status}: ${errorMsg}`);
      return { data: null, error: errorMsg, status: res.status };
    }

    const data = (await res.json()) as T;
    return { data, error: null, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de conexión con el servicio de video";
    console.error(`[revid] ${path} fetch error:`, msg);
    return { data: null, error: msg, status: 0 };
  }
}

// ──────────────────────────────────────────────
//  Render Video
// ──────────────────────────────────────────────

/**
 * Submit a video render job to Revid.
 * Returns the project ID for status tracking.
 *
 * The webhookUrl is automatically appended.
 */
export async function renderVideo(
  payload: RevidRenderPayload
): Promise<{ projectId: string | null; error: string | null }> {
  // Inject webhook URL
  const fullPayload = {
    ...payload,
    webhookUrl: payload.webhookUrl || getWebhookUrl(),
  };

  console.log(`[revid] Rendering video: workflow=${payload.workflow}`);

  const { data, error } = await revidRequest<RevidRenderResponse>("/render", {
    method: "POST",
    body: JSON.stringify(fullPayload),
  });

  if (error || !data) {
    return { projectId: null, error: error || "No response from Revid" };
  }

  const projectId = data.pid || null;
  if (!projectId) {
    console.error("[revid] Render response missing pid:", JSON.stringify(data));
    return { projectId: null, error: "El servicio de video no devolvió un ID de proyecto" };
  }

  console.log(`[revid] Render started: pid=${projectId}`);
  return { projectId, error: null };
}

// ──────────────────────────────────────────────
//  Video Status
// ──────────────────────────────────────────────

/**
 * Check the rendering status of a video project.
 */
export async function getVideoStatus(
  projectId: string
): Promise<{ data: RevidStatusResponse | null; error: string | null }> {
  const { data, error } = await revidRequest<RevidStatusResponse>(
    `/status?pid=${encodeURIComponent(projectId)}`
  );
  return { data, error };
}

// ──────────────────────────────────────────────
//  Credit Estimation
// ──────────────────────────────────────────────

/**
 * Estimate how many credits a render will cost.
 * Does NOT require authentication.
 */
export async function calculateCredits(
  payload: Omit<RevidRenderPayload, "webhookUrl">
): Promise<{ credits: number | null; error: string | null }> {
  const { data, error } = await revidRequest<RevidCreditEstimate>(
    "/calculate-credits",
    {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuth: true,
    }
  );

  if (error || !data) {
    return { credits: null, error: error || "No response" };
  }

  return { credits: data.credits ?? null, error: null };
}

// ──────────────────────────────────────────────
//  List Projects
// ──────────────────────────────────────────────

/**
 * List recent Revid projects (from the centralized account).
 */
export async function listRevidProjects(
  limit = 10
): Promise<{ data: unknown[] | null; error: string | null }> {
  const { data, error } = await revidRequest<unknown[]>(
    `/projects?limit=${limit}`
  );
  return { data, error };
}

// ──────────────────────────────────────────────
//  Webhook Verification
// ──────────────────────────────────────────────

/**
 * Verify the webhook secret from query params.
 */
export function verifyRevidWebhookSecret(secretParam: string | null): boolean {
  const expected = process.env.REVID_WEBHOOK_SECRET;
  if (!expected) {
    console.warn("[revid] REVID_WEBHOOK_SECRET not configured — rejecting webhook");
    return false;
  }
  return secretParam === expected;
}
