// app/api/gemini/critic/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { googleClient } from "@/lib/providers/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function asNumber(x: unknown): number | undefined {
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
}

function errToMessage(e: unknown) {
  if (e instanceof Error) return e.message || "Unknown error";
  try {
    return typeof e === "string" ? e : JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

function toStringArray(x: unknown): string[] {
  if (Array.isArray(x)) return x.map((v) => String(v ?? "").trim()).filter(Boolean);
  if (typeof x === "string")
    return x
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

type CriticRequest = {
  title?: string;
  context?: string;
  intent?: string;
  options?: string[] | string;
  assumptions?: string[] | string;
  risks?: string[] | string;
  evidence?: string[] | string;
  outcome?: string;

  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type CriticResponse = {
  hardEdgesMissing: Array<{
    missing: string;
    suggestedMetrics: string[];
    whereToAdd: "context" | "intent" | "evidence" | "risks" | "options" | "assumptions" | "outcome";
  }>;

  genericLanguage: Array<{
    phrase: string;
    whyGeneric: string;
    rewriteConcrete: string;
  }>;

  blindSpots: Array<{
    blindSpot: string;
    whyItMatters: string;
    clarificationQuestions: string[];
  }>;

  nextActions: Array<{
    action: string;
    why: string;
    ownerHint?: string;
    timebox?: string;
  }>;

  clarificationQuestions: string[];

  meta: {
    requestId: string;
    modelUsed: string;
    latencyMs: number;
    triedModels?: string[];
    fallbackUsed?: boolean;
  };

  rawText?: string;
};

// ✅ default = model yang terbukti jalan di key kamu
const DEFAULT_MODEL = "gemini-3-flash-preview";

function buildCriticSystem() {
  return [
    "You are Gemini Critic — an advanced decision analysis agent.",
    "",
    "Your job: Detect missing hard edges, generic language, blind spots, and propose specific next actions.",
    "",
    "CRITICAL RULES:",
    "1. Be concrete. No fluff. No marketing tone.",
    "2. Use short bullets. Prefer measurable suggestions (numbers, dates, thresholds).",
    "3. If info is missing, ask a sharp clarification question instead of guessing.",
    "4. ALWAYS output valid JSON. No markdown. No explanation text before or after.",
    "5. ALWAYS include at least 1-2 items in each category if any issues are found.",
    "6. For perfect inputs with no issues, still provide at least 1 nextAction and 1 clarificationQuestion.",
  ].join("\n");
}

function buildCriticPrompt(snapshot: {
  title: string;
  context: string;
  intent: string;
  options: string[];
  assumptions: string[];
  risks: string[];
  evidence: string[];
  outcome: string;
}) {
  return [
    "Analyze this decision snapshot and return ONLY valid JSON.",
    "",
    "REQUIRED OUTPUT FORMAT (return ONLY this JSON, no other text):",
    "```json",
    "{",
    '  "hardEdgesMissing": [',
    '    {"missing": "specific thing missing", "suggestedMetrics": ["metric1", "metric2"], "whereToAdd": "context"}',
    '  ],',
    '  "genericLanguage": [',
    '    {"phrase": "vague phrase found", "whyGeneric": "reason it is vague", "rewriteConcrete": "concrete alternative"}',
    '  ],',
    '  "blindSpots": [',
    '    {"blindSpot": "overlooked issue", "whyItMatters": "impact", "clarificationQuestions": ["question1"]}',
    '  ],',
    '  "nextActions": [',
    '    {"action": "specific action", "why": "reason", "ownerHint": "who", "timebox": "when"}',
    '  ],',
    '  "clarificationQuestions": ["question1", "question2"]',
    "}",
    "```",
    "",
    "whereToAdd must be one of: context, intent, evidence, risks, options, assumptions, outcome",
    "",
    "═══════════════════════════════════════",
    "DECISION SNAPSHOT TO ANALYZE",
    "═══════════════════════════════════════",
    "",
    `📌 TITLE: ${snapshot.title || "(not provided)"}`,
    "",
    `📋 CONTEXT: ${snapshot.context || "(not provided)"}`,
    "",
    `🎯 INTENT: ${snapshot.intent || "(not provided)"}`,
    "",
    `🔀 OPTIONS:`,
    snapshot.options.length > 0 ? snapshot.options.map((o) => `  • ${o}`).join("\n") : "  • (none listed)",
    "",
    `🧱 ASSUMPTIONS:`,
    snapshot.assumptions.length > 0 ? snapshot.assumptions.map((a) => `  • ${a}`).join("\n") : "  • (none listed)",
    "",
    `⚠️ RISKS:`,
    snapshot.risks.length > 0 ? snapshot.risks.map((r) => `  • ${r}`).join("\n") : "  • (none listed)",
    "",
    `📊 EVIDENCE:`,
    snapshot.evidence.length > 0 ? snapshot.evidence.map((e) => `  • ${e}`).join("\n") : "  • (none listed)",
    "",
    `✅ OUTCOME: ${snapshot.outcome || "(not yet determined)"}`,
    "",
    "═══════════════════════════════════════",
    "ANALYSIS INSTRUCTIONS",
    "═══════════════════════════════════════",
    "",
    "1. hardEdgesMissing: Find sections lacking numbers, dates, thresholds, or budgets",
    "2. genericLanguage: Find vague terms like 'improve', 'optimize', 'best', 'leverage'", 
    "3. blindSpots: Find missing stakeholders, unstated constraints, unconsidered failures",
    "4. nextActions: Suggest 3-5 specific actions with owners and timeboxes",
    "5. clarificationQuestions: Ask 3-5 sharp questions to unblock the decision",
    "",
    "IMPORTANT: Return ONLY the JSON object. No other text before or after.",
  ].join("\n");
}

function safeJsonParse(text: string): unknown | null {
  const t = String(text ?? "").trim();
  if (!t) return null;

  // Try direct parse
  try {
    return JSON.parse(t);
  } catch {}

  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // Try to find JSON object in text
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const slice = t.slice(first, last + 1);
    try {
      return JSON.parse(slice);
    } catch {}
    
    // Try to fix common JSON issues (trailing commas, etc)
    try {
      const fixed = slice
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/'/g, '"');
      return JSON.parse(fixed);
    } catch {}
  }

  return null;
}

function isWhereToAdd(x: unknown): x is CriticResponse["hardEdgesMissing"][number]["whereToAdd"] {
  return (
    x === "context" ||
    x === "intent" ||
    x === "evidence" ||
    x === "risks" ||
    x === "options" ||
    x === "assumptions" ||
    x === "outcome"
  );
}

function coerceCriticResponse(
  obj: unknown,
  requestId: string,
  modelUsed: string,
  latencyMs: number,
  rawText?: string,
  metaExtra?: { triedModels?: string[]; fallbackUsed?: boolean }
) {
  const fallback: CriticResponse = {
    hardEdgesMissing: [],
    genericLanguage: [],
    blindSpots: [],
    nextActions: [],
    clarificationQuestions: [],
    meta: { requestId, modelUsed, latencyMs, ...(metaExtra ?? {}) },
    rawText,
  };

  if (!isRecord(obj)) return fallback;

  const hardEdgesMissingRaw = Array.isArray(obj.hardEdgesMissing) ? obj.hardEdgesMissing : [];
  const genericLanguageRaw = Array.isArray(obj.genericLanguage) ? obj.genericLanguage : [];
  const blindSpotsRaw = Array.isArray(obj.blindSpots) ? obj.blindSpots : [];
  const nextActionsRaw = Array.isArray(obj.nextActions) ? obj.nextActions : [];
  const clarificationQuestionsRaw = Array.isArray(obj.clarificationQuestions) ? obj.clarificationQuestions : [];

  const hardEdgesMissing = hardEdgesMissingRaw
    .map((x: any) => {
      const missing = typeof x?.missing === "string" ? x.missing : "";
      const suggestedMetrics = Array.isArray(x?.suggestedMetrics)
        ? x.suggestedMetrics.map((m: any) => String(m ?? "").trim()).filter(Boolean)
        : [];
      const whereToAdd = x?.whereToAdd;
      return {
        missing: missing.trim(),
        suggestedMetrics,
        whereToAdd: isWhereToAdd(whereToAdd) ? whereToAdd : "intent",
      };
    })
    .filter((x) => x.missing);

  const genericLanguage = genericLanguageRaw
    .map((x: any) => {
      const phrase = typeof x?.phrase === "string" ? x.phrase : "";
      const whyGeneric = typeof x?.whyGeneric === "string" ? x.whyGeneric : "";
      const rewriteConcrete = typeof x?.rewriteConcrete === "string" ? x.rewriteConcrete : "";
      return { phrase: phrase.trim(), whyGeneric: whyGeneric.trim(), rewriteConcrete: rewriteConcrete.trim() };
    })
    .filter((x) => x.phrase); // ✅ Only require phrase to exist

  const blindSpots = blindSpotsRaw
    .map((x: any) => {
      const blindSpot = typeof x?.blindSpot === "string" ? x.blindSpot : "";
      const whyItMatters = typeof x?.whyItMatters === "string" ? x.whyItMatters : "";
      const clarificationQuestions = Array.isArray(x?.clarificationQuestions)
        ? x.clarificationQuestions.map((q: any) => String(q ?? "").trim()).filter(Boolean)
        : [];
      return { blindSpot: blindSpot.trim(), whyItMatters: whyItMatters.trim(), clarificationQuestions };
    })
    .filter((x) => x.blindSpot);

  const nextActions = nextActionsRaw
    .map((x: any) => {
      const action = typeof x?.action === "string" ? x.action : "";
      const why = typeof x?.why === "string" ? x.why : "";
      const ownerHint = typeof x?.ownerHint === "string" ? x.ownerHint.trim() : undefined;
      const timebox = typeof x?.timebox === "string" ? x.timebox.trim() : undefined;
      return { action: action.trim(), why: why.trim(), ownerHint, timebox };
    })
    .filter((x) => x.action);

  const clarificationQuestions = clarificationQuestionsRaw.map((q: any) => String(q ?? "").trim()).filter(Boolean);

  return {
    hardEdgesMissing,
    genericLanguage,
    blindSpots,
    nextActions,
    clarificationQuestions,
    meta: { requestId, modelUsed, latencyMs, ...(metaExtra ?? {}) },
    rawText,
  } satisfies CriticResponse;
}

async function tryGeminiOnce(opts: {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
}) {
  return googleClient.run({
    model: opts.model,
    system: opts.system,
    prompt: opts.prompt,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
  });
}

function looksLikeModelRejection(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("not found") ||
    m.includes("not supported") ||
    m.includes("invalid argument") ||
    m.includes("unknown name") ||
    m.includes("model") && m.includes("not") && m.includes("supported") ||
    m.includes("404") ||
    m.includes("permission") ||
    m.includes("not permitted") ||
    m.includes("quota") ||
    m.includes("version v1") ||
    m.includes("generatetext") ||
    m.includes("generatecontent")
  );
}

function uniqModels(models: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    const k = (m || "").trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export async function POST(req: Request) {
  const requestId = (() => {
    try {
      return randomUUID();
    } catch {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  })();

  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body", requestId }, { status: 400 });
    }

    const b = body as CriticRequest;

    const snapshot = {
      title: typeof b.title === "string" ? b.title : "",
      context: typeof b.context === "string" ? b.context : "",
      intent: typeof b.intent === "string" ? b.intent : "",
      options: toStringArray(b.options),
      assumptions: toStringArray(b.assumptions),
      risks: toStringArray(b.risks),
      evidence: toStringArray(b.evidence),
      outcome: typeof b.outcome === "string" ? b.outcome : "",
    };

    if (!snapshot.title.trim() && !snapshot.intent.trim() && !snapshot.context.trim()) {
      return NextResponse.json(
        { error: "Missing decision snapshot (provide at least title/context/intent).", requestId },
        { status: 400 }
      );
    }

    const temperatureRaw = asNumber(b.temperature);
    const temperature = temperatureRaw == null ? 0.2 : clamp(temperatureRaw, 0, 2);

    const maxTokensRaw = asNumber(b.maxTokens);
    const maxTokens = maxTokensRaw == null ? 900 : Math.max(256, Math.floor(maxTokensRaw));

    const requestedModel =
      typeof b.model === "string" && b.model.trim() ? b.model.trim() : DEFAULT_MODEL;

    const system = buildCriticSystem();
    const prompt = buildCriticPrompt(snapshot);

    // ✅ Model strategy:
    // - Try requested model
    // - If rejected (model/permission/quota/version), fallback to DEFAULT_MODEL (Gemini 3 Flash)
    // - Keep original error message when returning failure
    const candidates = uniqModels([
      requestedModel,
      DEFAULT_MODEL, // your known-good
    ]);

    const triedModels: string[] = [];
    let last: any = null;
    let usedModel = requestedModel;
    let latencyMs = 0;
    let fallbackUsed = false;

    for (let i = 0; i < candidates.length; i++) {
      const model = candidates[i];
      triedModels.push(model);

      const t0 = Date.now();
      const res = await tryGeminiOnce({
        model,
        system,
        prompt,
        temperature,
        maxTokens,
      });
      const ms = typeof (res as any)?.latencyMs === "number" ? (res as any).latencyMs : Date.now() - t0;

      last = res;
      usedModel = model;
      latencyMs = ms;

      if (res?.ok) {
        const text = String((res as any)?.text ?? "");
        
        // Debug: Log raw response
        console.log("[Gemini Critic] Raw response length:", text.length);
        console.log("[Gemini Critic] Raw response preview:", text.slice(0, 500));
        
        const parsed = safeJsonParse(text);
        
        // Debug: Log parse result
        console.log("[Gemini Critic] Parsed result:", parsed ? "SUCCESS" : "FAILED");
        if (parsed) {
          console.log("[Gemini Critic] Parsed keys:", Object.keys(parsed as any));
        }
        
        const payload = coerceCriticResponse(parsed, requestId, usedModel, latencyMs, text, {
          triedModels,
          fallbackUsed: model !== requestedModel,
        });
        return NextResponse.json(payload, { status: 200 });
      }

      const msg = String(res?.error?.message ?? "");
      // if this is not a model rejection, don't bother trying fallback
      const canFallback = i < candidates.length - 1 && looksLikeModelRejection(msg);
      if (canFallback) {
        fallbackUsed = true;
        continue;
      }

      // stop early if not fallback-able
      break;
    }

    // ❌ Failed all attempts — return REAL error message (no generic)
    const primaryMsg = String(last?.error?.message ?? "").trim();
    const message = primaryMsg || "Gemini critic request failed.";

    return NextResponse.json(
      {
        error: "Gemini critic failed",
        message, // ✅ keep original provider message
        requestId,
        meta: {
          requestedModel,
          modelUsed: usedModel,
          triedModels,
          fallbackUsed,
        },
        raw: last?.raw ?? undefined,
      },
      { status: 500 }
    );
  } catch (e) {
    const message = errToMessage(e);

    console.error("[/api/gemini/critic] request failed:", {
      requestId,
      message,
      error: e,
    });

    return NextResponse.json({ error: "Gemini critic route failed", message, requestId }, { status: 500 });
  }
}
