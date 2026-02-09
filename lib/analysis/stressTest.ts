// lib/analysis/stressTest.ts
// ═══════════════════════════════════════════════════════════════════════════════
// DEEP REASONER: STRESS TEST CORE LOGIC
// Chain of Thought analysis with Devil's Advocate mode
// ═══════════════════════════════════════════════════════════════════════════════

import type { DecisionInput } from "./types";

/* ────────────────────────────────────────────────────────────────────────────
   TYPE DEFINITIONS
──────────────────────────────────────────────────────────────────────────── */

export type SeverityLevel = "critical" | "high" | "medium" | "low";
export type EffortLevel = "low" | "medium" | "high";
export type DependencyStatus = "missing" | "partial" | "unverified" | "assumed";
export type ThinkingAction = "analyze" | "correlate" | "challenge" | "synthesize" | "validate" | "hypothesize";

export type BlindSpotCategory = 
  | "security" | "financial" | "operational" | "legal" 
  | "technical" | "stakeholder" | "timeline" | "resource" | "external";

export type ChallengeType = 
  | "assumption_attack" | "option_critique" | "evidence_weakness" 
  | "risk_underestimate" | "intent_question" | "timeline_pressure" | "resource_doubt";

export type CorrelationType = "amplifies" | "triggers" | "masks" | "independent";
export type AnomalyType = "contradiction" | "missing_context" | "outdated" | "scale_mismatch" | "assumption_gap";

// ─── Thinking Path ───────────────────────────────────────────────────────────

export type ThinkingStep = {
  step: number;
  action: ThinkingAction;
  target: string;
  reasoning: string;
  confidence: number;
  duration_ms?: number;
};

// ─── Critical Flaw ───────────────────────────────────────────────────────────

export type CriticalFlaw = {
  title: string;
  severity: SeverityLevel;
  explanation: string;
  affected_components: Array<"intent" | "context" | "options" | "assumptions" | "risks" | "evidence" | "outcome">;
  failure_scenario: string;
  detection_method: string;
};

// ─── Hidden Dependencies ─────────────────────────────────────────────────────

export type HiddenDependency = {
  dependency: string;
  why_critical: string;
  current_status: DependencyStatus;
  owner_suggestion?: string;
  verification_method?: string;
  risk_if_missing: string;
};

// ─── Blind Spots ─────────────────────────────────────────────────────────────

export type StressTestBlindSpot = {
  id: string;
  category: BlindSpotCategory;
  title: string;
  description: string;
  potential_impact: string;
  probability_score: number;
  impact_score: number;
  detection_difficulty: "easy" | "medium" | "hard";
  related_assumptions?: string[];
  related_risks?: string[];
};

// ─── Mitigation Strategies ───────────────────────────────────────────────────

export type MitigationStrategy = {
  for_blind_spot_id: string;
  action: string;
  rationale: string;
  effort: EffortLevel;
  timeline: string;
  owner_hint?: string;
  success_criteria: string;
  fallback_if_failed?: string;
};

// ─── Probability Matrix ──────────────────────────────────────────────────────

export type RiskCorrelation = {
  risk_a: string;
  risk_b: string;
  correlation_type: CorrelationType;
  correlation_strength: number;
  cascade_effect: string;
  combined_probability: number;
};

export type ProbabilityMatrix = {
  overall_failure_risk: number;
  risk_correlations: RiskCorrelation[];
  highest_risk_cluster: string[];
  single_point_of_failures: string[];
  risk_diversity_score: number;
};

// ─── Devil's Advocate Challenges ─────────────────────────────────────────────

export type DevilsAdvocateChallenge = {
  type: ChallengeType;
  challenge: string;
  target: string;
  counter_argument: string;
  if_wrong_consequence: string;
  suggested_response: string;
};

// ─── Cross Reference (Image Analysis) ────────────────────────────────────────

export type CrossReferenceAnomaly = {
  type: AnomalyType;
  description: string;
  image_evidence: string;
  text_claim: string;
  severity: SeverityLevel;
  recommendation: string;
};

export type CrossReferenceResult = {
  analyzed: boolean;
  image_summary?: string;
  anomalies: CrossReferenceAnomaly[];
  confidence: number;
};

// ─── Scores ──────────────────────────────────────────────────────────────────

