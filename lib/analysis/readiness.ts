import type { DecisionInput, Readiness } from "./types";

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

function ceilDiv(n: number, d: number) {
  return Math.ceil(n / d);
}

type ScorePart = {
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
    | "riskPenalty";
  label: string;
  points: number; // awarded (can be negative for penalties)
  max: number; // maximum positive contribution (0 for penalty parts)
  hint?: string; // what to do to gain more
};

export type ReadinessBreakdown = {
  score: number;
  grade: Readiness["grade"];
  missingTo100: number; // 0..100
  parts: ScorePart[];

  /**
   * Back-compat: older UI can read tooltipLines.
   * Prefer `tooltip` for richer UI.
   */
  tooltipLines: string[];

  /**
   * Reusable tooltip payload for UI (Ready/Almost/Needs work, etc).
   * UI can show title + bullet lines consistently.
   */
  tooltip: {
    title: string;
    lines: string[];
  };
};

export function computeReadinessBreakdown(input: DecisionInput): ReadinessBreakdown {
  // Deterministic, heuristic scoring (not "AI")
  // Goal: reward clarity + evidence + options + explicit risk thinking.

  const titleLen = input.title.trim().length;
  const intentLen = input.intent.trim().length;
  const contextLen = input.context.trim().length;

  const hasTitle = titleLen >= 6;
  const hasIntent = intentLen >= 30;
  const hasContext = contextLen >= 60;

  const optCount = input.options.filter(Boolean).length;
  const asmCount = input.assumptions.filter(Boolean).length;
  const riskCount = input.risks.filter(Boolean).length;
  const evCount = input.evidence.filter(Boolean).length;

  // Scoring knobs (keep in one place so UI explanations stay consistent)
  const BASE = 40;

  const TITLE_MAX = 4;
  const INTENT_MAX = 10;
  const CONTEXT_MAX = 10;

  const OPT_PER = 6;
  const OPT_MAX = 18; // cap at 3 items (3*6)
  const ASM_PER = 3;
  const ASM_MAX = 12; // cap at 4 items
  const RISK_PER = 4;
  const RISK_MAX = 16; // cap at 4 items
  const EV_PER = 5;
  const EV_MAX = 20; // cap at 4 items

  const CONF_MAX = 8;
  const confBonus = input.confidence === "high" ? 8 : input.confidence === "medium" ? 4 : 0;

  const riskPenalty = riskCount === 0 ? -10 : 0;

  const titlePts = hasTitle ? TITLE_MAX : 0;
  const intentPts = hasIntent ? INTENT_MAX : 0;
  const contextPts = hasContext ? CONTEXT_MAX : 0;

  const optPts = clamp(optCount * OPT_PER, 0, OPT_MAX);
  const asmPts = clamp(asmCount * ASM_PER, 0, ASM_MAX);
  const riskPts = clamp(riskCount * RISK_PER, 0, RISK_MAX);
  const evPts = clamp(evCount * EV_PER, 0, EV_MAX);

  const scoreRaw =
    BASE +
    titlePts +
    intentPts +
    contextPts +
    optPts +
    asmPts +
    riskPts +
    evPts +
    confBonus +
    riskPenalty;

  const score = clamp(scoreRaw);

  const grade: Readiness["grade"] = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : "D";

  const parts: ScorePart[] = [
    { key: "base", label: "Base", points: BASE, max: BASE },
    {
      key: "title",
      label: "Title clarity",
      points: titlePts,
      max: TITLE_MAX,
      hint: hasTitle ? undefined : `Add ~${Math.max(0, 6 - titleLen)}+ chars to Title to unlock +${TITLE_MAX}.`,
    },
    {
      key: "intent",
      label: "Intent specificity",
      points: intentPts,
      max: INTENT_MAX,
      hint: hasIntent ? undefined : `Add ~${Math.max(0, 30 - intentLen)}+ chars to Intent to unlock +${INTENT_MAX}.`,
    },
    {
      key: "context",
      label: "Context completeness",
      points: contextPts,
      max: CONTEXT_MAX,
      hint: hasContext ? undefined : `Add ~${Math.max(0, 60 - contextLen)}+ chars to Context to unlock +${CONTEXT_MAX}.`,
    },
    {
      key: "options",
      label: "Options explored",
      points: optPts,
      max: OPT_MAX,
      hint:
        optPts >= OPT_MAX
          ? undefined
          : `Add ${ceilDiv(OPT_MAX - optPts, OPT_PER)} more option(s) to gain up to +${OPT_MAX - optPts}.`,
    },
    {
      key: "assumptions",
      label: "Assumptions explicit",
      points: asmPts,
      max: ASM_MAX,
      hint:
        asmPts >= ASM_MAX
          ? undefined
          : `Add ${ceilDiv(ASM_MAX - asmPts, ASM_PER)} more assumption(s) to gain up to +${ASM_MAX - asmPts}.`,
    },
    {
      key: "risks",
      label: "Risks acknowledged",
      points: riskPts,
      max: RISK_MAX,
      hint:
        riskPts >= RISK_MAX
          ? undefined
          : `Add ${ceilDiv(RISK_MAX - riskPts, RISK_PER)} more risk(s) to gain up to +${RISK_MAX - riskPts}.`,
    },
    {
      key: "evidence",
      label: "Evidence listed",
      points: evPts,
      max: EV_MAX,
      hint:
        evPts >= EV_MAX
          ? undefined
          : `Add ${ceilDiv(EV_MAX - evPts, EV_PER)} more evidence item(s) to gain up to +${EV_MAX - evPts}.`,
    },
    {
      key: "confidence",
      label: "Confidence",
      points: confBonus,
      max: CONF_MAX,
      hint:
        confBonus >= CONF_MAX
          ? undefined
          : input.confidence === "low"
          ? "Set Confidence to Solid/Committed to gain +4/+8 (only if you truly mean it)."
          : "Set Confidence to Committed to gain +4 (only if you truly mean it).",
    },
    {
      key: "riskPenalty",
      label: "Penalty: no risks",
      points: riskPenalty,
      max: 0,
      hint: riskPenalty < 0 ? "Add at least 1 risk to remove the -10 penalty." : undefined,
    },
  ];

  const missingTo100 = clamp(100 - score, 0, 100);

  // Pick top “gaps” that are actionable (ignore base and ignore parts already maxed).
  const actionable = parts
    .filter((p) => p.key !== "base" && p.key !== "riskPenalty")
    .map((p) => {
      const remaining = Math.max(0, p.max - p.points);
      return { ...p, remaining };
    })
    .filter((p) => p.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 4);

  // ---- Assertive tooltip payload (reusable by UI) ----
  const tooltipTitle =
    score >= 100
      ? `Ready · ${score}/100`
      : score >= 85
      ? `Ready-ish · ${score}/100`
      : score >= 70
      ? `Almost · ${score}/100`
      : score >= 55
      ? `Needs work · ${score}/100`
      : `Draft · ${score}/100`;

  const tooltipLines: string[] = [];

  if (score >= 100) {
    tooltipLines.push("All checks passed — you can proceed confidently.");
    tooltipLines.push("Next: run Process → Review → Download, then set a review trigger.");
  } else {
    tooltipLines.push(`Needs +${missingTo100} point(s) to reach 100.`);
  }

  if (riskPenalty < 0) {
    // Keep this near the top; it is the biggest “oops” signal.
    tooltipLines.push("Critical gap: no risks listed (−10). Add 1 risk to remove the penalty.");
  }

  if (actionable.length) {
    tooltipLines.push(actionable.length >= 2 ? "Fastest upgrades:" : "Fastest upgrade:");
    for (const a of actionable) {
      const line = a.hint ? a.hint : `Improve ${a.label} (+${a.remaining}).`;
      tooltipLines.push(`• ${line}`);
    }
  }

  // Back-compat line list (older UI expects a header-like first line)
  const legacyTooltipLines: string[] = [
    `Readiness: ${score}/100 (Grade ${grade})`,
    score >= 100 ? "All checks passed — ready to proceed." : `Missing: ${missingTo100} point(s) to reach 100`,
  ];

  if (riskPenalty < 0) legacyTooltipLines.push("Biggest issue: no risks listed (−10 penalty).");
  if (actionable.length) {
    legacyTooltipLines.push("Fastest ways to improve:");
    for (const a of actionable) {
      const line = a.hint ? a.hint : `Improve ${a.label} (+${a.remaining}).`;
      legacyTooltipLines.push(`• ${line}`);
    }
  }

  return {
    score,
    grade,
    missingTo100,
    parts,
    tooltipLines: legacyTooltipLines,
    tooltip: { title: tooltipTitle, lines: tooltipLines },
  };
}

