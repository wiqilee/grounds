// lib/providers/openai.ts
// ═══════════════════════════════════════════════════════════════════════════════
// OPENAI PROVIDER ADAPTER
// Uses OpenAI Responses API (newer than Chat Completions)
// ═══════════════════════════════════════════════════════════════════════════════
import type { ProviderClient, Usage } from "./types";

/**
 * OpenAI Responses API text extraction (robust).
 * - Prefer `output_text` convenience field when present.
 * - Otherwise aggregate across output[].content[] parts.
 */
function pickText(json: any): string {
  // Convenience field often present
  if (typeof json?.output_text === "string" && json.output_text.trim()) {
    return json.output_text.trim();
  }

  const out = json?.output;
  if (!Array.isArray(out) || out.length === 0) return "";

  const chunks: string[] = [];

  for (const item of out) {
    const content = item?.content;
    if (!Array.isArray(content)) continue;

    for (const c of content) {
      // Common shapes:
      // - { type: "output_text", text: "..." }
      // - { type: "text", text: "..." }
      // - { text: "..." }
      // - { content: "..." }
      if (typeof c?.text === "string" && c.text.trim()) chunks.push(c.text);
      else if (typeof c?.content === "string" && c.content.trim()) chunks.push(c.content);
      else if (typeof c?.value === "string" && c.value.trim()) chunks.push(c.value);
    }
  }

  return chunks.join("\n").trim();
}

function pickUsage(json: any): Usage | undefined {
  const u = json?.usage;
  if (!u || typeof u !== "object") return undefined;

  // Responses API typically: input_tokens, output_tokens, total_tokens
  const inputTokens = typeof u.input_tokens === "number" ? u.input_tokens : undefined;
  const outputTokens = typeof u.output_tokens === "number" ? u.output_tokens : undefined;
  const totalTokens = typeof u.total_tokens === "number" ? u.total_tokens : undefined;

  if (inputTokens == null && outputTokens == null && totalTokens == null) return undefined;
  return { inputTokens, outputTokens, totalTokens };
}

function pickFinishReason(json: any): string | undefined {
  // Responses API often includes finish_reason on output items
  const out0 = json?.output?.[0];
  const fr = out0?.finish_reason;
  if (typeof fr === "string" && fr.trim()) return fr.trim();

  // Fallback to status
  const status = json?.status;
  if (typeof status === "string" && status.trim()) return status.trim();

  return undefined;
}

function extractOpenAIErrorMessage(res: Response, json: any): string {
  const msg =
    json?.error?.message ??
    json?.message ??
    json?.error ??
    json?.data?.error?.message ??
    json?.data?.error ??
    "";

  const clean = String(msg || "").trim();
  if (clean) return clean;

  if (res.status === 401) return "Unauthorized (check OPENAI_API_KEY)";
  if (res.status === 403) return "Forbidden (no access to this model)";
  if (res.status === 404) return "Not found (check endpoint/model)";
  if (res.status === 429) return "Rate limited (429)";
  return `OpenAI error (${res.status})`;
}

/**
 * OpenAI Responses API:
 * - endpoint: POST /v1/responses
 * - body: { model, input, instructions?, temperature?, max_output_tokens? }
 */
export const openaiClient: ProviderClient = {
  id: "openai",
  defaultModel: "gpt-4.1-mini",

  async run(req) {
    const start = Date.now();
    const model = String(req.model || openaiClient.defaultModel).trim();

    try {
      const apiKey = process.env.OPENAI_API_KEY ?? "";
      if (!apiKey) {
        return {
          ok: false,
          provider: "openai",
          model,
          text: "",
          latencyMs: Date.now() - start,
          error: { message: "Missing OPENAI_API_KEY" },
        };
      }

      const body: any = {
        model,
        input: String(req.prompt ?? ""),
        max_output_tokens: typeof req.maxTokens === "number" ? req.maxTokens : 700,
      };

      // Temperature is supported for many (but not all) models.
      if (typeof req.temperature === "number") body.temperature = req.temperature;

      const sys = String(req.system ?? "").trim();
      if (sys) body.instructions = sys;

      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          ok: false,
          provider: "openai",
          model,
          text: "",
          latencyMs: Date.now() - start,
          error: {
            message: extractOpenAIErrorMessage(res, json),
            code: json?.error?.code ?? json?.code,
          },
          raw: json,
        };
      }

      const text = pickText(json);
      const finishReason = pickFinishReason(json);

      // Prevent silent empties from skewing scoring/UI.
      const finalText =
        text ||
        (finishReason
          ? `[Empty content] finish_reason=${finishReason}`
          : "[Empty content] OpenAI returned no text content");

      return {
        ok: true,
        provider: "openai",
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
        provider: "openai",
        model,
        text: "",
        latencyMs: Date.now() - start,
        error: { message: e?.message ?? "OpenAI request failed" },
      };
    }
  },
};
