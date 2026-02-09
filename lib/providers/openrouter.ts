// lib/providers/openrouter.ts
// ═══════════════════════════════════════════════════════════════════════════════
// OPENROUTER PROVIDER ADAPTER
// Multi-model gateway supporting various LLM providers
// ═══════════════════════════════════════════════════════════════════════════════
import type { ProviderClient, Usage } from "./types";

/**
 * OpenRouter returns mostly OpenAI-compatible payloads, but not always:
 * - choices[0].message.content can be:
 *   - string
 *   - array of content parts (e.g. [{ type: "text", text: "..." }])
 *   - null/undefined (some gateways/models)
 * - Some responses may use choices[0].text (legacy)
 * - Some may include output_text-ish fields depending on upstream adapter
 */
function pickText(json: any): string {
  const choice = json?.choices?.[0];

  // 1) Standard chat.completions: choices[0].message.content
  const mc = choice?.message?.content;

  if (typeof mc === "string") return mc.trim();

  // 2) Content parts array: [{ type: "text", text: "..." }, ...]
  if (Array.isArray(mc)) {
    const parts = mc
      .map((p) => {
        if (typeof p === "string") return p;
        if (p && typeof p === "object") {
          // Common shapes: { type: "text", text: "..." } or { text: "..." }
          if (typeof (p as any).text === "string") return (p as any).text;
          if (typeof (p as any).content === "string") return (p as any).content;
          if (typeof (p as any).value === "string") return (p as any).value;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();

    if (parts) return parts;
  }

  // 3) Sometimes message.content is an object (rare adapters)
  if (mc && typeof mc === "object") {
    const objText =
      (typeof (mc as any).text === "string" && (mc as any).text) ||
      (typeof (mc as any).content === "string" && (mc as any).content) ||
      "";
    if (objText) return String(objText).trim();
  }

  // 4) Legacy completion: choices[0].text
  const legacy = choice?.text;
  if (typeof legacy === "string") return legacy.trim();

  // 5) Some adapters: top-level output_text / content
  const alt =
    (typeof json?.output_text === "string" && json.output_text) ||
    (typeof json?.content === "string" && json.content) ||
    "";
  if (alt) return String(alt).trim();

  return "";
}

function pickUsage(json: any): Usage | undefined {
  const u = json?.usage;
  if (!u || typeof u !== "object") return undefined;

  // OpenRouter typically uses OpenAI-like: prompt_tokens, completion_tokens, total_tokens
  const inputTokens = typeof u.prompt_tokens === "number" ? u.prompt_tokens : undefined;
  const outputTokens = typeof u.completion_tokens === "number" ? u.completion_tokens : undefined;
  const totalTokens = typeof u.total_tokens === "number" ? u.total_tokens : undefined;

  // Some adapters might use different keys
  const inputAlt =
    inputTokens ?? (typeof u.input_tokens === "number" ? u.input_tokens : undefined) ?? undefined;
  const outputAlt =
    outputTokens ?? (typeof u.output_tokens === "number" ? u.output_tokens : undefined) ?? undefined;
  const totalAlt = totalTokens ?? (typeof u.tokens === "number" ? u.tokens : undefined) ?? undefined;

  if (inputAlt == null && outputAlt == null && totalAlt == null) return undefined;
  return { inputTokens: inputAlt, outputTokens: outputAlt, totalTokens: totalAlt };
}

function pickFinishReason(json: any): string | undefined {
  const fr = json?.choices?.[0]?.finish_reason;
  return typeof fr === "string" ? fr : undefined;
}

function extractOpenRouterErrorMessage(res: Response, json: any): string {
  // OpenRouter often returns: { error: { message, code, ... } }
  const msg =
    json?.error?.message ||
    json?.message ||
    json?.error?.details ||
    (typeof json?.error === "string" ? json.error : "") ||
    "";

  const clean = String(msg || "").trim();
  if (clean) return clean;

  if (res.status === 401) return "Unauthorized (check OPENROUTER_API_KEY)";
  if (res.status === 403) return "Forbidden (no access to this model)";
  if (res.status === 404) return "Model not found / unavailable on OpenRouter";
  if (res.status === 429) return "Rate limited (429)";
  return `OpenRouter error (${res.status})`;
}

/**
 * IMPORTANT for OpenRouter:
 * - Recommended headers:
 *   - "HTTP-Referer": your site/app URL
 *   - "X-Title": your app name
 * - Some environments accidentally send empty strings; only include when non-empty.
 */
export const openrouterClient: ProviderClient = {
  id: "openrouter",

  // Keep a reasonably available default (your UI can override)
  defaultModel: "meta-llama/llama-3.1-8b-instruct",

  async run(req) {
    const start = Date.now();
    const model = String(req.model || openrouterClient.defaultModel).trim();

    try {
      const apiKey = process.env.OPENROUTER_API_KEY ?? "";
      if (!apiKey) {
        return {
          ok: false,
          provider: "openrouter",
          model,
          text: "",
          latencyMs: Date.now() - start,
          error: { message: "Missing OPENROUTER_API_KEY" },
        };
      }

      const siteUrl = String(process.env.OPENROUTER_SITE_URL ?? "").trim();
      const appName = String(process.env.OPENROUTER_APP_NAME ?? "Grounds").trim();

      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (siteUrl) headers["HTTP-Referer"] = siteUrl;
      if (appName) headers["X-Title"] = appName;

      const body = {
        model,
        temperature: typeof req.temperature === "number" ? req.temperature : 0.2,
        max_tokens: typeof req.maxTokens === "number" ? req.maxTokens : 700,
        messages: [
          ...(req.system ? [{ role: "system", content: String(req.system) }] : []),
          { role: "user", content: String(req.prompt) },
        ],
      };

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      // Be resilient to non-JSON errors
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          ok: false,
          provider: "openrouter",
          model,
          text: "",
          latencyMs: Date.now() - start,
          error: {
            message: extractOpenRouterErrorMessage(res, json),
            code: json?.error?.code ?? json?.code,
          },
          raw: json,
        };
      }

      const text = pickText(json);

      // If OpenRouter says OK but content is empty, surface a useful hint (without failing the call).
      // This prevents "(empty)" from silently winning/losing scoring without visibility.
      const finishReason = pickFinishReason(json);
      const finalText =
        text ||
        (finishReason
          ? `[Empty content] finish_reason=${finishReason}`
          : "[Empty content] OpenRouter returned no message content");

      return {
        ok: true,
        provider: "openrouter",
        model,
        text: finalText,
        latencyMs: Date.now() - start,
        usage: pickUsage(json),
        finishReason,
        raw: json,
      };
    } catch (e: any) {
      return {
        ok: false,
        provider: "openrouter",
        model,
        text: "",
        latencyMs: Date.now() - start,
        error: { message: e?.message ?? "OpenRouter request failed" },
      };
    }
  },
};
