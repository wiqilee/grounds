// lib/providers/index.ts

import type { ProviderClient, ProviderId } from "./types";

import { openaiClient } from "./openai";
import { groqClient } from "./groq";
import { googleClient } from "./google";
import { openrouterClient } from "./openrouter";

/**
 * Provider registry (single source of truth)
 * - Add/remove providers here
 * - Keep ProviderId in ./types.ts in sync with these keys
 */
export const PROVIDERS: Record<ProviderId, ProviderClient> = {
  openai: openaiClient,
  groq: groqClient,
  google: googleClient,
  openrouter: openrouterClient,
};

/** Return a provider client (throws if unknown) */
export function getProviderClient(id: ProviderId): ProviderClient {
  return PROVIDERS[id];
}

/** Convenience for UI (stable list order) */
export const PROVIDER_LIST: Array<{ id: ProviderId; label: string }> = [
  { id: "openai", label: "OpenAI" },
  { id: "groq", label: "Groq" },
  { id: "google", label: "Google" },
  { id: "openrouter", label: "OpenRouter" },
];
