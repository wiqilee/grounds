import type { BlindSpots, DecisionInput } from "./types";

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

export function computeBlindSpots(input: DecisionInput): BlindSpots {
  // Blind-Spot Index: higher is better (more covered).
  // This checks coverage, not correctness.
  let score = 100;

  const missing: string[] = [];
  const weak: string[] = [];
  const notes: string[] = [];

  const ctxLen = input.context.trim().length;
  const intentLen = input.intent.trim().length;

  if (ctxLen < 80) {
    score -= 18;
    missing.push("Context is thin — add constraints, baseline, and what triggered the decision.");
  } else if (ctxLen < 180) {
    score -= 10;
    weak.push("Context exists but could be richer — a few extra details would reduce ambiguity.");
  }

  if (intentLen < 40) {
    score -= 16;
    missing.push("Intent is short — define what 'success' means in plain terms.");
  }

  if (input.options.length < 2) {
    score -= 18;
    missing.push("No real alternatives captured — even a 'do nothing' option helps calibration.");
  } else if (input.options.length === 2) {
    score -= 8;
    weak.push("Only two options — consider a third 'counterfactual' for contrast.");
  }

  if (input.assumptions.length === 0) {
    score -= 16;
    missing.push("No assumptions listed — decisions drift when assumptions stay invisible.");
  } else if (input.assumptions.join(" ").length < 60) {
    score -= 8;
    weak.push("Assumptions are brief — add why you believe them (and what would disprove them).");
  }

  if (input.evidence.length === 0) {
    score -= 14;
    missing.push("No evidence listed — add 1–2 artifacts (numbers, links, docs) that support key claims.");
  } else if (input.evidence.join(" ").length < 60) {
    score -= 6;
    weak.push("Evidence list is thin — add concrete references, not just statements.");
  }

  if (input.risks.length === 0) {
    score -= 18;
    missing.push("No risks listed — consider first failure modes and early warning signals.");
  } else if (input.risks.join(" ").length < 70) {
    score -= 8;
    weak.push("Risks exist but are brief — add impact + mitigation for at least one top risk.");
  }

  // Gentle notes
  notes.push("This index measures coverage, not quality — it's a mirror, not a verdict.");
  notes.push("A small rewrite now often saves a big rewrite later. 🙂");

  return { score: clamp(score), missing, weak, notes };
}
