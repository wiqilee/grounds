// lib/analysis/probabilityMatrix.ts
// ═══════════════════════════════════════════════════════════════════════════════
// DEEP REASONER: PROBABILITY MATRIX ENGINE
// Deterministic risk correlation scoring, matrix computation, and cascade
// analysis. Runs locally (no AI call) to pre-compute risk relationships
// before and after the Gemini stress-test response arrives.
//
// This module handles:
//  1. Building a correlation matrix from user-supplied risks
//  2. Scoring risk diversity (how independent the risks are)
//  3. Identifying single points of failure
//  4. Computing cascade failure probabilities
//  5. Merging AI-generated correlations with local heuristics
// ═══════════════════════════════════════════════════════════════════════════════

import type { DecisionInput } from "./types";
import type {
  RiskCorrelation,
  ProbabilityMatrix,
  SeverityLevel,
  StressTestBlindSpot,
} from "./stressTestTypes";

/* ────────────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────────────── */

export type CorrelationType = "amplifies" | "triggers" | "masks" | "independent";

/** A heuristic keyword rule used to detect potential correlations */
export type KeywordRule = {
  keywords: string[];
  correlation_type: CorrelationType;
  base_strength: number; // 0–100 default strength when matched
};

/** The computed matrix cell for visual rendering */
export type MatrixCell = {
  risk_id: string;
  label: string;
  probability: number;
  impact: number;
  quadrant: "critical" | "high" | "medium" | "low";
};

/** Summary statistics for the probability matrix */
export type MatrixStats = {
  total_risks: number;
  correlated_pairs: number;
  independent_pairs: number;
  avg_correlation_strength: number;
  max_correlation_strength: number;
  cascade_chain_length: number;
  single_point_count: number;
  diversity_score: number;
};

/** Configuration for matrix computation */
export type MatrixConfig = {
  /** Minimum keyword overlap to consider two risks related (0–1) */
  keyword_overlap_threshold?: number;
  /** Minimum correlation strength to include in output */
  min_correlation_strength?: number;
  /** Maximum number of correlation pairs to return */
  max_correlations?: number;
  /** Whether to include "independent" correlations in output */
  include_independent?: boolean;
};

const DEFAULT_CONFIG: Required<MatrixConfig> = {
  keyword_overlap_threshold: 0.15,
  min_correlation_strength: 20,
  max_correlations: 15,
  include_independent: false,
};

/* ────────────────────────────────────────────────────────────────────────────
   KEYWORD RULES
   Heuristic pairs of concepts that tend to correlate in risk analysis.
   These power the deterministic pre-analysis before AI provides its own.
──────────────────────────────────────────────────────────────────────────── */

