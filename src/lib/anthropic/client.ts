import OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * Get the shared OpenAI-compatible client configured for OpenRouter.
 * Singleton pattern — one instance reused across all routes.
 */
export function getAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://redbot.app",
        "X-Title": "Redbot",
      },
    });
  }
  return client;
}

/** Model ID for OpenRouter — change this to switch models */
export const AI_MODEL = "google/gemini-2.0-flash-001";