export type StressTestScores = {
  overall_robustness: number;
  assumption_strength: number;
  risk_coverage: number;
  evidence_quality: number;
  execution_readiness: number;
};

// ─── Complete Result ─────────────────────────────────────────────────────────

export type StressTestResult = {
  critical_flaw: CriticalFlaw | null;
  hidden_dependencies: HiddenDependency[];
  blind_spots: StressTestBlindSpot[];
  mitigation_strategies: MitigationStrategy[];
  probability_matrix: ProbabilityMatrix;
  devils_advocate_challenges: DevilsAdvocateChallenge[];
  cross_reference?: CrossReferenceResult;
  thinking_path: ThinkingStep[];
  scores: StressTestScores;
  meta: {
    request_id: string;
    model_used: string;
    thinking_tokens: number;
    processing_time_ms: number;
    api_version: string;
    timestamp_iso: string;
  };
};

// ─── Request ─────────────────────────────────────────────────────────────────

export type StressTestRequest = {
  decision: DecisionInput;
  image_data?: {
    type: "base64" | "url";
    content: string;
    mime_type?: string;
  };
  config?: {
    focus_areas?: BlindSpotCategory[];
    aggression_level?: "gentle" | "moderate" | "ruthless";
    include_thinking_path?: boolean;
    max_blind_spots?: number;
    max_challenges?: number;
  };
  model?: string;
  temperature?: number;
  max_tokens?: number;
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

/* ────────────────────────────────────────────────────────────────────────────
   DETERMINISTIC PRE-ANALYSIS
   Quick local checks before calling AI (improves input quality signal)
──────────────────────────────────────────────────────────────────────────── */

export type PreAnalysisResult = {
  input_quality_score: number;
  red_flags: string[];
  suggestions: string[];
  can_proceed: boolean;
};

export function preAnalyzeInput(input: DecisionInput): PreAnalysisResult {
  const red_flags: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check title
  if (!input.title || input.title.trim().length < 5) {
    score -= 10;
    red_flags.push("Title is missing or too short");
    suggestions.push("Add a clear, specific title for this decision");
  }

  // Check context
  const ctxLen = (input.context || "").trim().length;
  if (ctxLen < 50) {
    score -= 15;
    red_flags.push("Context is critically thin");
    suggestions.push("Add background: What triggered this decision? Who is affected?");
  } else if (ctxLen < 100) {
    score -= 8;
    suggestions.push("Context could be richer - add constraints, timeline, budget");
  }

  // Check intent
  const intentLen = (input.intent || "").trim().length;
  if (intentLen < 20) {
    score -= 15;
    red_flags.push("Intent is missing or unclear");
    suggestions.push("Define what success looks like in measurable terms");
  } else if (!input.intent.match(/\d+|percent|%|\$|by|within/i)) {
    score -= 5;
    suggestions.push("Intent lacks hard edges - add numbers, dates, or thresholds");
  }

  // Check options
  if (input.options.length === 0) {
    score -= 20;
    red_flags.push("No options listed - this isn't a decision, it's a statement");
    suggestions.push("Add at least 2 options including 'do nothing' baseline");
  } else if (input.options.length === 1) {
    score -= 15;
    red_flags.push("Only one option = no real choice being made");
    suggestions.push("Add alternatives to compare against");
  }

  // Check assumptions
  if (input.assumptions.length === 0) {
    score -= 20;
    red_flags.push("CRITICAL: No assumptions listed - invisible assumptions are most dangerous");
    suggestions.push("List what must be true for this plan to work");
  } else if (input.assumptions.length < 2) {
    score -= 10;
    suggestions.push("Add more assumptions - there are always more than you think");
  }

  // Check risks
  if (input.risks.length === 0) {
    score -= 20;
    red_flags.push("CRITICAL: No risks acknowledged - optimism bias detected");
    suggestions.push("List what could go wrong and early warning signs");
  } else if (input.risks.length < 2) {
    score -= 10;
    suggestions.push("Identify more risks - consider 2nd and 3rd order effects");
  }

  // Check evidence
  if (input.evidence.length === 0) {
    score -= 15;
    red_flags.push("No evidence provided - this is gut feeling, not analysis");
    suggestions.push("Add data points, links, or precedents that support claims");
  }

  // Check for vague language
  const allText = [input.context, input.intent, ...input.options, ...input.assumptions].join(" ").toLowerCase();
  const vagueTerms = ["optimize", "improve", "best", "leverage", "streamline", "efficient", "effective", "synergy"];
  const foundVague = vagueTerms.filter(t => allText.includes(t));
  if (foundVague.length > 0) {
    score -= foundVague.length * 2;
    suggestions.push(`Replace vague terms with specifics: ${foundVague.slice(0, 3).join(", ")}`);
  }

  return {
    input_quality_score: clamp(score),
    red_flags,
    suggestions: suggestions.slice(0, 5),
    can_proceed: score >= 30, // Allow analysis even with poor input (AI will note issues)
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   RESPONSE PARSER & COERCER
   Safely parse AI response into typed StressTestResult
──────────────────────────────────────────────────────────────────────────── */

function isValidSeverity(x: unknown): x is SeverityLevel {
  return x === "critical" || x === "high" || x === "medium" || x === "low";
}

function isValidEffort(x: unknown): x is EffortLevel {
  return x === "low" || x === "medium" || x === "high";
}

function isValidDependencyStatus(x: unknown): x is DependencyStatus {
  return x === "missing" || x === "partial" || x === "unverified" || x === "assumed";
}

function isValidBlindSpotCategory(x: unknown): x is BlindSpotCategory {
  const valid = ["security", "financial", "operational", "legal", "technical", "stakeholder", "timeline", "resource", "external"];
  return typeof x === "string" && valid.includes(x);
}

function isValidChallengeType(x: unknown): x is ChallengeType {
  const valid = ["assumption_attack", "option_critique", "evidence_weakness", "risk_underestimate", "intent_question", "timeline_pressure", "resource_doubt"];
  return typeof x === "string" && valid.includes(x);
}

function isValidThinkingAction(x: unknown): x is ThinkingAction {
  const valid = ["analyze", "correlate", "challenge", "synthesize", "validate", "hypothesize"];
  return typeof x === "string" && valid.includes(x);
}

function isValidCorrelationType(x: unknown): x is CorrelationType {
  const valid = ["amplifies", "triggers", "masks", "independent"];
  return typeof x === "string" && valid.includes(x);
}

export function parseStressTestResponse(
  raw: unknown,
  requestId: string,
  modelUsed: string,
  processingTimeMs: number
): StressTestResult {
  const fallback: StressTestResult = {
    critical_flaw: null,
    hidden_dependencies: [],
    blind_spots: [],
    mitigation_strategies: [],
    probability_matrix: {
      overall_failure_risk: 50,
      risk_correlations: [],
      highest_risk_cluster: [],
      single_point_of_failures: [],
      risk_diversity_score: 50,
    },
    devils_advocate_challenges: [],
    thinking_path: [],
    scores: {
      overall_robustness: 50,
      assumption_strength: 50,
      risk_coverage: 50,
      evidence_quality: 50,
      execution_readiness: 50,
    },
    meta: {
      request_id: requestId,
      model_used: modelUsed,
      thinking_tokens: 0,
      processing_time_ms: processingTimeMs,
      api_version: "v1",
      timestamp_iso: new Date().toISOString(),
    },
  };

  if (!isRecord(raw)) return fallback;

  // ─── Parse Critical Flaw ───────────────────────────────────────────────────
  const criticalFlawRaw = (raw as any).critical_flaw;
  const critical_flaw: CriticalFlaw | null = isRecord(criticalFlawRaw) ? {
    title: safeString(criticalFlawRaw.title, "Unknown Flaw"),
    severity: isValidSeverity(criticalFlawRaw.severity) ? criticalFlawRaw.severity : "medium",
    explanation: safeString(criticalFlawRaw.explanation),
    affected_components: safeArray(criticalFlawRaw.affected_components).filter(
      (c): c is CriticalFlaw["affected_components"][number] => 
        ["intent", "context", "options", "assumptions", "risks", "evidence", "outcome"].includes(c as string)
    ),
    failure_scenario: safeString(criticalFlawRaw.failure_scenario),
    detection_method: safeString(criticalFlawRaw.detection_method),
  } : null;

  // ─── Parse Hidden Dependencies ─────────────────────────────────────────────
  const hidden_dependencies: HiddenDependency[] = safeArray((raw as any).hidden_dependencies)
    .map((d: any): HiddenDependency | null => {
      if (!isRecord(d)) return null;
      const dependency = safeString(d.dependency);
      if (!dependency) return null;
      return {
        dependency,
        why_critical: safeString(d.why_critical),
        current_status: isValidDependencyStatus(d.current_status) ? d.current_status : "unverified",
        owner_suggestion: safeString(d.owner_suggestion) || undefined,
        verification_method: safeString(d.verification_method) || undefined,
        risk_if_missing: safeString(d.risk_if_missing),
      };
    })
    .filter((d): d is HiddenDependency => d !== null);

  // ─── Parse Blind Spots ─────────────────────────────────────────────────────
  const blind_spots: StressTestBlindSpot[] = safeArray((raw as any).blind_spots)
    .map((bs: any, idx: number): StressTestBlindSpot | null => {
      if (!isRecord(bs)) return null;
      const title = safeString(bs.title);
      if (!title) return null;
      return {
        id: safeString(bs.id) || `bs_${String(idx + 1).padStart(3, "0")}`,
        category: isValidBlindSpotCategory(bs.category) ? bs.category : "operational",
        title,
        description: safeString(bs.description),
        potential_impact: safeString(bs.potential_impact),
        probability_score: clamp(safeNumber(bs.probability_score, 50)),
        impact_score: clamp(safeNumber(bs.impact_score, 50)),
        detection_difficulty: bs.detection_difficulty === "easy" || bs.detection_difficulty === "hard" 
          ? bs.detection_difficulty : "medium",
        related_assumptions: safeArray(bs.related_assumptions).map(String).filter(Boolean),
        related_risks: safeArray(bs.related_risks).map(String).filter(Boolean),
      };
    })
    .filter((bs): bs is StressTestBlindSpot => bs !== null);

  // ─── Parse Mitigation Strategies ───────────────────────────────────────────
  const mitigation_strategies: MitigationStrategy[] = safeArray((raw as any).mitigation_strategies)
    .map((m: any): MitigationStrategy | null => {
      if (!isRecord(m)) return null;
      const action = safeString(m.action);
      if (!action) return null;
      return {
        for_blind_spot_id: safeString(m.for_blind_spot_id, "bs_001"),
        action,
        rationale: safeString(m.rationale),
        effort: isValidEffort(m.effort) ? m.effort : "medium",
        timeline: safeString(m.timeline, "TBD"),
        owner_hint: safeString(m.owner_hint) || undefined,
        success_criteria: safeString(m.success_criteria),
        fallback_if_failed: safeString(m.fallback_if_failed) || undefined,
      };
    })
    .filter((m): m is MitigationStrategy => m !== null);

  // ─── Parse Probability Matrix ──────────────────────────────────────────────
  const pmRaw = (raw as any).probability_matrix;
  const probability_matrix: ProbabilityMatrix = isRecord(pmRaw) ? {
    overall_failure_risk: clamp(safeNumber(pmRaw.overall_failure_risk, 50)),
    risk_correlations: safeArray(pmRaw.risk_correlations)
      .map((rc: any): RiskCorrelation | null => {
        if (!isRecord(rc)) return null;
        return {
          risk_a: safeString(rc.risk_a),
          risk_b: safeString(rc.risk_b),
          correlation_type: isValidCorrelationType(rc.correlation_type) ? rc.correlation_type : "independent",
          correlation_strength: clamp(safeNumber(rc.correlation_strength, 50)),
          cascade_effect: safeString(rc.cascade_effect),
          combined_probability: clamp(safeNumber(rc.combined_probability, 50)),
        };
      })
      .filter((rc): rc is RiskCorrelation => rc !== null && !!rc.risk_a && !!rc.risk_b),
    highest_risk_cluster: safeArray(pmRaw.highest_risk_cluster).map(String).filter(Boolean),
    single_point_of_failures: safeArray(pmRaw.single_point_of_failures).map(String).filter(Boolean),
    risk_diversity_score: clamp(safeNumber(pmRaw.risk_diversity_score, 50)),
  } : fallback.probability_matrix;

  // ─── Parse Devil's Advocate Challenges ─────────────────────────────────────
  const devils_advocate_challenges: DevilsAdvocateChallenge[] = safeArray((raw as any).devils_advocate_challenges)
    .map((c: any): DevilsAdvocateChallenge | null => {
      if (!isRecord(c)) return null;
      const challenge = safeString(c.challenge);
      if (!challenge) return null;
      return {
        type: isValidChallengeType(c.type) ? c.type : "assumption_attack",
        challenge,
        target: safeString(c.target),
        counter_argument: safeString(c.counter_argument),
        if_wrong_consequence: safeString(c.if_wrong_consequence),
        suggested_response: safeString(c.suggested_response),
      };
    })
    .filter((c): c is DevilsAdvocateChallenge => c !== null);

  // ─── Parse Thinking Path ───────────────────────────────────────────────────
  const thinking_path: ThinkingStep[] = safeArray((raw as any).thinking_path)
    .map((s: any, idx: number): ThinkingStep | null => {
      if (!isRecord(s)) return null;
      return {
        step: safeNumber(s.step, idx + 1),
        action: isValidThinkingAction(s.action) ? s.action : "analyze",
        target: safeString(s.target),
        reasoning: safeString(s.reasoning),
        confidence: clamp(safeNumber(s.confidence, 70)),
        duration_ms: s.duration_ms != null ? safeNumber(s.duration_ms) : undefined,
      };
    })
    .filter((s): s is ThinkingStep => s !== null && s.reasoning.length > 0);

  // ─── Parse Scores ──────────────────────────────────────────────────────────
  const scoresRaw = (raw as any).scores;
  const scores: StressTestScores = isRecord(scoresRaw) ? {
    overall_robustness: clamp(safeNumber(scoresRaw.overall_robustness, 50)),
    assumption_strength: clamp(safeNumber(scoresRaw.assumption_strength, 50)),
    risk_coverage: clamp(safeNumber(scoresRaw.risk_coverage, 50)),
    evidence_quality: clamp(safeNumber(scoresRaw.evidence_quality, 50)),
    execution_readiness: clamp(safeNumber(scoresRaw.execution_readiness, 50)),
  } : fallback.scores;

  return {
    critical_flaw,
    hidden_dependencies,
    blind_spots,
    mitigation_strategies,
    probability_matrix,
    devils_advocate_challenges,
    thinking_path,
    scores,
    meta: {
      request_id: requestId,
      model_used: modelUsed,
      thinking_tokens: thinking_path.length * 50, // Estimate
      processing_time_ms: processingTimeMs,
      api_version: "v1",
      timestamp_iso: new Date().toISOString(),
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   JSON PARSER (handles markdown code blocks, etc)
──────────────────────────────────────────────────────────────────────────── */

export function safeJsonParse(text: string): unknown | null {
  const t = String(text ?? "").trim();
  if (!t) return null;

  // Try direct parse
  try {
    return JSON.parse(t);
  } catch {
    // Continue to other methods
  }

  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue to other methods
    }
  }

  // Try to find JSON object in text
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const slice = t.slice(first, last + 1);
    try {
      return JSON.parse(slice);
    } catch {
      // Continue to fix attempt
    }
    
    // Try to fix common JSON issues
    try {
      const fixed = slice
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/'/g, '"')
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t");
      return JSON.parse(fixed);
    } catch {
      // Give up
    }
  }

  return null;
}

/* ────────────────────────────────────────────────────────────────────────────
   EXPORT UTILITIES
──────────────────────────────────────────────────────────────────────────── */

// Color constants (no yellow/orange per user request)
export const STRESS_TEST_COLORS = {
  critical: "#EC4899",      // Hot Pink
  high: "#A855F7",          // Purple  
  medium: "#0EA5E9",        // Blue
  low: "#10B981",           // Emerald
  thinking_primary: "#8B5CF6",
  thinking_glow: "#A78BFA",
  thinking_accent: "#0EA5E9",
} as const;

// Icon mapping
export const THINKING_ACTION_ICONS: Record<ThinkingAction, string> = {
  analyze: "🔍",
  correlate: "🔗",
  challenge: "⚔️",
  synthesize: "🧬",
  validate: "✓",
  hypothesize: "💭",
};

export const BLIND_SPOT_ICONS: Record<BlindSpotCategory, string> = {
  security: "🔒",
  financial: "💰",
  operational: "⚙️",
  legal: "⚖️",
  technical: "🔧",
  stakeholder: "👥",
  timeline: "⏰",
  resource: "📦",
  external: "🌐",
};

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: STRESS_TEST_COLORS.critical,
  high: STRESS_TEST_COLORS.high,
  medium: STRESS_TEST_COLORS.medium,
  low: STRESS_TEST_COLORS.low,
};
