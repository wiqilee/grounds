export type ProviderId = "openai" | "groq" | "google" | "openrouter";

/**
 * Request shape shared by all providers.
 * - model is required so we can safely support Gemini 3 (and any future model) without silent fallbacks.
 */
export type ChatRequest = {
  system?: string;
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;

  /**
   * Optional: allow structured outputs later (useful for Gemini 3 "decision critic").
   * Providers may ignore this.
   */
  responseFormat?: "text" | "json";
};

export type Usage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type ProviderError = {
  message: string;
  code?: string;
};

export type ChatResponseNormalized = {
  provider: ProviderId;
  model: string;
  ok: boolean;

  text?: string; // present when ok=true
  latencyMs?: number;

  usage?: Usage;
  finishReason?: string;

  error?: ProviderError; // present when ok=false
  raw?: unknown;
};

export type ProviderClient = {
  id: ProviderId;
  defaultModel: string;
  run(req: ChatRequest): Promise<ChatResponseNormalized>;
};
