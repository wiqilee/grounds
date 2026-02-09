// lib/providers/google.ts
// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE GEMINI PROVIDER ADAPTER
// Primary provider for Grounds decision-grade reports
// 
// Features:
// - Decision-grade output shaping with structured headers
// - Model aliasing (gemini-3-flash-preview → gemini-3-flash)
// - Automatic continuation for truncated NEXT ACTIONS
// - Emoji injection for visual hierarchy
// - Fallback chain (v1beta → v1, sibling models)
// ═══════════════════════════════════════════════════════════════════════════════
import type { ProviderClient, Usage } from "./types";

/* ---------------- response helpers ---------------- */

function pickText(json: any): string {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

/**
 * Gemini usageMetadata:
 * { promptTokenCount, candidatesTokenCount, totalTokenCount }
 */
function pickUsage(json: any): Usage | undefined {
  const u = json?.usageMetadata;
  if (!u || typeof u !== "object") return undefined;

  const inputTokens = typeof u.promptTokenCount === "number" ? u.promptTokenCount : undefined;
  const outputTokens = typeof u.candidatesTokenCount === "number" ? u.candidatesTokenCount : undefined;
  const totalTokens = typeof u.totalTokenCount === "number" ? u.totalTokenCount : undefined;

  if (inputTokens == null && outputTokens == null && totalTokens == null) return undefined;
  return { inputTokens, outputTokens, totalTokens };
}

function pickFinishReason(json: any): string | undefined {
  const r = json?.candidates?.[0]?.finishReason;
  return typeof r === "string" && r.trim() ? r.trim() : undefined;
}

/* ---------------- env + model ---------------- */

function normalizeModel(model: string) {
  const m = (model || "").trim();
  return m.startsWith("models/") ? m.slice("models/".length) : m;
}

function normalizeModelLabel(model: string) {
  return String(model || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/g, "-");
}

function envStr(...keys: string[]) {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function envBool(key: string, fallback = false) {
  const v = envStr(key);
  if (!v) return fallback;
  return ["1", "true", "yes", "y", "on"].includes(v.toLowerCase());
}

/**
 * Resolver normalizes + aliases common UI strings to actual Gemini model ids.
 */
function resolveGoogleModel(inputModel: string): {
  requested: string;
  actual: string;
  fallbacks: string[];
  gemini3Flash: string;
  gemini3Pro: string;
  stableFallback: string;
} {
  const requested = normalizeModel(inputModel);
  const key = normalizeModelLabel(requested);

  const gemini3Flash = envStr("GOOGLE_GEMINI3_FLASH_MODEL", "GEMINI3_FLASH_MODEL") || "gemini-3-flash";
  const gemini3Pro = envStr("GOOGLE_GEMINI3_PRO_MODEL", "GEMINI3_PRO_MODEL") || "gemini-3-pro";

  const stableFallback =
    envStr("GOOGLE_GEMINI_STABLE_FALLBACK_MODEL", "GEMINI_STABLE_FALLBACK_MODEL") || "gemini-2.5-flash";

  const aliasMap: Record<string, string> = {
    // Gemini 3
    "gemini-3-flash": gemini3Flash,
    "gemini-3-pro": gemini3Pro,
    "gemini-3-flash-preview": gemini3Flash,
    "gemini-3-pro-preview": gemini3Pro,
    "gemini3-flash": gemini3Flash,
    "gemini3-pro": gemini3Pro,
    "models-gemini-3-flash": gemini3Flash,
    "models-gemini-3-pro": gemini3Pro,

    // Older
    "gemini-2.5-flash": "gemini-2.5-flash",
    "gemini-1.5-flash": "gemini-1.5-flash",
    "gemini-1.5-pro": "gemini-1.5-pro",
  };

  const actual = aliasMap[key] ?? requested;

  const sibling = actual === gemini3Flash ? gemini3Pro : gemini3Flash;

  const uniq = (arr: string[]) => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const x of arr) {
      const m = String(x || "").trim();
      if (!m) continue;
      if (seen.has(m)) continue;
      seen.add(m);
      out.push(m);
    }
    return out;
  };

  const fallbacks = uniq([sibling, stableFallback]);

  return { requested, actual, fallbacks, gemini3Flash, gemini3Pro, stableFallback };
}

function getGoogleApiKey(): string {
  return envStr("GOOGLE_API_KEY", "GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY");
}

/* ---------------- decision-grade shaping ---------------- */

