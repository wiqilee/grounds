export type ConfidenceLevel = "low" | "medium" | "high";

export type DecisionInput = {
  title: string;
  context: string;
  intent: string;
  options: string[];
  assumptions: string[];
  risks: string[];
  evidence: string[];
  confidence: ConfidenceLevel;
  createdAtISO: string;
  // Outcome is optional for pre-decision reports
  outcome?: string;
};

/**
 * A single scored component of readiness.
 * UI can render this into a tooltip / breakdown table.
 */
export type ReadinessScorePart = {
  key:
    | "base"
    | "title"
    | "intent"
    | "context"
    | "options"
    | "assumptions"
    | "risks"
    | "evidence"
    | "confidence"
    | "riskPenalty"
    | "penalties"
    | "other";

  label: string;

  // How many points we awarded for this part (can be negative for penalties)
  points: number;

  // Max points available for this part (0 for penalty-only parts)
  maxPoints: number;

  // If false, UI can highlight as "missing"
  ok: boolean;

  // Human explanation (short)
  reason?: string;

  // What to do to increase score (short, actionable)
  suggestion?: string;
};

export type ReadinessTooltip = {
  /**
   * Assertive title used in hover UI.
   * Example: "Ready · 100/100"
   */
  title: string;

  /**
   * Bullet-like lines (UI can render with dots).
   * Keep short; already action-oriented.
   */
  lines: string[];
};

export type ReadinessBreakdown = {
  /**
   * Sum of maxPoints of parts is the total theoretical max.
   * Final readiness score is clamped to 0..100.
   */
  parts: ReadinessScorePart[];

  /**
   * How many points short of 100 (after clamp).
   * Example: score=95 => missingTo100=5
   */
  missingTo100: number;

  /**
   * Optional “missing” lines for quick UI lists (not necessarily the same as tooltip).
   * Example:
   * - “+2 add 1 more evidence”
   * - “+3 add 1 more risk with early warning signal”
   */
  missingReasons: string[];

  /**
   * Prebuilt tooltip payload (preferred for consistent UI).
   */
  tooltip?: ReadinessTooltip;
};

export type Readiness = {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D";
  highlights: string[];
  openQuestions: string[];
  primaryRisks: string[];

  /**
   * ✅ Deterministic explanation for UI.
   * Powers:
   * - hover tooltip on "Readiness 95/100"
   * - red remainder of progress bar (missingTo100)
   */
  breakdown?: ReadinessBreakdown;
};

export type HalfLife = {
  status: "stable" | "degrading" | "expired";
  daysSinceCreated: number;
  daysToHalfLife: number;
  reasons: string[];
};

export type BlindSpots = {
  score: number; // 0-100 (higher = better coverage; lower = more blind spots)
  missing: string[];
  weak: string[];
  notes: string[];
};

export type Perspective = {
  lens: string;
  points: string[];
};

export type AnalysisBundle = {
  readiness: Readiness;
  halfLife: HalfLife;
  blindSpots: BlindSpots;
  perspectives: Perspective[];
  meta: {
    version: string;
    generatedAtISO: string;
  };
};
