import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY || "dummy_key";
  const baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

  return new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      "HTTP-Referer": process.env.SITE_URL || "http://localhost:5000",
      "X-Title": process.env.SITE_NAME || "Reconcile.ai",
    },
  });
}

export function getLlmConfig() {
  return {
    model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
    confidenceThreshold: parseFloat(process.env.LLM_CONFIDENCE_THRESHOLD || "0.60"),
    batchSize: parseInt(process.env.LLM_BATCH_SIZE || "15", 10),
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || "30000", 10),
  };
}
