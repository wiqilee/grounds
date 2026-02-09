// lib/analysis/stressTestTypes.ts
// ═══════════════════════════════════════════════════════════════════════════════
// DEEP REASONER: STRESS TEST MODE - TYPE DEFINITIONS
// Extended types for Devil's Advocate analysis and Chain of Thought reasoning
// 
// NOTE: This file extends the base types from ./types.ts
// Import base types when using: import type { DecisionInput } from "./types";
// ═══════════════════════════════════════════════════════════════════════════════

// Import base types for use in this file
import type { DecisionInput, ConfidenceLevel, BlindSpots, AnalysisBundle } from "./types";

// Re-export base types for convenience
export type { DecisionInput, ConfidenceLevel, BlindSpots, AnalysisBundle };

/* ────────────────────────────────────────────────────────────────────────────
   THINKING PATH - Chain of Thought Visualization
   Shows AI reasoning steps for transparency (hackathon judges love this)
──────────────────────────────────────────────────────────────────────────── */

export type ThinkingAction = 
  | "analyze"      // Breaking down input components
  | "correlate"    // Finding connections between risks/assumptions
  | "challenge"    // Devil's advocate questioning
  | "synthesize"   // Drawing conclusions
  | "validate"     // Cross-checking with evidence
  | "hypothesize"; // Generating failure scenarios

export type ThinkingStep = {
  step: number;
  action: ThinkingAction;
  target: string;           // What is being analyzed (e.g., "assumption #2", "risk correlation")
  reasoning: string;        // The actual thought process
  confidence: number;       // 0-100 confidence in this step
  duration_ms?: number;     // Optional: how long this step took
};

/* ────────────────────────────────────────────────────────────────────────────
   CRITICAL FLAW - The biggest logical weakness
──────────────────────────────────────────────────────────────────────────── */

export type SeverityLevel = "critical" | "high" | "medium" | "low";

export type CriticalFlaw = {
  title: string;
  severity: SeverityLevel;
  explanation: string;
  affected_components: Array<
    "intent" | "context" | "options" | "assumptions" | "risks" | "evidence" | "outcome"
  >;
  failure_scenario: string;    // What happens if this flaw is not addressed
  detection_method: string;    // How the AI identified this flaw
};

/* ────────────────────────────────────────────────────────────────────────────
   HIDDEN DEPENDENCIES - Things that must happen but aren't planned
──────────────────────────────────────────────────────────────────────────── */

export type DependencyStatus = "missing" | "partial" | "unverified" | "assumed";

export type HiddenDependency = {
  dependency: string;
  why_critical: string;
  current_status: DependencyStatus;
  owner_suggestion?: string;         // Who should own this
  verification_method?: string;      // How to verify this is in place
  risk_if_missing: string;           // Consequence if not addressed
};

/* ────────────────────────────────────────────────────────────────────────────
   BLIND SPOTS - Categories of overlooked issues
──────────────────────────────────────────────────────────────────────────── */

export type BlindSpotCategory = 
  | "security"
  | "financial"
  | "operational"
  | "legal"
  | "technical"
  | "stakeholder"
  | "timeline"
  | "resource"
  | "external";

export type StressTestBlindSpot = {
  id: string;                          // Unique identifier for UI linking
  category: BlindSpotCategory;
  title: string;
  description: string;
  potential_impact: string;
  probability_score: number;           // 0-100
  impact_score: number;                // 0-100
  detection_difficulty: "easy" | "medium" | "hard";
  related_assumptions?: string[];      // Links to user's assumptions
  related_risks?: string[];            // Links to user's risks
};

/* ────────────────────────────────────────────────────────────────────────────
   MITIGATION STRATEGY - Concrete fixes for blind spots
──────────────────────────────────────────────────────────────────────────── */

export type EffortLevel = "low" | "medium" | "high";

export type MitigationStrategy = {
  for_blind_spot_id: string;           // Links to StressTestBlindSpot.id
  action: string;
  rationale: string;
  effort: EffortLevel;
  timeline: string;
  owner_hint?: string;
  success_criteria: string;            // How to know mitigation worked
  fallback_if_failed?: string;         // Plan B
};

/* ────────────────────────────────────────────────────────────────────────────
   PROBABILITY IMPACT MATRIX - Risk correlation analysis
──────────────────────────────────────────────────────────────────────────── */

export type RiskCorrelation = {
  risk_a: string;
  risk_b: string;
  correlation_type: "amplifies" | "triggers" | "masks" | "independent";
  correlation_strength: number;        // 0-100
  cascade_effect: string;              // What happens when both occur
  combined_probability: number;        // 0-100
};

export type ProbabilityMatrix = {
  overall_failure_risk: number;        // 0-100 composite score
  risk_correlations: RiskCorrelation[];
  highest_risk_cluster: string[];      // Group of correlated risks
  single_point_of_failures: string[];  // Risks that alone can sink the plan
  risk_diversity_score: number;        // 0-100: higher = risks are independent (better)
};

/* ────────────────────────────────────────────────────────────────────────────
   CROSS REFERENCE RESULT - Image-text anomaly detection
──────────────────────────────────────────────────────────────────────────── */

export type AnomalyType = 
  | "contradiction"    // Image data contradicts text claim
  | "missing_context"  // Image shows something not mentioned in text
  | "outdated"         // Image data appears outdated vs text
  | "scale_mismatch"   // Numbers in image don't match text scale
  | "assumption_gap";  // Image reveals unstated assumption

export type CrossReferenceAnomaly = {
  type: AnomalyType;
  description: string;
  image_evidence: string;             // What was seen in image
  text_claim: string;                 // What the text says
  severity: SeverityLevel;
  recommendation: string;
};