const KEYWORD_RULES: KeywordRule[] = [
  // Financial cascades
  {
    keywords: ["budget", "cost", "funding", "price", "revenue", "profit", "expense", "financial"],
    correlation_type: "amplifies",
    base_strength: 65,
  },
  // Timeline / resource pressure
  {
    keywords: ["deadline", "timeline", "schedule", "delay", "late", "behind", "overdue"],
    correlation_type: "triggers",
    base_strength: 70,
  },
  // Technical debt chains
  {
    keywords: ["technical", "integration", "api", "system", "software", "platform", "infrastructure"],
    correlation_type: "amplifies",
    base_strength: 60,
  },
  // Team / people risks
  {
    keywords: ["team", "hire", "talent", "staff", "employee", "turnover", "morale", "burnout"],
    correlation_type: "triggers",
    base_strength: 55,
  },
  // Regulatory / legal dominos
  {
    keywords: ["regulation", "compliance", "legal", "law", "policy", "license", "permit", "audit"],
    correlation_type: "amplifies",
    base_strength: 70,
  },
  // Market / external factors
  {
    keywords: ["market", "competitor", "demand", "customer", "user", "adoption", "churn"],
    correlation_type: "triggers",
    base_strength: 50,
  },
  // Security / trust chains
  {
    keywords: ["security", "breach", "data", "privacy", "hack", "vulnerability", "trust"],
    correlation_type: "triggers",
    base_strength: 75,
  },
  // Supply chain / vendor risks
  {
    keywords: ["vendor", "supplier", "partner", "dependency", "third-party", "outsource", "contract"],
    correlation_type: "triggers",
    base_strength: 60,
  },
  // Scalability pressure
  {
    keywords: ["scale", "capacity", "performance", "load", "traffic", "growth", "volume"],
    correlation_type: "amplifies",
    base_strength: 55,
  },
  // Communication / alignment
  {
    keywords: ["communication", "stakeholder", "alignment", "approval", "consensus", "misunderstand"],
    correlation_type: "masks",
    base_strength: 45,
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   HELPER FUNCTIONS
──────────────────────────────────────────────────────────────────────────── */

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/** Tokenize a string into lowercase words */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/** Jaccard similarity between two token sets (0–1) */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/** Check how many keywords from a rule appear in the given token set */
function keywordOverlap(tokens: Set<string>, keywords: string[]): number {
  const matched = keywords.filter((k) => {
    // Support multi-word keywords
    const kTokens = k.toLowerCase().split(/[-\s]+/);
    return kTokens.some((kt) => tokens.has(kt));
  });
  return keywords.length === 0 ? 0 : matched.length / keywords.length;
}

/** Determine the quadrant for a risk based on probability and impact */
export function getQuadrant(
  probability: number,
  impact: number
): "critical" | "high" | "medium" | "low" {
  if (probability >= 50 && impact >= 50) return "critical";
  if (probability < 50 && impact >= 50) return "high";
  if (probability >= 50 && impact < 50) return "medium";
  return "low";
}

/* ────────────────────────────────────────────────────────────────────────────
   CORE: HEURISTIC CORRELATION DETECTION
   Runs locally without AI — uses keyword overlap and semantic rules
──────────────────────────────────────────────────────────────────────────── */

/**
 * Detect potential correlations between risk pairs using keyword heuristics.
 * This provides an instant preview before the AI response arrives.
 */
export function detectHeuristicCorrelations(
  risks: string[],
  config?: MatrixConfig
): RiskCorrelation[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const correlations: RiskCorrelation[] = [];

  if (risks.length < 2) return correlations;

  // Tokenize all risks
  const riskTokens = risks.map((r) => new Set(tokenize(r)));

  // Compare every unique pair
  for (let i = 0; i < risks.length; i++) {
    for (let j = i + 1; j < risks.length; j++) {
      const tokensA = riskTokens[i];
      const tokensB = riskTokens[j];

      // Step 1: Direct token overlap (Jaccard)
      const similarity = jaccardSimilarity(tokensA, tokensB);

      // Step 2: Check keyword rules
      let bestRule: KeywordRule | null = null;
      let bestRuleScore = 0;

      for (const rule of KEYWORD_RULES) {
        const overlapA = keywordOverlap(tokensA, rule.keywords);
        const overlapB = keywordOverlap(tokensB, rule.keywords);

        // Both risks must match the same rule for it to be a correlation
        if (overlapA >= cfg.keyword_overlap_threshold && overlapB >= cfg.keyword_overlap_threshold) {
          const combinedScore = (overlapA + overlapB) / 2;
          if (combinedScore > bestRuleScore) {
            bestRuleScore = combinedScore;
            bestRule = rule;
          }
        }
      }

      // Step 3: Compute correlation strength
      let correlationType: CorrelationType = "independent";
      let strength = 0;

      if (bestRule && bestRuleScore > 0) {
        correlationType = bestRule.correlation_type;
        // Combine rule match quality with direct similarity
        strength = Math.round(
          bestRule.base_strength * bestRuleScore * 0.7 + similarity * 100 * 0.3
        );
      } else if (similarity >= 0.2) {
        // High direct overlap even without a rule match
        correlationType = "amplifies";
        strength = Math.round(similarity * 100 * 0.8);
      }

      strength = clamp(strength);

      // Only include if above threshold
      if (strength >= cfg.min_correlation_strength || cfg.include_independent) {
        correlations.push({
          risk_a: risks[i],
          risk_b: risks[j],
          correlation_type: strength < cfg.min_correlation_strength ? "independent" : correlationType,
          correlation_strength: strength,
          cascade_effect: generateCascadeDescription(risks[i], risks[j], correlationType),
          combined_probability: clamp(Math.round(strength * 0.8)),
        });
      }
    }
  }

  // Sort by strength descending and cap at max
  return correlations
    .sort((a, b) => b.correlation_strength - a.correlation_strength)
    .slice(0, cfg.max_correlations);
}

/**
 * Generate a human-readable cascade effect description for a risk pair.
 */
function generateCascadeDescription(
  riskA: string,
  riskB: string,
  correlationType: CorrelationType
): string {
  const shortA = riskA.length > 60 ? riskA.slice(0, 57) + "..." : riskA;
  const shortB = riskB.length > 60 ? riskB.slice(0, 57) + "..." : riskB;

  switch (correlationType) {
    case "amplifies":
      return `If "${shortA}" materializes, it will worsen the impact of "${shortB}" — creating a compounding effect.`;
    case "triggers":
      return `"${shortA}" can directly cause "${shortB}" to occur — a domino chain.`;
    case "masks":
      return `"${shortA}" may hide early warning signs of "${shortB}", making it harder to detect until too late.`;
    case "independent":
      return `These risks appear unrelated; occurrence of one does not significantly affect the other.`;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   MATRIX COMPUTATION
   Build the full ProbabilityMatrix from correlations + blind spots
──────────────────────────────────────────────────────────────────────────── */

/**
 * Compute a full ProbabilityMatrix from risk correlations and (optionally)
 * blind spots. Can work with AI-generated correlations, heuristic correlations,
 * or a merge of both.
 */
export function computeProbabilityMatrix(
  correlations: RiskCorrelation[],
  blindSpots?: StressTestBlindSpot[]
): ProbabilityMatrix {
  // Filter out independent correlations for analysis
  const significantCorrelations = correlations.filter(
    (c) => c.correlation_type !== "independent" && c.correlation_strength >= 20
  );

  // === Overall Failure Risk ===
  const overallFailureRisk = computeOverallFailureRisk(significantCorrelations, blindSpots);

  // === Risk Diversity Score ===
  const riskDiversityScore = computeDiversityScore(correlations);

  // === Highest Risk Cluster ===
  const highestRiskCluster = findHighestRiskCluster(significantCorrelations);

  // === Single Points of Failure ===
  const singlePointOfFailures = findSinglePointsOfFailure(significantCorrelations, blindSpots);

  return {
    overall_failure_risk: overallFailureRisk,
    risk_correlations: correlations,
    highest_risk_cluster: highestRiskCluster,
    single_point_of_failures: singlePointOfFailures,
    risk_diversity_score: riskDiversityScore,
  };
}

/**
 * Compute overall failure risk (0–100).
 * Uses correlation density, blind spot severity, and cascade potential.
 */
function computeOverallFailureRisk(
  correlations: RiskCorrelation[],
  blindSpots?: StressTestBlindSpot[]
): number {
  let risk = 20; // Baseline risk — every plan has some

  // Factor 1: Correlation density
  if (correlations.length > 0) {
    const avgStrength =
      correlations.reduce((s, c) => s + c.correlation_strength, 0) / correlations.length;
    risk += Math.round(avgStrength * 0.3);
  }

  // Factor 2: Trigger chains (most dangerous correlation type)
  const triggerCount = correlations.filter((c) => c.correlation_type === "triggers").length;
  risk += triggerCount * 5;

  // Factor 3: Blind spot severity
  if (blindSpots && blindSpots.length > 0) {
    const criticalSpots = blindSpots.filter(
      (bs) => bs.probability_score >= 70 && bs.impact_score >= 70
    );
    risk += criticalSpots.length * 8;

    const avgBlindSpotRisk =
      blindSpots.reduce(
        (s, bs) => s + (bs.probability_score * bs.impact_score) / 100,
        0
      ) / blindSpots.length;
    risk += Math.round(avgBlindSpotRisk * 0.2);
  }

  // Factor 4: Masking correlations (hidden risks compound)
  const maskCount = correlations.filter((c) => c.correlation_type === "masks").length;
  risk += maskCount * 4;

  return clamp(risk);
}

/**
 * Compute risk diversity score (0–100). Higher = risks are more independent (better).
 * Low diversity = risks are tightly correlated (dangerous).
 */
function computeDiversityScore(correlations: RiskCorrelation[]): number {
  if (correlations.length === 0) return 80; // No known correlations = assume diversity

  const significantCount = correlations.filter(
    (c) => c.correlation_type !== "independent" && c.correlation_strength >= 30
  ).length;

  const totalPairs = correlations.length;
  const correlationRatio = totalPairs > 0 ? significantCount / totalPairs : 0;

  // Average strength of significant correlations
  const significantCorrelations = correlations.filter(
    (c) => c.correlation_type !== "independent"
  );
  const avgStrength =
    significantCorrelations.length > 0
      ? significantCorrelations.reduce((s, c) => s + c.correlation_strength, 0) /
        significantCorrelations.length
      : 0;

  // Diversity is inverse of correlation density and strength
  const diversity = 100 - Math.round(correlationRatio * 50 + (avgStrength / 100) * 50);
  return clamp(diversity);
}

/**
 * Find the cluster of risks that are most tightly interconnected.
 * Uses a simple graph-based approach: find the node with most connections.
 */
function findHighestRiskCluster(correlations: RiskCorrelation[]): string[] {
  if (correlations.length === 0) return [];

  // Build adjacency count
  const connections = new Map<string, Set<string>>();

  for (const c of correlations) {
    if (c.correlation_strength < 30) continue;

    if (!connections.has(c.risk_a)) connections.set(c.risk_a, new Set());
    if (!connections.has(c.risk_b)) connections.set(c.risk_b, new Set());

    connections.get(c.risk_a)!.add(c.risk_b);
    connections.get(c.risk_b)!.add(c.risk_a);
  }

  if (connections.size === 0) return [];

  // Find the node with the most connections
  let maxNode = "";
  let maxCount = 0;

  for (const [node, neighbors] of connections) {
    if (neighbors.size > maxCount) {
      maxCount = neighbors.size;
      maxNode = node;
    }
  }

  if (!maxNode) return [];

  // Return the hub + its direct neighbors (truncate for readability)
  const cluster = [maxNode, ...connections.get(maxNode)!];
  return cluster.map((r) => (r.length > 80 ? r.slice(0, 77) + "..." : r)).slice(0, 6);
}

/**
 * Identify risks that are single points of failure — they either:
 *  1. Trigger many other risks (high out-degree in the correlation graph)
 *  2. Are high-probability + high-impact blind spots with no mitigation path
 */
function findSinglePointsOfFailure(
  correlations: RiskCorrelation[],
  blindSpots?: StressTestBlindSpot[]
): string[] {
  const spofs: string[] = [];

  // From correlations: risks that trigger multiple others
  const triggerOut = new Map<string, number>();
  for (const c of correlations) {
    if (c.correlation_type === "triggers" && c.correlation_strength >= 40) {
      triggerOut.set(c.risk_a, (triggerOut.get(c.risk_a) || 0) + 1);
    }
  }

  for (const [risk, count] of triggerOut) {
    if (count >= 2) {
      const short = risk.length > 80 ? risk.slice(0, 77) + "..." : risk;
      spofs.push(short);
    }
  }

  // From blind spots: critical quadrant items
  if (blindSpots) {
    for (const bs of blindSpots) {
      if (
        bs.probability_score >= 65 &&
        bs.impact_score >= 65 &&
        bs.detection_difficulty === "hard"
      ) {
        if (!spofs.some((s) => s.includes(bs.title.slice(0, 30)))) {
          spofs.push(bs.title);
        }
      }
    }
  }

  return spofs.slice(0, 5);
}

/* ────────────────────────────────────────────────────────────────────────────
   MATRIX CELL GENERATION
   Convert blind spots into positioned cells for the quadrant visualization
──────────────────────────────────────────────────────────────────────────── */

/**
 * Convert blind spots into MatrixCell objects for the ImpactMatrix component.
 */
export function blindSpotsToMatrixCells(blindSpots: StressTestBlindSpot[]): MatrixCell[] {
  return blindSpots.map((bs) => ({
    risk_id: bs.id,
    label: bs.title,
    probability: bs.probability_score,
    impact: bs.impact_score,
    quadrant: getQuadrant(bs.probability_score, bs.impact_score),
  }));
}

/**
 * Compute quadrant distribution counts for summary display.
 */
export function computeQuadrantDistribution(
  cells: MatrixCell[]
): Record<"critical" | "high" | "medium" | "low", number> {
  const dist = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const cell of cells) {
    dist[cell.quadrant]++;
  }
  return dist;
}

/* ────────────────────────────────────────────────────────────────────────────
   MERGE: AI CORRELATIONS + HEURISTIC CORRELATIONS
   Combines AI-generated correlations with local heuristic ones,
   deduplicating and keeping the higher-confidence version of duplicates.
──────────────────────────────────────────────────────────────────────────── */

/**
 * Merge two sets of correlations (AI-generated + heuristic).
 * For duplicate risk pairs, keeps the one with higher strength.
 */
export function mergeCorrelations(
  aiCorrelations: RiskCorrelation[],
  heuristicCorrelations: RiskCorrelation[]
): RiskCorrelation[] {
  const merged = new Map<string, RiskCorrelation>();

  // Helper: create a canonical key for a risk pair (order-independent)
  function pairKey(a: string, b: string): string {
    return [a, b].sort().join("|||");
  }

  // Add AI correlations first (higher trust)
  for (const c of aiCorrelations) {
    const key = pairKey(c.risk_a, c.risk_b);
    merged.set(key, c);
  }

  // Add heuristic correlations only if AI didn't cover them, or if stronger
  for (const c of heuristicCorrelations) {
    const key = pairKey(c.risk_a, c.risk_b);
    const existing = merged.get(key);

    if (!existing) {
      // AI didn't find this pair — add heuristic version
      merged.set(key, c);
    } else if (c.correlation_strength > existing.correlation_strength) {
      // Heuristic is stronger — override (rare but possible for obvious pairs)
      merged.set(key, c);
    }
    // Otherwise: AI version is kept (higher trust)
  }

  return Array.from(merged.values()).sort(
    (a, b) => b.correlation_strength - a.correlation_strength
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   PRE-ANALYSIS: QUICK MATRIX FROM USER INPUT
   Runs instantly before AI call to give immediate feedback
──────────────────────────────────────────────────────────────────────────── */

/**
 * Generate a preliminary ProbabilityMatrix from the user's raw input.
 * This runs synchronously and provides instant feedback while waiting for AI.
 */
export function preAnalyzeRiskMatrix(input: DecisionInput): ProbabilityMatrix {
  const risks = input.risks.filter((r) => r.trim().length > 0);

  if (risks.length === 0) {
    return {
      overall_failure_risk: 50, // Unknown = assume moderate
      risk_correlations: [],
      highest_risk_cluster: [],
      single_point_of_failures: [],
      risk_diversity_score: 50,
    };
  }

  const heuristicCorrelations = detectHeuristicCorrelations(risks);
  return computeProbabilityMatrix(heuristicCorrelations);
}

/* ────────────────────────────────────────────────────────────────────────────
   STATISTICS & REPORTING
──────────────────────────────────────────────────────────────────────────── */

/**
 * Compute summary statistics for the probability matrix.
 * Useful for report generation and Google export.
 */
export function computeMatrixStats(matrix: ProbabilityMatrix): MatrixStats {
  const correlations = matrix.risk_correlations;
  const significant = correlations.filter(
    (c) => c.correlation_type !== "independent"
  );

  const avgStrength =
    significant.length > 0
      ? Math.round(
          significant.reduce((s, c) => s + c.correlation_strength, 0) / significant.length
        )
      : 0;

  const maxStrength =
    significant.length > 0
      ? Math.max(...significant.map((c) => c.correlation_strength))
      : 0;

  // Estimate cascade chain length (longest trigger chain)
  const triggerChains = correlations.filter((c) => c.correlation_type === "triggers");
  const chainLength = estimateCascadeLength(triggerChains);

  return {
    total_risks: new Set(
      correlations.flatMap((c) => [c.risk_a, c.risk_b])
    ).size,
    correlated_pairs: significant.length,
    independent_pairs: correlations.length - significant.length,
    avg_correlation_strength: avgStrength,
    max_correlation_strength: maxStrength,
    cascade_chain_length: chainLength,
    single_point_count: matrix.single_point_of_failures.length,
    diversity_score: matrix.risk_diversity_score,
  };
}

/**
 * Estimate the longest cascade chain from trigger-type correlations.
 */
function estimateCascadeLength(triggers: RiskCorrelation[]): number {
  if (triggers.length === 0) return 0;

  // Build adjacency list for triggers
  const adj = new Map<string, string[]>();
  for (const t of triggers) {
    if (!adj.has(t.risk_a)) adj.set(t.risk_a, []);
    adj.get(t.risk_a)!.push(t.risk_b);
  }

  // DFS to find longest path (with visited set to avoid cycles)
  let maxDepth = 0;

  function dfs(node: string, depth: number, visited: Set<string>) {
    maxDepth = Math.max(maxDepth, depth);
    const neighbors = adj.get(node) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        dfs(next, depth + 1, visited);
        visited.delete(next);
      }
    }
  }

  for (const startNode of adj.keys()) {
    const visited = new Set([startNode]);
    dfs(startNode, 1, visited);
  }

  return maxDepth;
}

/**
 * Generate a one-line summary of the matrix for reports.
 */
export function summarizeMatrix(matrix: ProbabilityMatrix): string {
  const stats = computeMatrixStats(matrix);
  const riskLabel =
    matrix.overall_failure_risk >= 75
      ? "Critical"
      : matrix.overall_failure_risk >= 50
      ? "High"
      : matrix.overall_failure_risk >= 25
      ? "Moderate"
      : "Low";

  const parts: string[] = [
    `${riskLabel} failure risk (${matrix.overall_failure_risk}%)`,
  ];

  if (stats.correlated_pairs > 0) {
    parts.push(`${stats.correlated_pairs} correlated risk pairs`);
  }

  if (stats.single_point_count > 0) {
    parts.push(`${stats.single_point_count} single points of failure`);
  }

  parts.push(`diversity: ${matrix.risk_diversity_score}%`);

  return parts.join(", ");
}

/* ────────────────────────────────────────────────────────────────────────────
   EXPORT SUMMARY FOR GOOGLE SHEETS / REPORT
──────────────────────────────────────────────────────────────────────────── */

export type MatrixSummaryForExport = {
  overall_failure_risk: number;
  risk_diversity_score: number;
  total_correlations: number;
  significant_correlations: number;
  single_points_of_failure: string[];
  highest_risk_cluster: string[];
  cascade_chain_length: number;
  summary_text: string;
};

/**
 * Flatten the probability matrix into a simple object suitable for
 * Google Sheets export or report appendix.
 */
export function flattenMatrixForExport(
  matrix: ProbabilityMatrix
): MatrixSummaryForExport {
  const stats = computeMatrixStats(matrix);

  return {
    overall_failure_risk: matrix.overall_failure_risk,
    risk_diversity_score: matrix.risk_diversity_score,
    total_correlations: matrix.risk_correlations.length,
    significant_correlations: stats.correlated_pairs,
    single_points_of_failure: matrix.single_point_of_failures,
    highest_risk_cluster: matrix.highest_risk_cluster,
    cascade_chain_length: stats.cascade_chain_length,
    summary_text: summarizeMatrix(matrix),
  };
}
