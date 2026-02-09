// lib/analysis/crossReference.ts
// ═══════════════════════════════════════════════════════════════════════════════
// DEEP REASONER: CROSS-REFERENCE ENGINE
// Image-text anomaly detection — compares visual evidence against decision brief
// claims to surface contradictions, missing context, and assumption gaps.
//
// Used when a user uploads an image (screenshot, chart, document photo) alongside
// their decision input. The engine asks Gemini to describe the image, then runs
// a structured comparison against the textual claims.
// ═══════════════════════════════════════════════════════════════════════════════

import type { DecisionInput } from "./types";
import type {
  AnomalyType,
  SeverityLevel,
  CrossReferenceAnomaly,
  CrossReferenceResult,
} from "./stressTestTypes";

/* ────────────────────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────────────────────── */

/** Minimum confidence threshold to consider cross-reference results valid */
const MIN_CONFIDENCE_THRESHOLD = 25;

/** Maximum number of anomalies to return (prevents excessively long output) */
const MAX_ANOMALIES = 10;

/** Valid anomaly types for validation */
const VALID_ANOMALY_TYPES: AnomalyType[] = [
  "contradiction",
  "missing_context",
  "outdated",
  "scale_mismatch",
  "assumption_gap",
];

/** Valid severity levels for validation */
const VALID_SEVERITY_LEVELS: SeverityLevel[] = [
  "critical",
  "high",
  "medium",
  "low",
];

/** Human-readable labels for anomaly types */
export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  contradiction: "Contradiction",
  missing_context: "Missing Context",
  outdated: "Outdated Information",
  scale_mismatch: "Scale Mismatch",
  assumption_gap: "Assumption Gap",
};

/** Icons for anomaly types (emoji for UI) */
export const ANOMALY_TYPE_ICONS: Record<AnomalyType, string> = {
  contradiction: "⚡",
  missing_context: "🔍",
  outdated: "⏳",
  scale_mismatch: "📏",
  assumption_gap: "🕳️",
};

/** Severity weight for scoring — higher weight = more impact on confidence */
const SEVERITY_WEIGHT: Record<SeverityLevel, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

/* ────────────────────────────────────────────────────────────────────────────
   HELPER FUNCTIONS
──────────────────────────────────────────────────────────────────────────── */

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function safeString(x: unknown, fallback = ""): string {
  return typeof x === "string" ? x.trim() : fallback;
}

function safeNumber(x: unknown, fallback = 0): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function safeArray<T>(x: unknown): T[] {
  return Array.isArray(x) ? x : [];
}

function isValidAnomalyType(x: unknown): x is AnomalyType {
  return typeof x === "string" && VALID_ANOMALY_TYPES.includes(x as AnomalyType);
}

function isValidSeverity(x: unknown): x is SeverityLevel {
  return typeof x === "string" && VALID_SEVERITY_LEVELS.includes(x as SeverityLevel);
}

/* ────────────────────────────────────────────────────────────────────────────
   CROSS-REFERENCE PROMPT BUILDER
   Constructs the prompt sent to Gemini for image-vs-text comparison
──────────────────────────────────────────────────────────────────────────── */

/**
 * Build the full cross-reference analysis prompt.
 *
 * This prompt is used AFTER the image has been described (either by Groq Vision
 * or by Gemini's multimodal capability). It takes the image description plus
 * the decision brief and asks the model to find discrepancies.
 */