const DECISION_GRADE_SUFFIX = `
OUTPUT FORMAT (follow exactly):

BEST OPTION
- [Your recommendation in 1-2 sentences]

RATIONALE  
- [3-4 specific reasons supporting the recommendation]

TOP RISKS
- [3-4 specific risks relevant to this decision]

ASSUMPTIONS TO VALIDATE
- [3-4 key assumptions that need verification]

HALF-LIFE
- [When should this decision be reviewed?]

BLIND SPOTS
- [What might we be missing?]

NEXT ACTIONS
- Action: [Specific task]
  Owner: [Team/Role]
  Timebox: [Timeline]
(Provide 5-6 action items)

RULES:
- Be SPECIFIC to this decision context
- No generic placeholders
- Each bullet must be unique (no repetition)
`.trim();

const FORMAT_GUARD = `
CRITICAL: Output must be clean and non-repetitive.
- Each section header on its own line
- Use '-' bullets
- No repeated content
- Be specific to the decision context
`.trim();

function looksLikeDecisionCompare(prompt: string, system?: string) {
  const p = `${system ?? ""}\n${prompt ?? ""}`.toLowerCase();
  return (
    p.includes("best option") ||
    p.includes("rationale") ||
    p.includes("top risks") ||
    p.includes("assumptions to validate") ||
    p.includes("half-life") ||
    p.includes("blind spots") ||
    p.includes("next actions") ||
    p.includes("rewrite the draft into the strict template") ||
    p.includes("draft to rewrite") ||
    p.includes("decision-grade")
  );
}

function looksLikeCriticPass(prompt: string, system?: string) {
  const p = `${system ?? ""}\n${prompt ?? ""}`.toLowerCase();
  return (
    p.includes("hard edges") ||
    p.includes("generic language") ||
    p.includes("blind spots") ||
    (p.includes("critic") && p.includes("next actions"))
  );
}

function looksLikeRepairPass(prompt: string, system?: string) {
  const p = `${system ?? ""}\n${prompt ?? ""}`.toLowerCase();
  return p.includes("rewrite the draft into the strict template") || p.includes("draft to rewrite");
}

function appendDecisionSuffix(prompt: string): string {
  const p = String(prompt || "").trim();
  const up = p.toUpperCase();
  if (up.includes("BEST OPTION") && up.includes("NEXT ACTIONS") && up.includes("BLIND SPOTS")) return p;
  return `${p}\n\n${DECISION_GRADE_SUFFIX}\n`;
}

function applyCompareGuard(prompt: string): string {
  const p = String(prompt || "").trim();
  const up = p.toUpperCase();
  if (up.includes("FORMAT GUARD") && up.includes("PLAIN TEXT ONLY")) return p;
  return `${FORMAT_GUARD}\n\n${p}`;
}

/* ---------------- structure checks (shared by cleanup + continuation) ---------------- */

const REQUIRED_HEADERS = [
  "BEST OPTION",
  "RATIONALE",
  "TOP RISKS",
  "ASSUMPTIONS TO VALIDATE",
  "HALF-LIFE",
  "BLIND SPOTS",
  "NEXT ACTIONS",
] as const;

type RequiredHeader = (typeof REQUIRED_HEADERS)[number];

