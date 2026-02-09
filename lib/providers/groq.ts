// lib/providers/groq.ts
// ═══════════════════════════════════════════════════════════════════════════════
// GROQ PROVIDER ADAPTER
// Fast inference provider using Llama models
// ═══════════════════════════════════════════════════════════════════════════════
import type { ProviderClient, Usage } from "./types";

function pickText(json: any): string {
  return String(json?.choices?.[0]?.message?.content ?? "").trim();
}

function pickUsage(json: any): Usage | undefined {
  const u = json?.usage;
  if (!u || typeof u !== "object") return undefined;

  const inputTokens = typeof u.prompt_tokens === "number" ? u.prompt_tokens : undefined;
  const outputTokens = typeof u.completion_tokens === "number" ? u.completion_tokens : undefined;
  const totalTokens = typeof u.total_tokens === "number" ? u.total_tokens : undefined;

  if (inputTokens == null && outputTokens == null && totalTokens == null) return undefined;
  return { inputTokens, outputTokens, totalTokens };
}

function pickFinishReason(json: any): string | undefined {
  const fr = json?.choices?.[0]?.finish_reason;
  return typeof fr === "string" && fr.trim() ? fr.trim() : undefined;
}

function extractGroqErrorMessage(res: Response, json: any): string {
  // Groq is OpenAI-compatible; errors can show up in several shapes.
  const msg =
    json?.error?.message ??
    json?.message ??
    json?.error ??
    json?.data?.error?.message ??
    json?.data?.error ??
    "";

  const clean = String(msg || "").trim();
  if (clean) return clean;

  if (res.status === 401) return "Unauthorized (check GROQ_API_KEY)";
  if (res.status === 403) return "Forbidden (no access to this model)";
  if (res.status === 404) return "Not found (check endpoint/model)";
  if (res.status === 429) return "Rate limited (429)";
  if (res.status >= 500) return `Groq upstream error (${res.status})`;

  return `Groq error (${res.status})`;
}

export const groqClient: ProviderClient = {
  id: "groq",
  // ✅ Updated to latest Llama model
  defaultModel: "llama-3.3-70b-versatile",

  async run(req) {
    const start = Date.now();
    const model = String(req.model || groqClient.defaultModel).trim();

    try {
      const apiKey = process.env.GROQ_API_KEY ?? "";
      if (!apiKey) {
        return {
          ok: false,
          provider: "groq",
          model,
          text: "",
          latencyMs: Date.now() - start,
          error: { message: "Missing GROQ_API_KEY" },
        };
      }

      const temperature = typeof req.temperature === "number" ? req.temperature : 0.2;
      const maxTokens = typeof req.maxTokens === "number" ? req.maxTokens : 700;

      const system = String(req.system ?? "").trim();
      const prompt = String(req.prompt ?? "");

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            { role: "user", content: prompt },
          ],
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          ok: false,
          provider: "groq",
          model,
          text: "",
          latencyMs: Date.now() - start,
          error: {
            message: extractGroqErrorMessage(res, json),
            code: json?.error?.code ?? json?.code,
          },
          raw: json,
        };
      }

      const text = pickText(json);
      const finishReason = pickFinishReason(json);

      // Avoid silent empties (they mess with scoring and confuse UI).
      const finalText =
        text ||
        (finishReason
          ? `[Empty content] finish_reason=${finishReason}`
          : "[Empty content] Groq returned no text content");

      return {
        ok: true,
        provider: "groq",
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
        provider: "groq",
        model,
        text: "",
        latencyMs: Date.now() - start,
        error: { message: e?.message ?? "Groq request failed" },
      };
    }
  },
};