export function buildCrossReferencePrompt(
  input: DecisionInput,
  imageDescription: string
): string {
  const contextBlock = input.context?.trim() || "(no context provided)";
  const intentBlock = input.intent?.trim() || "(no intent provided)";
  const evidenceBlock =
    input.evidence.length > 0
      ? input.evidence.map((e, i) => `  ${i + 1}. ${e}`).join("\n")
      : "  (no evidence provided)";
  const assumptionsBlock =
    input.assumptions.length > 0
      ? input.assumptions.map((a, i) => `  ${i + 1}. ${a}`).join("\n")
      : "  (no assumptions listed)";
  const risksBlock =
    input.risks.length > 0
      ? input.risks.map((r, i) => `  ${i + 1}. ${r}`).join("\n")
      : "  (no risks listed)";

  return `CROSS-REFERENCE ANALYSIS: IMAGE vs DECISION BRIEF

You are performing a forensic comparison between visual evidence (an image the
user uploaded) and the claims made in their decision brief. Your goal is to find
ANOMALIES — places where what the image shows diverges from what the text claims.

═══════════════════════════════════════════════════════════════════════════════
IMAGE CONTENT (extracted / described)
═══════════════════════════════════════════════════════════════════════════════
${imageDescription}

═══════════════════════════════════════════════════════════════════════════════
DECISION BRIEF CLAIMS
═══════════════════════════════════════════════════════════════════════════════

📋 CONTEXT:
${contextBlock}

🎯 INTENT:
${intentBlock}

📊 EVIDENCE:
${evidenceBlock}

🧱 ASSUMPTIONS:
${assumptionsBlock}

⚠️ RISKS:
${risksBlock}

═══════════════════════════════════════════════════════════════════════════════
ANOMALY CATEGORIES TO LOOK FOR
═══════════════════════════════════════════════════════════════════════════════

1. CONTRADICTION — Image data directly contradicts a text claim
   Example: Brief says "revenue grew 20%", chart shows flat revenue.

2. MISSING_CONTEXT — Image reveals something not mentioned in the text
   Example: Image shows a competitor product the brief doesn't mention.

3. OUTDATED — Image data appears to be from a different time period
   Example: Brief says "latest Q3 data", image header says "Q1 2024".

4. SCALE_MISMATCH — Numbers or proportions in the image don't match text
   Example: Brief says "minor market share", pie chart shows 40%.

5. ASSUMPTION_GAP — Image reveals an unstated assumption
   Example: Image shows dependency on a specific vendor not mentioned.

═══════════════════════════════════════════════════════════════════════════════
ANALYSIS INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

- If the image is NOT relevant to the decision brief (e.g., a logo, unrelated
  photo), say so and return an empty anomalies array with low confidence.
- If the image IS relevant, scrutinize every claim in the brief against the
  visual evidence.
- Be specific: cite the exact text claim and exact visual element that conflict.
- Rate severity: a contradiction in core evidence is "critical"; a minor missing
  detail is "low".
- Set your confidence based on image clarity and relevance (0–100).

═══════════════════════════════════════════════════════════════════════════════
REQUIRED JSON OUTPUT
═══════════════════════════════════════════════════════════════════════════════

Return ONLY valid JSON, no surrounding text or markdown:

{
  "analyzed": true,
  "image_summary": "Brief description of what the image shows",
  "anomalies": [
    {
      "type": "contradiction | missing_context | outdated | scale_mismatch | assumption_gap",
      "description": "Clear explanation of the anomaly",
      "image_evidence": "What the image shows (specific detail)",
      "text_claim": "What the decision brief says",
      "severity": "critical | high | medium | low",
      "recommendation": "Concrete action to resolve this anomaly"
    }
  ],
  "confidence": 0-100
}

If NO anomalies are found, return:
{
  "analyzed": true,
  "image_summary": "...",
  "anomalies": [],
  "confidence": <your confidence level>
}

NOW ANALYZE AND RETURN JSON:`;
}

/**
 * Build a lightweight prompt for quick image description.
 * Used as Step 1 when the image needs to be described before cross-referencing.
 */
export function buildImageDescriptionPrompt(): string {
  return `Describe this image in detail. Focus on:
1. Data, numbers, charts, or metrics shown
2. Text, labels, headers, dates, or sources visible
3. People, organizations, or brands identified
4. Layout structure and what each section contains
5. Any fine print, footnotes, or disclaimers

Be factual and precise. Do not interpret or make assumptions.
Return a structured plain-text description (no JSON needed).`;
}

/* ────────────────────────────────────────────────────────────────────────────
   RESPONSE PARSER
   Safely converts raw AI output into a typed CrossReferenceResult
──────────────────────────────────────────────────────────────────────────── */

/**
 * Parse the raw AI response into a validated CrossReferenceResult.
 * Handles malformed JSON, missing fields, and out-of-range values gracefully.
 */