export function computeReadiness(input: DecisionInput): Readiness {
  const breakdown = computeReadinessBreakdown(input);

  const optCount = input.options.filter(Boolean).length;
  const asmCount = input.assumptions.filter(Boolean).length;
  const riskCount = input.risks.filter(Boolean).length;
  const evCount = input.evidence.filter(Boolean).length;

  const hasIntent = input.intent.trim().length >= 30;
  const hasContext = input.context.trim().length >= 60;

  const highlights: string[] = [];
  if (optCount >= 3) highlights.push("Multiple options were explored (strong sign of deliberate thinking).");
  if (evCount >= 2) highlights.push("Evidence is explicitly listed (easier to validate decisions later).");
  if (riskCount >= 2) highlights.push("Risks are acknowledged early (reduces surprise costs).");
  if (asmCount >= 2) highlights.push("Assumptions are written down (great for future reality checks).");

  const primaryRisks: string[] = [];
  if (riskCount === 0) primaryRisks.push("No explicit risks listed — decisions drift when risks stay implicit.");
  if (evCount === 0) primaryRisks.push("No supporting evidence listed — hard to verify key claims later.");
  if (optCount <= 1) primaryRisks.push("Only one option captured — consider at least one alternative for contrast.");
  if (!hasIntent) primaryRisks.push("Intent is short — unclear goals can create false alignment.");

  const openQuestions: string[] = [];
  if (!hasContext) openQuestions.push("What key constraints or background details should be added to the context?");
  if (evCount < 2) openQuestions.push("Which 1–2 artifacts (links, docs, numbers) would most strengthen confidence?");
  if (asmCount < 2) openQuestions.push("What assumptions are you currently relying on without noticing?");
  if (riskCount < 2) openQuestions.push("What could fail first — and what is the smallest early warning signal?");

  // Keep return type unchanged (safe), while UI can optionally call computeReadinessBreakdown()
  return {
    score: breakdown.score,
    grade: breakdown.grade,
    highlights: highlights.slice(0, 5),
    openQuestions: openQuestions.slice(0, 6),
    primaryRisks: primaryRisks.slice(0, 6),
  };
}