export type CrossReferenceResult = {
  analyzed: boolean;
  image_summary?: string;             // Brief description of image content
  anomalies: CrossReferenceAnomaly[];
  confidence: number;                 // 0-100 confidence in analysis
};

/* ────────────────────────────────────────────────────────────────────────────
   DEVIL'S ADVOCATE CHALLENGES - Direct challenges to the plan
──────────────────────────────────────────────────────────────────────────── */

export type ChallengeType = 
  | "assumption_attack"   // "What if this assumption is wrong?"
  | "option_critique"     // "Why not this alternative?"
  | "evidence_weakness"   // "This evidence doesn't support that"
  | "risk_underestimate"  // "This risk is bigger than you think"
  | "intent_question"     // "Is this really what you want?"
  | "timeline_pressure"   // "Can you really do this in time?"
  | "resource_doubt";     // "Do you have what you need?"

export type DevilsAdvocateChallenge = {
  type: ChallengeType;
  challenge: string;                  // The actual challenge question/statement
  target: string;                     // What part of input this challenges
  counter_argument: string;           // The devil's advocate position
  if_wrong_consequence: string;       // What happens if user is wrong
  suggested_response: string;         // How user could address this
};

/* ────────────────────────────────────────────────────────────────────────────
   STRESS TEST RESULT - Complete output schema
──────────────────────────────────────────────────────────────────────────── */

export type StressTestResult = {
  // === Core Analysis ===
  critical_flaw: CriticalFlaw | null;
  
  hidden_dependencies: HiddenDependency[];
  
  blind_spots: StressTestBlindSpot[];
  
  mitigation_strategies: MitigationStrategy[];
  
  probability_matrix: ProbabilityMatrix;
  
  // === Devil's Advocate ===
  devils_advocate_challenges: DevilsAdvocateChallenge[];
  
  // === Cross Reference (if image provided) ===
  cross_reference?: CrossReferenceResult;
  
  // === Transparency for Judges ===
  thinking_path: ThinkingStep[];
  
  // === Summary Scores ===
  scores: {
    overall_robustness: number;       // 0-100: higher = plan is more solid
    assumption_strength: number;      // 0-100: how well-founded assumptions are
    risk_coverage: number;            // 0-100: how well risks are identified
    evidence_quality: number;         // 0-100: how strong the evidence is
    execution_readiness: number;      // 0-100: ready to execute?
  };
  
  // === Metadata ===
  meta: {
    request_id: string;
    model_used: string;
    thinking_tokens: number;
    processing_time_ms: number;
    api_version: string;
    timestamp_iso: string;
  };
};

/* ────────────────────────────────────────────────────────────────────────────
   REQUEST TYPES
──────────────────────────────────────────────────────────────────────────── */

export type StressTestRequest = {
  // Core decision input (reuse existing type)
  decision: DecisionInput;
  
  // Optional: Image data for cross-reference (base64 or URL)
  image_data?: {
    type: "base64" | "url";
    content: string;
    mime_type?: string;
  };
  
  // Configuration
  config?: {
    // Focus areas for analysis
    focus_areas?: BlindSpotCategory[];
    
    // How aggressive should Devil's Advocate be?
    aggression_level?: "gentle" | "moderate" | "ruthless";
    
    // Include full thinking path? (may increase latency)
    include_thinking_path?: boolean;
    
    // Max number of blind spots to return
    max_blind_spots?: number;
    
    // Max number of challenges to return
    max_challenges?: number;
  };
  
  // Model selection
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

/* ────────────────────────────────────────────────────────────────────────────
   UI DISPLAY HELPERS
──────────────────────────────────────────────────────────────────────────── */

// For the ThinkingPath component animation
export type ThinkingPathDisplay = {
  steps: Array<ThinkingStep & {
    icon: string;           // Emoji for UI
    color_class: string;    // Tailwind class for color
  }>;
  total_duration_ms: number;
  is_streaming: boolean;
};

// For the ImpactMatrix component
export type MatrixCell = {
  risk_id: string;
  probability: number;
  impact: number;
  quadrant: "critical" | "high" | "medium" | "low";
  label: string;
};

// Color scheme constants (no yellow/orange per user request)
export const STRESS_TEST_COLORS = {
  // Severity colors
  critical: "#EC4899",      // Hot Pink (instead of red)
  high: "#A855F7",          // Purple
  medium: "#0EA5E9",        // Blue
  low: "#10B981",           // Emerald
  
  // Thinking mode
  thinking_primary: "#8B5CF6",    // Cyberpunk Purple
  thinking_glow: "#A78BFA",       // Lighter purple glow
  thinking_accent: "#0EA5E9",     // Deep Sea Blue
  
  // Background
  bg_dark: "#0F172A",             // Slate 900
  bg_card: "#1E293B",             // Slate 800
  
  // Text
  text_primary: "#F1F5F9",        // Slate 100
  text_secondary: "#94A3B8",      // Slate 400
} as const;

// Icon mapping for thinking actions
export const THINKING_ACTION_ICONS: Record<ThinkingAction, string> = {
  analyze: "🔍",
  correlate: "🔗",
  challenge: "⚔️",
  synthesize: "🧬",
  validate: "✓",
  hypothesize: "💭",
} as const;

// Category icons for blind spots
export const BLIND_SPOT_CATEGORY_ICONS: Record<BlindSpotCategory, string> = {
  security: "🔒",
  financial: "💰",
  operational: "⚙️",
  legal: "⚖️",
  technical: "🔧",
  stakeholder: "👥",
  timeline: "⏰",
  resource: "📦",
  external: "🌐",
} as const;