export function parseCrossReferenceResponse(raw: unknown): CrossReferenceResult {
  const empty: CrossReferenceResult = {
    analyzed: false,
    anomalies: [],
    confidence: 0,
  };

  if (!isRecord(raw)) return empty;

  // Extract the cross_reference wrapper if present (some prompts nest it)
  const data = isRecord((raw as any).cross_reference)
    ? (raw as any).cross_reference
    : raw;

  const analyzed = data.analyzed !== false; // Default to true unless explicitly false
  const imageSummary = safeString(data.image_summary) || undefined;
  const confidence = clamp(safeNumber(data.confidence, 0));

  // Parse anomalies array
  const rawAnomalies = safeArray(data.anomalies);
  const anomalies: CrossReferenceAnomaly[] = rawAnomalies
    .map((item: any): CrossReferenceAnomaly | null => {
      if (!isRecord(item)) return null;

      const description = safeString(item.description);
      if (!description) return null; // Skip empty anomalies

      return {
        type: isValidAnomalyType(item.type) ? item.type : "missing_context",
        description,
        image_evidence: safeString(item.image_evidence, "Not specified"),
        text_claim: safeString(item.text_claim, "Not specified"),
        severity: isValidSeverity(item.severity) ? item.severity : "medium",
        recommendation: safeString(item.recommendation, "Review and verify"),
      };
    })
    .filter((a): a is CrossReferenceAnomaly => a !== null)
    .slice(0, MAX_ANOMALIES);

  return {
    analyzed,
    image_summary: imageSummary,
    anomalies,
    confidence,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   DETERMINISTIC ANALYSIS UTILITIES
   Local checks that run WITHOUT calling AI — fast and free
──────────────────────────────────────────────────────────────────────────── */

/**
 * Pre-checks whether the decision input has enough textual content to make
 * a cross-reference worthwhile. Returns suggestions if not.
 */
export type CrossReferencePreCheck = {
  can_cross_reference: boolean;
  text_density_score: number; // 0–100 — how much text is available to compare
  warnings: string[];
  suggestions: string[];
};

export function preCheckCrossReference(input: DecisionInput): CrossReferencePreCheck {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let textScore = 100;

  const contextLen = (input.context || "").trim().length;
  const intentLen = (input.intent || "").trim().length;
  const evidenceCount = input.evidence.length;
  const assumptionCount = input.assumptions.length;

  // Context check
  if (contextLen < 20) {
    textScore -= 25;
    warnings.push("Context is too thin for meaningful cross-reference");
    suggestions.push("Add more context so the image can be compared against it");
  } else if (contextLen < 80) {
    textScore -= 10;
  }

  // Intent check
  if (intentLen < 10) {
    textScore -= 20;
    warnings.push("Intent is missing — hard to judge if image supports the goal");
  }

  // Evidence check
  if (evidenceCount === 0) {
    textScore -= 25;
    warnings.push("No evidence listed — image cannot be compared to supporting data");
    suggestions.push("Add evidence claims so the image can validate or contradict them");
  }

  // Assumption check
  if (assumptionCount === 0) {
    textScore -= 15;
    suggestions.push("List assumptions — images often reveal unstated ones");
  }

  const score = clamp(textScore);

  return {
    can_cross_reference: score >= 30,
    text_density_score: score,
    warnings,
    suggestions: suggestions.slice(0, 3),
  };
}

/**
 * Compute an "anomaly severity score" from a list of anomalies.
 * Higher score = more serious discrepancies found.
 */
export function computeAnomalySeverityScore(anomalies: CrossReferenceAnomaly[]): number {
  if (anomalies.length === 0) return 0;

  const totalWeight = anomalies.reduce(
    (sum, a) => sum + SEVERITY_WEIGHT[a.severity],
    0
  );

  // Normalize: max possible is MAX_ANOMALIES * critical weight
  const maxPossible = MAX_ANOMALIES * SEVERITY_WEIGHT.critical;
  return clamp(Math.round((totalWeight / maxPossible) * 100));
}

/**
 * Group anomalies by type for summary display.
 */
export function groupAnomaliesByType(
  anomalies: CrossReferenceAnomaly[]
): Record<AnomalyType, CrossReferenceAnomaly[]> {
  const groups: Record<AnomalyType, CrossReferenceAnomaly[]> = {
    contradiction: [],
    missing_context: [],
    outdated: [],
    scale_mismatch: [],
    assumption_gap: [],
  };

  for (const anomaly of anomalies) {
    if (groups[anomaly.type]) {
      groups[anomaly.type].push(anomaly);
    }
  }

  return groups;
}

/**
 * Group anomalies by severity for priority display.
 */
export function groupAnomaliesBySeverity(
  anomalies: CrossReferenceAnomaly[]
): Record<SeverityLevel, CrossReferenceAnomaly[]> {
  const groups: Record<SeverityLevel, CrossReferenceAnomaly[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  for (const anomaly of anomalies) {
    if (groups[anomaly.severity]) {
      groups[anomaly.severity].push(anomaly);
    }
  }

  return groups;
}

/**
 * Generate a one-line summary of the cross-reference analysis.
 * Suitable for inclusion in reports or Google export.
 */
export function summarizeCrossReference(result: CrossReferenceResult): string {
  if (!result.analyzed) {
    return "Cross-reference not performed (no image provided).";
  }

  if (result.anomalies.length === 0) {
    return `Image analysis complete (confidence: ${result.confidence}%) — no anomalies detected.`;
  }

  const criticalCount = result.anomalies.filter(a => a.severity === "critical").length;
  const highCount = result.anomalies.filter(a => a.severity === "high").length;
  const totalCount = result.anomalies.length;

  const parts: string[] = [`${totalCount} anomal${totalCount === 1 ? "y" : "ies"} found`];

  if (criticalCount > 0) {
    parts.push(`${criticalCount} critical`);
  }
  if (highCount > 0) {
    parts.push(`${highCount} high`);
  }

  parts.push(`confidence: ${result.confidence}%`);

  return `Image cross-reference: ${parts.join(", ")}.`;
}

/**
 * Determine whether the cross-reference result is worth showing in the UI.
 * Low confidence + zero anomalies on an irrelevant image should be hidden.
 */
export function shouldDisplayCrossReference(result: CrossReferenceResult): boolean {
  if (!result.analyzed) return false;
  if (result.anomalies.length > 0) return true;
  return result.confidence >= MIN_CONFIDENCE_THRESHOLD;
}

/* ────────────────────────────────────────────────────────────────────────────
   MERGE INTO STRESS TEST RESULT
   Utility to attach cross-reference data to an existing stress test result
──────────────────────────────────────────────────────────────────────────── */

import type { StressTestResult } from "./stressTestTypes";

/**
 * Merge a CrossReferenceResult into an existing StressTestResult.
 * If anomalies are found, they can also influence the overall robustness score.
 */
export function mergeWithStressTestResult(
  stressResult: StressTestResult,
  crossRef: CrossReferenceResult
): StressTestResult {
  const merged = { ...stressResult, cross_reference: crossRef };

  // If significant anomalies found, adjust overall robustness score downward
  if (crossRef.anomalies.length > 0 && crossRef.confidence >= MIN_CONFIDENCE_THRESHOLD) {
    const severityPenalty = computeAnomalySeverityScore(crossRef.anomalies);
    const scaledPenalty = Math.round(severityPenalty * (crossRef.confidence / 100) * 0.3);

    merged.scores = {
      ...merged.scores,
      overall_robustness: clamp(merged.scores.overall_robustness - scaledPenalty),
      evidence_quality: clamp(merged.scores.evidence_quality - Math.round(scaledPenalty * 0.5)),
    };
  }

  return merged;
}

/* ────────────────────────────────────────────────────────────────────────────
   EXPORT SUMMARY FOR GOOGLE SHEETS / REPORT
──────────────────────────────────────────────────────────────────────────── */

export type CrossReferenceSummaryForExport = {
  image_analyzed: boolean;
  image_summary: string;
  total_anomalies: number;
  critical_anomalies: number;
  high_anomalies: number;
  confidence: number;
  severity_score: number;
  top_anomaly: string | null;
  summary_text: string;
};

/**
 * Flatten the cross-reference result into a simple object suitable for
 * Google Sheets export or report appendix.
 */
export function flattenForExport(
  result: CrossReferenceResult
): CrossReferenceSummaryForExport {
  const severityScore = computeAnomalySeverityScore(result.anomalies);
  const criticalAnomalies = result.anomalies.filter(a => a.severity === "critical");
  const highAnomalies = result.anomalies.filter(a => a.severity === "high");

  const topAnomaly =
    criticalAnomalies[0]?.description ??
    highAnomalies[0]?.description ??
    result.anomalies[0]?.description ??
    null;

  return {
    image_analyzed: result.analyzed,
    image_summary: result.image_summary || "",
    total_anomalies: result.anomalies.length,
    critical_anomalies: criticalAnomalies.length,
    high_anomalies: highAnomalies.length,
    confidence: result.confidence,
    severity_score: severityScore,
    top_anomaly: topAnomaly,
    summary_text: summarizeCrossReference(result),
  };
}