function normalizeHeaderText(s?: string) {
  return String(s ?? "")
    .trim()
    .replace(/^#{1,6}\s*/g, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/:$/g, "")
    .trim()
    .toUpperCase();
}

function isHeading(line: string): boolean {
  const l = line.trim();
  if (!l) return false;
  if (/^#{1,6}\s+/.test(l)) return true;
  if (/^[A-Z0-9][A-Z0-9 _-]{3,}:$/.test(l)) return true;
  if (/^\*\*[A-Z0-9][A-Z0-9 _-]{2,}\*\*$/.test(l)) return true;
  if (/^[A-Z][A-Z _-]{2,}$/.test(l)) return true;
  return false;
}

function findMissingHeaders(text?: string): RequiredHeader[] {
  const raw = String(text ?? "").replace(/\r\n/g, "\n").trim();
  if (!raw) return [...REQUIRED_HEADERS];

  const lines = raw.split("\n");
  const seen = new Set<string>();

  for (const line of lines) {
    if (!isHeading(line)) continue;
    const h = normalizeHeaderText(line);
    for (const req of REQUIRED_HEADERS) {
      if (h === req) seen.add(req);
    }
  }

  const missing: RequiredHeader[] = [];
  for (const req of REQUIRED_HEADERS) if (!seen.has(req)) missing.push(req);
  return missing;
}

/* ---------------- text cleanup ---------------- */

/**
 * Key patch:
 * - after stripping markdown, REMOVE stray header-only lines that tend to echo/repeat
 *   and later confuse compare.ts enforcement (e.g. "BEST OPTION" repeated inside sections).
 * - keep only the FIRST occurrence of each required header; drop duplicates.
 */
function cleanModelText(text: string): string {
  let t = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!t) return t;

  // Strip common markdown noise
  t = t.replace(/^#{1,6}\s+/gm, "");
  t = t.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1");
  t = t.replace(/^[•*]\s+/gm, "- ");
  t = t.replace(/\n{3,}/g, "\n\n").trim();

  if (!t) return t;

  // ✅ Header emoji mapping for decision-grade output
  const HEADER_EMOJIS: Record<string, string> = {
    "BEST OPTION": "🏆",
    "RATIONALE": "🧩",
    "TOP RISKS": "⚠️",
    "ASSUMPTIONS TO VALIDATE": "🧱",
    "HALF-LIFE": "⏳",
    "BLIND SPOTS": "🕳️",
    "NEXT ACTIONS": "✅",
  };

  // De-dupe headers + drop stray header-only lines (beyond the first valid one)
  const lines = t.split("\n");
  const out: string[] = [];
  const seenHeaders = new Set<string>();
  const seenBullets = new Set<string>(); // ✅ Track bullets for dedup

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      out.push("");
      continue;
    }

    if (isHeading(trimmed)) {
      const h = normalizeHeaderText(trimmed);

      // If it's a required header, keep only the first occurrence.
      if ((REQUIRED_HEADERS as readonly string[]).includes(h)) {
        if (seenHeaders.has(h)) {
          // drop repeated header-only lines
          continue;
        }
        seenHeaders.add(h);
        // ✅ Add emoji to header
        const emoji = HEADER_EMOJIS[h] || "";
        out.push(emoji ? `${emoji} ${h}` : h);
        // Reset bullet tracking for new section
        seenBullets.clear();
        continue;
      }

      // Non-required headings are usually noise; drop them.
      continue;
    }

    // ✅ Deduplicate bullets within sections
    if (trimmed.startsWith("-")) {
      const bulletContent = trimmed.slice(1).trim().toLowerCase();
      if (bulletContent.length > 10 && seenBullets.has(bulletContent)) {
        continue; // Skip duplicate bullet
      }
      seenBullets.add(bulletContent);
    }

    out.push(line);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ---------------- NEXT ACTIONS completion helpers ---------------- */

function countActionBlocks(text: string): number {
  const lines = String(text || "").split("\n");
  let n = 0;
  for (const line of lines) {
    if (/^\s*[-*•]?\s*Action\s*:\s*\S+/i.test(line.trim())) n++;
  }
  return n;
}

function hasNextActionsHeader(text: string): boolean {
  const lines = String(text || "").split("\n");
  return lines.some((l) => l.trim().toUpperCase() === "NEXT ACTIONS");
}

function replaceOrAppendNextActions(fullText: string, nextActionsSection: string): string {
  const src = String(fullText || "").trim();
  const section = String(nextActionsSection || "").trim();
  if (!section) return src;

  const lines = src.split("\n");
  const headerIdx = lines.findIndex((l) => l.trim().toUpperCase() === "NEXT ACTIONS");

  const sectionBody = section
    .replace(/^NEXT ACTIONS\s*/i, "")
    .trim()
    .replace(/\n{3,}/g, "\n\n");

  if (headerIdx < 0) {
    return `${src}\n\nNEXT ACTIONS\n${sectionBody}`.trim();
  }

  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const tt = lines[i].trim();
    if (!tt) continue;
    if (/^[A-Z][A-Z0-9 _-]{2,}$/.test(tt)) {
      endIdx = i;
      break;
    }
  }

  const before = lines.slice(0, headerIdx + 1);
  const after = lines.slice(endIdx);

  return [...before, sectionBody, ...after].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ---------------- error helpers ---------------- */

function extractRetryAfterSeconds(msg: string): number | null {
  const m = String(msg || "").match(/retry in\s+(\d+)\s*seconds?/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractGoogleErrorMessage(res: Response, json: any): string {
  const msg =
    json?.error?.message ||
    json?.message ||
    json?.error?.status ||
    json?.error?.details?.[0]?.message ||
    "";

  const clean = String(msg || "").trim();
  if (clean) return clean;

  if (res.status === 401) return "Unauthorized (check GOOGLE_API_KEY)";
  if (res.status === 403) return "Forbidden (no access to this model / project)";
  if (res.status === 404) return "Model not found / unavailable (check model id + API version)";
  if (res.status === 429) return "Rate limited (429)";
  if (res.status >= 500) return `Google server error (${res.status})`;

  return `Google error (${res.status})`;
}

function isModelOrVersionMismatch(res: Response, json: any): boolean {
  const msg = String(json?.error?.message ?? json?.message ?? "").toLowerCase();
  if (msg.includes("not found for api version")) return true;
  if (msg.includes("not supported for generatecontent")) return true;
  if (msg.includes("does not exist")) return true;
  if (msg.includes("model") && msg.includes("not found")) return true;
  if (msg.includes("model") && msg.includes("not available")) return true;
  if (msg.includes("permission denied")) return true;
  if (res.status === 404) return true;
  return false;
}

function isEndpointOrVersionIssue(res: Response, json: any): boolean {
  const msg = String(json?.error?.message ?? json?.message ?? "").toLowerCase();
  if (msg.includes("method not found")) return true;
  if (msg.includes("unknown method")) return true;
  if (msg.includes("unimplemented")) return true;
  if (res.status === 404 && msg.includes(":generatecontent") && msg.includes("not found")) return true;
  if (msg.includes("unknown api version")) return true;
  return false;
}

/**
 * Transient overload: retry once (maybe smaller maxOutputTokens), then fail over.
 */
function isTransientOverload(res: Response, json: any): boolean {
  const msg = String(json?.error?.message ?? json?.message ?? "").toLowerCase();

  const overloadSignals = [
    "overloaded",
    "model is overloaded",
    "temporarily unavailable",
    "try again later",
    "backend error",
    "internal error",
    "unavailable",
    "service unavailable",
  ];

  const hardQuotaSignals = ["quota exceeded", "exceeded your quota", "free_tier", "free tier", "rate limit metric"];

  if (hardQuotaSignals.some((s) => msg.includes(s))) return false;

  if ([500, 502, 503, 504].includes(res.status)) return true;

  if (res.status === 429) return overloadSignals.some((s) => msg.includes(s));

  return overloadSignals.some((s) => msg.includes(s));
}

/**
 * HARD quota / hard rate-limit:
 * If this triggers: STOP EARLY (do not try more models).
 */
function isHardQuotaOrRateLimit(res: Response, json: any): boolean {
  if (isModelOrVersionMismatch(res, json)) return false;

  const rawMsg = String(json?.error?.message ?? json?.message ?? "");
  const msg = rawMsg.toLowerCase();
  const status = res.status;

  const hardSignals = [
    "you exceeded your current quota",
    "quota exceeded",
    "exceeded your quota",
    "free_tier",
    "free tier",
    "free_tier_requests_limit",
    "requests_limit",
    "rate limit metric",
    "per-minute",
    "per minute",
    "per-day",
    "per day",
    "resource exhausted",
    "resource_exhausted",
    "too many requests",
    "rate limit exceeded",
    "billing",
    "payment required",
  ];

  if (hardSignals.some((s) => msg.includes(s))) {
    if ([402, 403, 429].includes(status)) return true;
    if (status === 400 && (msg.includes("resource exhausted") || msg.includes("resource_exhausted"))) return true;
    if (msg.includes("quota exceeded") || msg.includes("you exceeded your current quota")) return true;
  }

  if (status === 402) return true;

  if (status === 429 && !isTransientOverload(res, json)) return true;

  return false;
}

function isSystemInstructionRejected(res: Response, json: any): boolean {
  const msg = String(json?.error?.message ?? json?.message ?? "").toLowerCase();
  return (
    res.status === 400 &&
    msg.includes("systeminstruction") &&
    (msg.includes("unknown name") || msg.includes("cannot find field") || msg.includes("invalid json payload"))
  );
}

function mergeSystemIntoPrompt(system: string | undefined, prompt: string): string {
  const s = String(system ?? "").trim();
  if (!s) return prompt;
  return `SYSTEM:\n${s}\n\nUSER:\n${prompt}`;
}

/* ---------------- token strategy ---------------- */

function clamp2(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeMaxOutputTokens(reqMaxTokens: any, mode: "default" | "compare" | "repair"): number {
  const base = typeof reqMaxTokens === "number" && Number.isFinite(reqMaxTokens) ? Math.floor(reqMaxTokens) : 1600;

  if (mode === "repair") return clamp2(Math.round(Math.max(base, 3000) * 1.12), 2800, 4096);
  if (mode === "compare") return clamp2(Math.round(Math.max(base, 2400) * 1.08), 2200, 3800);

  return clamp2(base, 900, 3000);
}

function overloadMaxOutputTokens(mode: "default" | "compare" | "repair"): number {
  if (mode === "repair") return 1800;
  if (mode === "compare") return 1500;
  return 1100;
}

function tunedTemperature(mode: "default" | "compare" | "repair", reqTemp?: number): number {
  const t = typeof reqTemp === "number" && Number.isFinite(reqTemp) ? reqTemp : undefined;

  if (mode === "repair") return clamp2(typeof t === "number" ? t : 0.12, 0, 0.22);
  if (mode === "compare") return clamp2(typeof t === "number" ? t : 0.15, 0, 0.25);
  return clamp2(typeof t === "number" ? t : 0.22, 0, 0.7);
}

/* ---------------- HTTP call ---------------- */

async function callGoogle(opts: {
  apiKey: string;
  model: string;
  system?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens: number;
  apiVersion: "v1" | "v1beta";
  includeSystemInstruction: boolean;
}) {
  const { apiKey, model, system, prompt, temperature, maxOutputTokens, apiVersion, includeSystemInstruction } = opts;

  const url =
    `https://generativelanguage.googleapis.com/${apiVersion}/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const body: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: typeof temperature === "number" ? temperature : 0.2,
      maxOutputTokens,
    },
  };

  if (includeSystemInstruction && system && system.trim()) {
    body.systemInstruction = { parts: [{ text: system.trim() }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  return { res, json };
}

/* ---------------- tiny retry helpers ---------------- */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(baseMs: number, pct = 0.25) {
  const span = Math.round(baseMs * pct);
  const delta = Math.floor(Math.random() * (span * 2 + 1)) - span;
  return Math.max(0, baseMs + delta);
}

function isProLike(model: string) {
  const m = String(model || "").toLowerCase();
  return m.includes("pro");
}

/* ---------------- client ---------------- */

export const googleClient: ProviderClient = {
  id: "google",

  defaultModel: envStr("GOOGLE_DEFAULT_MODEL", "GEMINI_DEFAULT_MODEL") || "gemini-3-pro",

  async run(req) {
    const start = Date.now();

    const requestedModel = normalizeModel((req as any).model || googleClient.defaultModel);
    const { actual, fallbacks, gemini3Pro, gemini3Flash } = resolveGoogleModel(requestedModel);

    const isCompare = looksLikeDecisionCompare(req.prompt, req.system) || looksLikeCriticPass(req.prompt, req.system);
    const isRepair = looksLikeRepairPass(req.prompt, req.system);

    const mode: "default" | "compare" | "repair" = isRepair ? "repair" : isCompare ? "compare" : "default";
    const temperature = tunedTemperature(mode, req.temperature);

    const preferProForDecision = envBool("GOOGLE_PREFER_PRO_FOR_DECISION", true);

    const modelsToTry = (() => {
      const list: string[] = [];

      if ((isRepair || isCompare) && preferProForDecision) {
        if (actual === gemini3Flash) list.push(gemini3Pro, actual, ...fallbacks);
        else list.push(actual, ...fallbacks);
      } else {
        list.push(actual, ...fallbacks);
      }

      if (list.some((m) => String(m).trim() === gemini3Pro) && !list.includes(gemini3Flash)) {
        list.push(gemini3Flash);
      }

      const out: string[] = [];
      const seen = new Set<string>();
      for (const m of list) {
        const mm = String(m || "").trim();
        if (!mm) continue;
        if (seen.has(mm)) continue;
        seen.add(mm);
        out.push(mm);
      }
      return out;
    })();

    const apiKey = getGoogleApiKey();
    if (!apiKey) {
      return {
        ok: false,
        provider: "google",
        model: modelsToTry[0] || actual,
        text: "",
        latencyMs: Date.now() - start,
        error: { message: "Missing GOOGLE_API_KEY (or GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY)" },
      };
    }

    const decisionMode = isCompare || isRepair;
    let basePrompt = decisionMode ? appendDecisionSuffix(req.prompt) : String(req.prompt || "").trim();
    if (decisionMode) basePrompt = applyCompareGuard(basePrompt);

    const maxOutputTokensNormal = computeMaxOutputTokens((req as any).maxTokens, mode);
    const maxOutputTokensOverload = overloadMaxOutputTokens(mode);

    const runOnce = async (opts: {
      modelToUse: string;
      promptToUse: string;
      includeSystemInstruction: boolean;
      maxOutputTokensOverride?: number;
    }): Promise<{ res: Response; json: any; usedVersion: "v1" | "v1beta" }> => {
      const { modelToUse, promptToUse, includeSystemInstruction, maxOutputTokensOverride } = opts;

      let usedVersion: "v1" | "v1beta" = "v1beta";
      const maxOut = typeof maxOutputTokensOverride === "number" ? maxOutputTokensOverride : maxOutputTokensNormal;

      let { res, json } = await callGoogle({
        apiKey,
        model: modelToUse,
        system: req.system,
        prompt: promptToUse,
        temperature,
        maxOutputTokens: maxOut,
        apiVersion: "v1beta",
        includeSystemInstruction,
      });

      if (!res.ok && isEndpointOrVersionIssue(res, json)) {
        usedVersion = "v1";
        const retry = await callGoogle({
          apiKey,
          model: modelToUse,
          system: req.system,
          prompt: promptToUse,
          temperature,
          maxOutputTokens: maxOut,
          apiVersion: "v1",
          includeSystemInstruction,
        });
        res = retry.res;
        json = retry.json;
      }

      return { res, json, usedVersion };
    };

    const runWithSystemFallback = async (opts: {
      modelToUse: string;
      promptToUse: string;
      maxOutputTokensOverride?: number;
    }) => {
      const { modelToUse, promptToUse, maxOutputTokensOverride } = opts;

      let out = await runOnce({
        modelToUse,
        promptToUse,
        includeSystemInstruction: false,
        maxOutputTokensOverride,
      });

      if (!out.res.ok && req.system && String(req.system).trim()) {
        const attemptWithSystem = await runOnce({
          modelToUse,
          promptToUse,
          includeSystemInstruction: true,
          maxOutputTokensOverride,
        });

        if (!attemptWithSystem.res.ok && isSystemInstructionRejected(attemptWithSystem.res, attemptWithSystem.json)) {
          const merged = mergeSystemIntoPrompt(req.system, promptToUse);
          out = await runOnce({
            modelToUse,
            promptToUse: merged,
            includeSystemInstruction: false,
            maxOutputTokensOverride,
          });
        } else {
          out = attemptWithSystem;
        }
      }

      return out;
    };

    const runWithOverloadPolicy = async (modelToUse: string, promptToUse: string) => {
      let out = await runWithSystemFallback({ modelToUse, promptToUse });

      if (!out.res.ok && isTransientOverload(out.res, out.json)) {
        await sleep(jitter(isProLike(modelToUse) ? 350 : 650));
        out = await runWithSystemFallback({
          modelToUse,
          promptToUse,
          maxOutputTokensOverride: maxOutputTokensOverload,
        });
      }

      return out;
    };

    /**
     * Continuation policy (patched):
     * Run ONLY when:
     * - NEXT ACTIONS is missing OR has < 6 action blocks, AND
     * - output appears truncated (finishReason includes LENGTH/MAX_TOKENS) OR NEXT ACTIONS header is missing.
     *
     * This avoids “unnecessary continuation” that can create repeats/echo.
     */
    const shouldRunContinuation = (text: string, finishReason?: string) => {
      const actionBlocks = countActionBlocks(text);
      const hasNA = hasNextActionsHeader(text);
      const nextActionsWeak = !hasNA || actionBlocks < 6;

      if (!nextActionsWeak) return false;

      const fr = String(finishReason || "").toUpperCase();
      const truncated = fr.includes("MAX_TOKENS") || fr.includes("LENGTH");

      // If NEXT ACTIONS header is missing, continuation is allowed even without explicit truncation.
      if (!hasNA) return true;

      // If NEXT ACTIONS exists but is short, only continue when truncated.
      return truncated;
    };

    try {
      let lastErr:
        | { res: Response; json: any; usedVersion: "v1" | "v1beta"; model: string; note?: string }
        | null = null;

      for (const modelToUse of modelsToTry) {
        const out = await runWithOverloadPolicy(modelToUse, basePrompt);

        if (out.res.ok) {
          let text = cleanModelText(pickText(out.json));
          const finishReason = pickFinishReason(out.json);

          if (isCompare && shouldRunContinuation(text, finishReason)) {
            const continuationPrompt = applyCompareGuard(
              [
                "Continue by outputting ONLY the NEXT ACTIONS section.",
                "Do NOT repeat any other section.",
                "Do NOT include preamble, greetings, or meta commentary.",
                "",
                "STRICT format (exact):",
                "NEXT ACTIONS",
                "- Action: <non-empty, concrete>",
                "  Owner: <non-empty>",
                "  Timebox: <non-empty>",
                "",
                "Rules:",
                "- Produce 6 to 10 action blocks.",
                "- Actions must be concrete and scoped.",
                "- Owners must be real roles/teams (not blank).",
                "- Timeboxes must be specific (24–48h, 1 week, etc).",
                "",
                "Context summary (do NOT copy; stay consistent):",
                text.slice(0, 5000),
              ].join("\n")
            );

            const outNA = await runWithOverloadPolicy(modelToUse, continuationPrompt);

            if (outNA.res.ok) {
              const naTextRaw = cleanModelText(pickText(outNA.json));
              const nextActionsBody = naTextRaw.replace(/^NEXT ACTIONS\s*/i, "").trim();

              if (nextActionsBody && countActionBlocks(`NEXT ACTIONS\n${nextActionsBody}`) >= 6) {
                text = replaceOrAppendNextActions(text, `NEXT ACTIONS\n${nextActionsBody}`);
              }
            }
          }

          return {
            ok: true,
            provider: "google",
            model: modelToUse,
            text,
            latencyMs: Date.now() - start,
            usage: pickUsage(out.json),
            finishReason,
            raw: {
              requestedModel,
              modelTried: modelToUse,
              tried: modelsToTry,
              usedVersion: out.usedVersion,
              maxOutputTokens: maxOutputTokensNormal,
              temperature,
              response: out.json,
            },
          };
        }

        if (isHardQuotaOrRateLimit(out.res, out.json)) {
          const msg = extractGoogleErrorMessage(out.res, out.json);
          const retrySec = extractRetryAfterSeconds(msg);
          const extra = retrySec ? ` (Retry after ~${retrySec}s)` : "";

          return {
            ok: false,
            provider: "google",
            model: modelToUse,
            text: "",
            latencyMs: Date.now() - start,
            error: { message: `${msg}${extra}` },
            raw: {
              requestedModel,
              modelTried: modelToUse,
              tried: modelsToTry,
              usedVersion: out.usedVersion,
              maxOutputTokens: maxOutputTokensNormal,
              temperature,
              response: out.json,
            },
          };
        }

        lastErr = {
          res: out.res,
          json: out.json,
          usedVersion: out.usedVersion,
          model: modelToUse,
          note: isTransientOverload(out.res, out.json) ? "transient_overload" : undefined,
        };
      }

      const finalModel = lastErr?.model || modelsToTry[0] || actual;
      const finalMsg = lastErr ? extractGoogleErrorMessage(lastErr.res, lastErr.json) : "Google request failed";

      return {
        ok: false,
        provider: "google",
        model: finalModel,
        text: "",
        latencyMs: Date.now() - start,
        error: { message: finalMsg },
        raw: {
          requestedModel,
          tried: modelsToTry,
          lastUsedVersion: lastErr?.usedVersion,
          lastResponse: lastErr?.json,
          lastNote: lastErr?.note,
          maxOutputTokens: maxOutputTokensNormal,
          temperature,
        },
      };
    } catch (e: any) {
      return {
        ok: false,
        provider: "google",
        model: modelsToTry[0] || actual,
        text: "",
        latencyMs: Date.now() - start,
        error: { message: e?.message ?? "Google request failed" },
      };
    }
  },
};

/* ═══════════════════════════════════════════════════════════════════════════════
   GEMINI GROUNDING WITH GOOGLE SEARCH
   Real-time web search integration for decision research
   ═══════════════════════════════════════════════════════════════════════════════ */

export type GroundingResult = {
  success: boolean;
  query: string;
  response: string;
  sources: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
  searchQueries: string[];
  groundingMetadata?: any;
  modelUsed: string;
  latencyMs: number;
  error?: string;
};

export type GroundingRequest = {
  query: string;
  context?: string;
  dynamicThreshold?: number; // 0.0 to 1.0, default 0.3
  maxSources?: number;
};

/**
 * Performs a grounded search using Gemini with Google Search
 * This enables real-time web research for decision-making
 */
export async function geminiGroundedSearch(req: GroundingRequest): Promise<GroundingResult> {
  const start = Date.now();
  const apiKey = getGoogleApiKey();
  
  if (!apiKey) {
    return {
      success: false,
      query: req.query,
      response: "",
      sources: [],
      searchQueries: [],
      modelUsed: "",
      latencyMs: Date.now() - start,
      error: "Missing GOOGLE_API_KEY",
    };
  }

  // Use a model that supports grounding
  const model = "gemini-2.5-flash-preview-05-20";
  const dynamicThreshold = req.dynamicThreshold ?? 0.3;

  const systemPrompt = `You are a research assistant helping with decision-making analysis.
Provide factual, well-sourced information to help inform decisions.
Be specific and cite data points when available.
Focus on recent information (2024-2025) when relevant.`;

  const userPrompt = req.context 
    ? `Context: ${req.context}\n\nResearch query: ${req.query}`
    : req.query;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
          // Enable Google Search grounding
          tools: [
            {
              googleSearch: {},
            },
          ],
          // Dynamic retrieval configuration
          toolConfig: {
            googleSearch: {
              dynamicRetrievalConfig: {
                mode: "MODE_DYNAMIC",
                dynamicThreshold: dynamicThreshold,
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        query: req.query,
        response: "",
        sources: [],
        searchQueries: [],
        modelUsed: model,
        latencyMs: Date.now() - start,
        error: err?.error?.message || `API error: ${response.status}`,
      };
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const groundingMetadata = result?.candidates?.[0]?.groundingMetadata;

    // Extract sources from grounding metadata
    const sources: GroundingResult["sources"] = [];
    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web?.uri && chunk.web?.title) {
          let snippet = "";
          // Try to find snippet from grounding supports
          if (groundingMetadata.groundingSupports) {
            const support = groundingMetadata.groundingSupports.find(
              (s: any) => s.groundingChunkIndices?.includes(
                groundingMetadata.groundingChunks.indexOf(chunk)
              )
            );
            snippet = support?.segment?.text || "";
          }
          sources.push({
            title: chunk.web.title,
            url: chunk.web.uri,
            snippet: snippet.slice(0, 200),
          });
        }
      }
    }

    // Extract search queries used
    const searchQueries = groundingMetadata?.webSearchQueries || [];

    return {
      success: true,
      query: req.query,
      response: text,
      sources: sources.slice(0, req.maxSources || 5),
      searchQueries,
      groundingMetadata,
      modelUsed: model,
      latencyMs: Date.now() - start,
    };
  } catch (e: any) {
    return {
      success: false,
      query: req.query,
      response: "",
      sources: [],
      searchQueries: [],
      modelUsed: model,
      latencyMs: Date.now() - start,
      error: e?.message ?? "Grounded search failed",
    };
  }
}

/**
 * Perform multi-query grounded research for comprehensive decision analysis
 */
export async function geminiResearchBatch(queries: string[], context?: string): Promise<{
  results: GroundingResult[];
  summary: string;
  allSources: GroundingResult["sources"];
  totalLatencyMs: number;
}> {
  const start = Date.now();
  const results: GroundingResult[] = [];
  const allSources: GroundingResult["sources"] = [];
  const seenUrls = new Set<string>();

  // Run queries in parallel (max 3 at a time to avoid rate limits)
  const batchSize = 3;
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(query => geminiGroundedSearch({ query, context }))
    );
    results.push(...batchResults);

    // Deduplicate sources
    for (const result of batchResults) {
      for (const source of result.sources) {
        if (!seenUrls.has(source.url)) {
          seenUrls.add(source.url);
          allSources.push(source);
        }
      }
    }
  }

  // Generate summary of all findings
  const successfulResults = results.filter(r => r.success);
  const summary = successfulResults.length > 0
    ? `Research completed: ${successfulResults.length}/${queries.length} queries successful. Found ${allSources.length} unique sources.`
    : "Research failed for all queries.";

  return {
    results,
    summary,
    allSources: allSources.slice(0, 10),
    totalLatencyMs: Date.now() - start,
  };
}

/**
 * Generate research queries based on decision input
 */
export function generateDecisionResearchQueries(input: {
  title?: string;
  context?: string;
  options?: string[];
  risks?: string[];
  theme?: string;
}): string[] {
  const queries: string[] = [];
  const { title, context, options, risks, theme } = input;

  // Main decision query
  if (title) {
    queries.push(`${title} best practices 2025`);
    queries.push(`${title} case studies and lessons learned`);
  }

  // Theme-specific queries
  const themeQueries: Record<string, string[]> = {
    technology: [
      "latest technology adoption trends 2025",
      "AI implementation challenges and solutions",
    ],
    healthcare: [
      "healthcare regulatory changes 2025",
      "clinical decision support best practices",
    ],
    finance: [
      "financial risk management frameworks 2025",
      "investment decision analysis methods",
    ],
    legal: [
      "legal compliance requirements updates 2025",
      "regulatory impact assessment frameworks",
    ],
    education: [
      "educational technology integration 2025",
      "academic policy decision frameworks",
    ],
    government: [
      "public policy decision frameworks 2025",
      "government AI adoption guidelines",
    ],
    environment: [
      "sustainability compliance requirements 2025",
      "environmental impact assessment methods",
    ],
  };

  if (theme && themeQueries[theme]) {
    queries.push(...themeQueries[theme]);
  }

  // Risk-specific queries
  if (risks && risks.length > 0) {
    const topRisk = risks[0];
    if (topRisk.length > 10) {
      queries.push(`how to mitigate ${topRisk.slice(0, 50)}`);
    }
  }

  // Option comparison queries
  if (options && options.length >= 2) {
    queries.push(`comparing ${options[0]} vs ${options[1]} decision factors`);
  }

  return [...new Set(queries)].slice(0, 5);
}
