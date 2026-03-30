/**
 * AI Usage Tracker — Logs token usage and estimated costs per API call.
 *
 * Stores records in Supabase `ai_usage_logs` table for cost comparison
 * between models/providers (e.g., Claude via OpenRouter vs Gemini).
 *
 * Usage:
 *   import { trackUsage } from "@/lib/anthropic/ai-usage-tracker";
 *   await trackUsage({ model, provider, promptTokens, completionTokens, organizationId, channel });
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ──────────────────────────────────────────────
//  Pricing per 1M tokens (USD) — update as needed
// ──────────────────────────────────────────────

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude via OpenRouter
  "anthropic/claude-sonnet-4.5": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "anthropic/claude-sonnet-4-5-20250929": { inputPer1M: 3.0, outputPer1M: 15.0 },
  // Gemini (for future comparison)
  "google/gemini-2.0-flash-001": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "google/gemini-2.5-pro-preview": { inputPer1M: 1.25, outputPer1M: 10.0 },
  // Fallback
  _default: { inputPer1M: 3.0, outputPer1M: 15.0 },
};

function getPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] || MODEL_PRICING._default;
}

function estimateCostUSD(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = getPricing(model);
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPer1M;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal precision
}

// ──────────────────────────────────────────────
//  Track usage (fire-and-forget)
// ──────────────────────────────────────────────

export interface UsageRecord {
  model: string;
  provider: string; // "openrouter", "anthropic", "google", etc.
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  organization_id: string | null;
  channel: "web" | "whatsapp" | "api";
  metadata?: Record<string, unknown>; // extra context (tool names, loop count, etc.)
}

export interface TrackUsageParams {
  model: string;
  provider?: string;
  promptTokens: number;
  completionTokens: number;
  organizationId?: string | null;
  channel?: "web" | "whatsapp" | "api";
  metadata?: Record<string, unknown>;
}

/**
 * Log a single AI API call's token usage to Supabase.
 * Fire-and-forget — errors are logged but don't break the caller.
 */
export async function trackUsage(params: TrackUsageParams): Promise<void> {
  const {
    model,
    provider = "openrouter",
    promptTokens,
    completionTokens,
    organizationId = null,
    channel = "web",
    metadata,
  } = params;

  const totalTokens = promptTokens + completionTokens;
  const estimatedCost = estimateCostUSD(model, promptTokens, completionTokens);

  const record: UsageRecord = {
    model,
    provider,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    estimated_cost_usd: estimatedCost,
    organization_id: organizationId,
    channel,
    metadata: metadata || undefined,
  };

  // Log to console for immediate visibility
  console.log(
    `[ai-usage] ${model} | ${promptTokens}in + ${completionTokens}out = ${totalTokens} tokens | ~$${estimatedCost.toFixed(6)} USD | org=${organizationId || "n/a"} | ${channel}`
  );

  // Persist to DB (fire-and-forget)
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("ai_usage_logs").insert(record);
    if (error) {
      // Table might not exist yet — log but don't crash
      console.warn("[ai-usage] DB insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[ai-usage] DB insert error:", err instanceof Error ? err.message : err);
  }
}

/**
 * Accumulate usage across multiple API calls in a single conversation turn.
 * Call flush() at the end to persist the totals.
 */
export class UsageAccumulator {
  private promptTokens = 0;
  private completionTokens = 0;
  private callCount = 0;
  private toolsUsed: string[] = [];

  constructor(
    private model: string,
    private organizationId: string | null,
    private channel: "web" | "whatsapp" | "api" = "web",
    private provider: string = "openrouter"
  ) {}

  /** Add usage from one API call */
  add(promptTokens: number, completionTokens: number): void {
    this.promptTokens += promptTokens;
    this.completionTokens += completionTokens;
    this.callCount++;
  }

  /** Track a tool that was used */
  addTool(name: string): void {
    this.toolsUsed.push(name);
  }

  /** Persist accumulated totals to DB */
  async flush(): Promise<void> {
    if (this.callCount === 0) return;

    await trackUsage({
      model: this.model,
      provider: this.provider,
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      organizationId: this.organizationId,
      channel: this.channel,
      metadata: {
        api_calls: this.callCount,
        tools_used: this.toolsUsed.length > 0 ? this.toolsUsed : undefined,
      },
    });
  }
}
