// app/api/deep-reasoner/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// DEEP REASONER: STRESS TEST API ENDPOINT
// Devil's Advocate analysis with Chain of Thought reasoning
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { googleClient } from "@/lib/providers/google";
import { 
  buildDevilAdvocateSystemPrompt, 
  buildStressTestPrompt,
  type AggressionLevel,
  type StressTestConfig,
} from "@/lib/prompts/devilAdvocate";
import {
  preAnalyzeInput,
  parseStressTestResponse,
  safeJsonParse,
  type StressTestResult,
  type PreAnalysisResult,
} from "@/lib/analysis/stressTest";
import type { DecisionInput } from "@/lib/analysis/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────────────────────
   HELPER FUNCTIONS
──────────────────────────────────────────────────────────────────────────── */

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function asNumber(x: unknown): number | undefined {
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
}

function errToMessage(e: unknown): string {
  if (e instanceof Error) return e.message || "Unknown error";
  try {
    return typeof e === "string" ? e : JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

function toStringArray(x: unknown): string[] {
  if (Array.isArray(x)) return x.map((v) => String(v ?? "").trim()).filter(Boolean);
  if (typeof x === "string") return x.split("\n").map((s) => s.trim()).filter(Boolean);
  return [];
}

function generateRequestId(): string {
  try {
    return randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   MODEL CONFIGURATION
──────────────────────────────────────────────────────────────────────────── */

// Preferred model for deep reasoning (Gemini 3 with thinking capability)
const DEFAULT_MODEL = "gemini-2.5-flash-preview-05-20";
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
];

// Token budget for stress test (needs more than critic)
// Primary budget: 7000 tokens for full output (challenges, blind spots, dependencies)
// If quota is limited, caller can pass lower maxTokens (min 2000) to save tokens
const DEFAULT_MAX_TOKENS = 7000;
const MIN_TOKENS = 2000;
const MAX_TOKENS = 12000;

// Fallback token budget when primary budget fails (e.g. quota exhausted)
const FALLBACK_MAX_TOKENS = 4000;

// Temperature for analytical tasks (lower = more focused)
const DEFAULT_TEMPERATURE = 0.15;

/* ────────────────────────────────────────────────────────────────────────────
   REQUEST VALIDATION
──────────────────────────────────────────────────────────────────────────── */

type ValidatedRequest = {
  decision: DecisionInput;
  config: StressTestConfig;
  model: string;
  temperature: number;
  maxTokens: number;
  imageData?: { type: "base64" | "url"; content: string; mime_type?: string };
};

function validateRequest(body: unknown): { valid: true; data: ValidatedRequest } | { valid: false; error: string } {
  if (!isRecord(body)) {
    return { valid: false, error: "Invalid JSON body" };
  }

  const b = body as Record<string, unknown>;

  // ── Support BOTH flat and nested body formats ──
  // Flat:   { title, context, intent, options, ... }
  // Nested: { decision: { title, context, ... }, config: { ... } }
  const decisionRaw = isRecord(b.decision) ? b.decision : b;

  const decision: DecisionInput = {
    title: typeof decisionRaw.title === "string" ? decisionRaw.title : "",
    context: typeof decisionRaw.context === "string" ? decisionRaw.context : "",
    intent: typeof decisionRaw.intent === "string" ? decisionRaw.intent : "",
    options: toStringArray(decisionRaw.options),
    assumptions: toStringArray(decisionRaw.assumptions),
    risks: toStringArray(decisionRaw.risks),
    evidence: toStringArray(decisionRaw.evidence),
    confidence: (decisionRaw.confidence === "low" || decisionRaw.confidence === "medium" || decisionRaw.confidence === "high") 
      ? decisionRaw.confidence 
      : "medium",
    createdAtISO: typeof decisionRaw.createdAtISO === "string" 
      ? decisionRaw.createdAtISO 
      : new Date().toISOString(),
    outcome: typeof decisionRaw.outcome === "string" ? decisionRaw.outcome : undefined,
  };

  // Minimum viable input check
  const hasMinimumInput = Boolean(
    decision.title.trim() || 
    decision.context.trim() || 
    decision.intent.trim()
  );

  if (!hasMinimumInput) {
    return { 
      valid: false, 
      error: "Insufficient input: provide at least title, context, or intent" 
    };
  }

  // Extract config (from nested config object OR flat body fields)
  const configRaw = isRecord(b.config) ? (b.config as Record<string, unknown>) : b;

  // Valid blind spot categories for filtering
  const validCategories = ["security", "financial", "operational", "legal", "technical", "stakeholder", "timeline", "resource", "external"];

  const rawFocusAreas = Array.isArray(configRaw.focus_areas) ? configRaw.focus_areas : undefined;
  const filteredFocusAreas = rawFocusAreas
    ?.filter((a: unknown): boolean => typeof a === "string" && validCategories.includes(a))
    .map((a: unknown) => a as string) as StressTestConfig["focus_areas"] | undefined;

  // Aggression level from config or flat body
  const aggressionRaw = configRaw.aggression_level ?? b.aggression;
  const aggressionLevel: AggressionLevel = 
    (aggressionRaw === "gentle" || aggressionRaw === "moderate" || aggressionRaw === "ruthless")
      ? aggressionRaw
      : "moderate";

  const config: StressTestConfig = {
    focus_areas: filteredFocusAreas && filteredFocusAreas.length > 0 ? filteredFocusAreas : undefined,
    aggression_level: aggressionLevel,
    include_thinking_path: typeof configRaw.include_thinking_path === "boolean" 
      ? configRaw.include_thinking_path 
      : true,
    max_blind_spots: typeof configRaw.max_blind_spots === "number" 
      ? clamp(configRaw.max_blind_spots, 1, 10) 
      : 5,
    max_challenges: typeof configRaw.max_challenges === "number" 
      ? clamp(configRaw.max_challenges, 1, 10) 
      : 5,
  };

  // Model and generation settings
  const model = typeof b.model === "string" && b.model.trim() 
    ? b.model.trim() 
    : DEFAULT_MODEL;
  
  const temperatureRaw = asNumber(b.temperature);
  const temperature = temperatureRaw != null 
    ? clamp(temperatureRaw, 0, 1) 
    : DEFAULT_TEMPERATURE;
  
  const maxTokensRaw = asNumber(b.maxTokens);
  const maxTokens = maxTokensRaw != null 
    ? clamp(maxTokensRaw, MIN_TOKENS, MAX_TOKENS) 
    : DEFAULT_MAX_TOKENS;

  // Image data (optional)
  const imageDataRaw = b.image_data;
  let imageData: ValidatedRequest["imageData"];
  
  if (isRecord(imageDataRaw)) {
    const type = imageDataRaw.type;
    const content = imageDataRaw.content;
    if ((type === "base64" || type === "url") && typeof content === "string" && content.trim()) {
      imageData = {
        type,
        content: content.trim(),
        mime_type: typeof imageDataRaw.mime_type === "string" ? imageDataRaw.mime_type : undefined,
      };
    }
  }

  return {
    valid: true,
    data: { decision, config, model, temperature, maxTokens, imageData },
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   GEMINI API CALL
──────────────────────────────────────────────────────────────────────────── */

async function callGeminiForStressTest(opts: {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
}): Promise<{
  ok: boolean;
  text: string;
  model: string;
  latencyMs: number;
  error?: { message: string };
}> {
  const start = Date.now();
  
  try {
    const result = await googleClient.run({
      model: opts.model,
      system: opts.system,
      prompt: opts.prompt,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
    });

    return {
      ok: result.ok,
      text: (result as any).text || "",
      model: (result as any).model || opts.model,
      latencyMs: (result as any).latencyMs || (Date.now() - start),
      error: result.ok ? undefined : { message: (result as any).error?.message || "Unknown error" },
    };
  } catch (e) {
    return {
      ok: false,
      text: "",
      model: opts.model,
      latencyMs: Date.now() - start,
      error: { message: errToMessage(e) },
    };
  }
}

function looksLikeModelRejection(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("not found") ||
    m.includes("not supported") ||
    m.includes("invalid argument") ||
    m.includes("unknown name") ||
    m.includes("404") ||
    m.includes("permission") ||
    m.includes("quota")
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   MAIN API HANDLER
──────────────────────────────────────────────────────────────────────────── */

export async function POST(req: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // ─── Parse Request Body ──────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false,
          error: validation.error, 
          message: "Validation failed",
          requestId 
        },
        { status: 400 }
      );
    }

    const { decision, config, model, temperature, maxTokens, imageData } = validation.data;

    // ─── Pre-Analysis (Deterministic) ────────────────────────────────────────
    const preAnalysis: PreAnalysisResult = preAnalyzeInput(decision);
    
    // Log pre-analysis for debugging
    console.log(`[Deep Reasoner] Request ${requestId}:`, {
      inputQuality: preAnalysis.input_quality_score,
      redFlags: preAnalysis.red_flags.length,
      aggressionLevel: config.aggression_level,
    });

    // ─── Build Prompts ───────────────────────────────────────────────────────
    const systemPrompt = buildDevilAdvocateSystemPrompt(config.aggression_level as AggressionLevel);
    const userPrompt = buildStressTestPrompt(decision, config);

    // ─── Call Gemini with Fallback ───────────────────────────────────────────
    const modelsToTry = [model, ...FALLBACK_MODELS.filter(m => m !== model)];
    const triedModels: string[] = [];
    
    let lastResult: Awaited<ReturnType<typeof callGeminiForStressTest>> | null = null;
    let usedModel = model;

    // Try with primary token budget first, then fallback budget if needed
    const tokenBudgets = [maxTokens, FALLBACK_MAX_TOKENS].filter(
      (v, i, a) => a.indexOf(v) === i // deduplicate
    );

    for (const currentBudget of tokenBudgets) {
      for (const currentModel of modelsToTry) {
        // Avoid retrying the same model+budget combination
        const attemptKey = `${currentModel}@${currentBudget}`;
        if (triedModels.includes(attemptKey)) continue;
        triedModels.push(attemptKey);

        console.log(`[Deep Reasoner] Trying ${currentModel} with ${currentBudget} max tokens...`);

        const result = await callGeminiForStressTest({
          model: currentModel,
          system: systemPrompt,
          prompt: userPrompt,
          temperature,
          maxTokens: currentBudget,
        });

        lastResult = result;
        usedModel = currentModel;

        if (result.ok && result.text) {
          // Success! Parse and return
          console.log(`[Deep Reasoner] Success with model: ${currentModel} (${currentBudget} tokens)`);
          console.log(`[Deep Reasoner] Response length: ${result.text.length} chars`);
          
          // Detect truncated JSON (output cut off before closing brace)
          const trimmed = result.text.trim();
          const lastChar = trimmed[trimmed.length - 1];
          if (lastChar !== "}" && lastChar !== "`") {
            console.warn(`[Deep Reasoner] Response may be truncated (ends with "${trimmed.slice(-20)}")`);
            console.warn(`[Deep Reasoner] Token budget ${currentBudget} may be insufficient — consider increasing maxTokens`);
          }

          const parsed = safeJsonParse(result.text);
          
          if (parsed) {
            const stressTestResult = parseStressTestResponse(
              parsed,
              requestId,
              usedModel,
              result.latencyMs
            );

            // Check if critical sections are populated
            const hasSubstantiveContent = 
              stressTestResult.devils_advocate_challenges.length > 0 ||
              stressTestResult.blind_spots.length > 0 ||
              stressTestResult.hidden_dependencies.length > 0;

            if (!hasSubstantiveContent && currentBudget > FALLBACK_MAX_TOKENS) {
              console.warn(`[Deep Reasoner] Result has empty challenges/blindspots/deps — likely token truncation. Will retry with same budget on next model or lower budget.`);
              // Continue to try next model or lower budget
              continue;
            }

            // Attach pre-analysis insights
            const fullResult = {
              ...stressTestResult,
              pre_analysis: preAnalysis,
              config_aggression: config.aggression_level,
              raw_text: process.env.NODE_ENV === "development" ? result.text : undefined,
            };

            return NextResponse.json({
              success: true,
              result: fullResult,
              meta: {
                requestId,
                modelUsed: usedModel,
                processingTimeMs: result.latencyMs,
                tokenBudget: currentBudget,
                inputQuality: preAnalysis.input_quality_score,
              },
            }, { status: 200 });
          } else {
            // Parsing failed but we got text - return with raw
            console.warn(`[Deep Reasoner] JSON parse failed for model ${currentModel}`);
            console.warn(`[Deep Reasoner] Response tail: ...${result.text.slice(-200)}`);
            
            const fallbackResult = parseStressTestResponse(
              {},
              requestId,
              usedModel,
              result.latencyMs
            );

            return NextResponse.json(
              {
                success: true,
                result: {
                  ...fallbackResult,
                  pre_analysis: preAnalysis,
                  raw_text: result.text,
                },
                parse_warning: "AI response was not valid JSON; using fallback scores. This may be caused by insufficient token budget.",
              },
              { status: 200 }
            );
          }
        }

        // Check if we should try fallback model
        const errorMsg = result.error?.message || "";
        const isQuotaError = errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate");
        const canFallback = looksLikeModelRejection(errorMsg);
        
        if (isQuotaError) {
          console.log(`[Deep Reasoner] Quota/rate limit hit for ${currentModel}, will try lower token budget or fallback model...`);
          continue; // Try next model in this budget tier, or next budget tier
        }

        if (!canFallback) {
          console.log(`[Deep Reasoner] Non-recoverable error for ${currentModel}: ${errorMsg}`);
          break; // Don't retry other models for non-recoverable errors
        }

        console.log(`[Deep Reasoner] Model ${currentModel} failed, trying fallback...`);
      }
    }

    // ─── All Models Failed — return degraded result so UI still renders ─────
    const errorMessage = lastResult?.error?.message || "All models failed";
    
    const fallbackResult = parseStressTestResponse(
      {},
      requestId,
      usedModel,
      Date.now() - startTime
    );

    return NextResponse.json(
      {
        success: true,
        result: {
          ...fallbackResult,
          pre_analysis: preAnalysis,
          _degraded: true,
          _error: errorMessage,
        },
        parse_warning: `Models failed (${triedModels.join(', ')}): ${errorMessage}. Using fallback scores.`,
        meta: {
          requestId,
          modelUsed: usedModel,
          triedModels,
          processingTimeMs: Date.now() - startTime,
          inputQuality: preAnalysis.input_quality_score,
        },
      },
      { status: 200 }
    );

  } catch (e) {
    const message = errToMessage(e);
    
    console.error(`[Deep Reasoner] Fatal error:`, {
      requestId,
      message,
      error: e,
    });

    // Return degraded result instead of 500 so UI can still render
    try {
      const fallbackResult = parseStressTestResponse(
        {},
        requestId,
        DEFAULT_MODEL,
        Date.now() - startTime
      );

      return NextResponse.json(
        {
          success: true,
          result: {
            ...fallbackResult,
            _degraded: true,
            _error: message,
          },
          parse_warning: `Deep Reasoner error: ${message}. Using fallback scores.`,
          meta: { requestId, modelUsed: DEFAULT_MODEL, processingTimeMs: Date.now() - startTime },
        },
        { status: 200 }
      );
    } catch {
      return NextResponse.json(
        { success: false, error: message, message: "Deep Reasoner failed", requestId },
        { status: 500 }
      );
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   GET HANDLER (for health check / info)
──────────────────────────────────────────────────────────────────────────── */

export async function GET() {
  return NextResponse.json({
    name: "Deep Reasoner: Stress Test Mode",
    version: "1.0.0",
    description: "Devil's Advocate analysis with Chain of Thought reasoning",
    endpoints: {
      POST: {
        description: "Run stress test on decision brief",
        body: {
          decision: {
            title: "string",
            context: "string",
            intent: "string",
            options: "string[]",
            assumptions: "string[]",
            risks: "string[]",
            evidence: "string[]",
            confidence: "low | medium | high",
            outcome: "string (optional)",
          },
          config: {
            aggression_level: "gentle | moderate | ruthless",
            focus_areas: "BlindSpotCategory[]",
            include_thinking_path: "boolean",
            max_blind_spots: "number (1-10)",
            max_challenges: "number (1-10)",
          },
          model: "string (optional)",
          temperature: "number (0-1, optional)",
          maxTokens: "number (1500-8000, optional)",
        },
      },
    },
    models: {
      default: DEFAULT_MODEL,
      fallbacks: FALLBACK_MODELS,
    },
    features: [
      "Devil's Advocate challenges",
      "Blind spot detection (9 categories)",
      "Risk correlation matrix",
      "Hidden dependency mapping",
      "Chain of Thought transparency",
      "Mitigation strategies",
      "Pre-analysis quality scoring",
    ],
  });
}
