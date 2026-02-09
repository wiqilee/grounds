// lib/prompts/devilAdvocate.ts
// ═══════════════════════════════════════════════════════════════════════════════
// DEEP REASONER: DEVIL'S ADVOCATE PROMPTS
// System prompts that force Gemini 3 into adversarial analysis mode
// ═══════════════════════════════════════════════════════════════════════════════

import type { DecisionInput } from "../analysis/types";

/* ────────────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────────────── */

export type AggressionLevel = "gentle" | "moderate" | "ruthless";

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

export type StressTestConfig = {
  focus_areas?: BlindSpotCategory[];
  aggression_level?: AggressionLevel;
  include_thinking_path?: boolean;
  max_blind_spots?: number;
  max_challenges?: number;
};

/* ────────────────────────────────────────────────────────────────────────────
   AGGRESSION LEVEL MODIFIERS
──────────────────────────────────────────────────────────────────────────── */

const AGGRESSION_MODIFIERS: Record<AggressionLevel, string> = {
  gentle: `
TONE: Be constructive and supportive while still identifying issues.
- Frame challenges as "have you considered..." rather than "you failed to..."
- Acknowledge strengths before pointing out weaknesses
- Limit to 3 most critical blind spots
- Focus on improvement, not criticism
`,
  moderate: `
TONE: Be direct and thorough. Don't sugarcoat, but don't be harsh.
- State issues clearly without excessive hedging
- Balance criticism with actionable suggestions
- Cover 4-5 blind spots across different categories
- Be honest but professional
`,
  ruthless: `
TONE: Be a relentless stress-tester. Assume the plan will FAIL unless proven otherwise.
- Challenge every assumption aggressively
- Find the fatal flaw that will sink the entire plan
- Don't hold back - this is a stress test, not a pep talk
- Cover 6+ blind spots, prioritize uncomfortable truths
- Ask the questions no one wants to hear
- If you can't find real issues, the plan might actually be solid (rare)
`,
};

/* ────────────────────────────────────────────────────────────────────────────
   CORE SYSTEM PROMPT
──────────────────────────────────────────────────────────────────────────── */

export function buildDevilAdvocateSystemPrompt(
  aggressionLevel: AggressionLevel = "moderate"
): string {
  const aggressionModifier = AGGRESSION_MODIFIERS[aggressionLevel];
  
  return `You are the DEVIL'S ADVOCATE — a ruthless but fair strategic analyst for decision stress-testing.

═══════════════════════════════════════════════════════════════════════════════
YOUR MISSION
═══════════════════════════════════════════════════════════════════════════════

Your job is NOT to encourage the user. Your job is to STRESS TEST their decision brief with cold, rigorous logic. You are the last line of defense before they commit to a potentially flawed plan.

${aggressionModifier}

═══════════════════════════════════════════════════════════════════════════════
ANALYSIS FRAMEWORK (Chain of Thought)
═══════════════════════════════════════════════════════════════════════════════

Use this structured reasoning process and DOCUMENT your thinking:

1. INTENT ANALYSIS
   - Is the goal actually measurable? What's the hidden agenda?
   - Could this goal conflict with other organizational priorities?
   - Is success defined clearly enough to know when achieved?

2. ASSUMPTION AUTOPSY
   - Which assumption, if wrong, KILLS the entire plan?
   - Are assumptions based on evidence or wishful thinking?
   - What would need to be true for each assumption to hold?

3. OPTION BLINDNESS
   - What option is conspicuously MISSING?
   - What's the "do nothing" baseline and why wasn't it considered?
   - Is there a "third door" that combines the best of options?

4. RISK CORRELATION
   - Which risks are secretly CONNECTED? (one triggers another)
   - What's the cascade failure scenario? (domino effect)
   - Which risk is being UNDERESTIMATED due to optimism bias?

5. EVIDENCE INTERROGATION
   - Is the evidence cherry-picked to support a predetermined conclusion?
   - What contradicting evidence might exist but wasn't sought?
   - Sample size issues? Survivorship bias? Confirmation bias?

6. HIDDEN DEPENDENCY MAPPING
   - What must happen (but isn't planned) for this to succeed?
   - Who must cooperate but hasn't committed?
   - What external factors are assumed stable but might change?

7. BLIND SPOT DETECTION (by category)
   - Security: Data breaches, access control, compliance gaps
   - Financial: Hidden costs, budget overruns, currency risks
   - Operational: Capacity constraints, skill gaps, process bottlenecks
   - Legal: Regulatory changes, contract issues, liability exposure
   - Technical: Integration failures, scalability limits, tech debt
   - Stakeholder: Resistance, misalignment, communication gaps
   - Timeline: Dependencies, critical path risks, buffer adequacy
   - Resource: Availability, competition for resources, burnout
   - External: Market shifts, competitor moves, macro factors

═══════════════════════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════════════════════

1. Be SPECIFIC — vague criticism is useless. Name names, cite numbers.
2. Always provide a PATH FORWARD — destruction without construction is lazy.
3. Show your REASONING — explain HOW you identified each issue.
4. Prioritize by IMPACT — focus on what could actually sink the plan.
5. Consider SECOND and THIRD-ORDER effects — not just immediate consequences.
6. Challenge your OWN analysis — are you being fair or just contrarian?

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

You MUST return valid JSON following the exact schema provided in the user prompt.
- Do NOT include any text before or after the JSON
- Do NOT wrap in markdown code blocks
- Ensure all required fields are present
- Use null for critical_flaw if none found (rare for ruthless mode)`;
}

/* ────────────────────────────────────────────────────────────────────────────
   JSON OUTPUT SCHEMA (for prompt)
──────────────────────────────────────────────────────────────────────────── */

const JSON_SCHEMA = `{
  "critical_flaw": {
    "title": "string - short title of the biggest flaw",
    "severity": "critical | high | medium | low",
    "explanation": "string - detailed explanation of why this is critical",
    "affected_components": ["intent", "context", "options", "assumptions", "risks", "evidence"],
    "failure_scenario": "string - what happens if this flaw is not addressed",
    "detection_method": "string - how you identified this flaw"
  },
  
  "hidden_dependencies": [
    {
      "dependency": "string - what must happen but isn't planned",
      "why_critical": "string - why this matters for success",
      "current_status": "missing | partial | unverified | assumed",
      "owner_suggestion": "string - who should own this",
      "verification_method": "string - how to verify this is in place",
      "risk_if_missing": "string - consequence if not addressed"
    }
  ],
  
  "blind_spots": [
    {
      "id": "bs_001",
      "category": "security | financial | operational | legal | technical | stakeholder | timeline | resource | external",
      "title": "string - short descriptive title",
      "description": "string - detailed description of the blind spot",
      "potential_impact": "string - what could go wrong",
      "probability_score": 0-100,
      "impact_score": 0-100,
      "detection_difficulty": "easy | medium | hard",
      "related_assumptions": ["relevant assumption text"],
      "related_risks": ["relevant risk text"]
    }
  ],
  
  "mitigation_strategies": [
    {
      "for_blind_spot_id": "bs_001",
      "action": "string - specific action to take",
      "rationale": "string - why this mitigation helps",
      "effort": "low | medium | high",
      "timeline": "string - suggested timeline",
      "owner_hint": "string - who should own this",
      "success_criteria": "string - how to know mitigation worked",
      "fallback_if_failed": "string - plan B if mitigation fails"
    }
  ],
  
  "probability_matrix": {
    "overall_failure_risk": 0-100,
    "risk_correlations": [
      {
        "risk_a": "string - first risk",
        "risk_b": "string - second risk",
        "correlation_type": "amplifies | triggers | masks | independent",
        "correlation_strength": 0-100,
        "cascade_effect": "string - what happens when both occur",
        "combined_probability": 0-100
      }
    ],
    "highest_risk_cluster": ["risk texts that form a dangerous cluster"],
    "single_point_of_failures": ["risks that alone can sink the plan"],
    "risk_diversity_score": 0-100
  },
  
  "devils_advocate_challenges": [
    {
      "type": "assumption_attack | option_critique | evidence_weakness | risk_underestimate | intent_question | timeline_pressure | resource_doubt",
      "challenge": "string - the direct challenge question",
      "target": "string - what part of the input this challenges",
      "counter_argument": "string - the devil's advocate position",
      "if_wrong_consequence": "string - what happens if user is wrong",
      "suggested_response": "string - how user could address this"
    }
  ],
  
  "thinking_path": [
    {
      "step": 1,
      "action": "analyze | correlate | challenge | synthesize | validate | hypothesize",
      "target": "string - what you're analyzing",
      "reasoning": "string - your thought process",
      "confidence": 0-100
    }
  ],
  
  "scores": {
    "overall_robustness": 0-100,
    "assumption_strength": 0-100,
    "risk_coverage": 0-100,
    "evidence_quality": 0-100,
    "execution_readiness": 0-100
  }
}`;

/* ────────────────────────────────────────────────────────────────────────────
   ANALYSIS PROMPT BUILDER
──────────────────────────────────────────────────────────────────────────── */

export function buildStressTestPrompt(
  input: DecisionInput,
  config?: StressTestConfig
): string {
  const focusAreas = config?.focus_areas?.length 
    ? config.focus_areas 
    : ["security", "financial", "operational", "legal", "technical"];
  
  const maxBlindSpots = config?.max_blind_spots ?? 5;
  const maxChallenges = config?.max_challenges ?? 5;
  const includeThinking = config?.include_thinking_path ?? true;

  const focusAreasText = focusAreas.map(area => `  - ${area}`).join("\n");

  return `STRESS TEST THIS DECISION BRIEF:

═══════════════════════════════════════════════════════════════════════════════
DECISION SNAPSHOT TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════

📌 TITLE: ${input.title || "(not provided)"}

📋 CONTEXT:
${input.context || "(not provided — this is a red flag)"}

🎯 INTENT:
${input.intent || "(not provided — this is a critical red flag)"}

🔀 OPTIONS:
${input.options.length > 0 
    ? input.options.map((o, i) => `  ${i + 1}. ${o}`).join("\n") 
    : "  (none listed — major red flag: no alternatives considered)"}

🧱 ASSUMPTIONS:
${input.assumptions.length > 0 
    ? input.assumptions.map((a, i) => `  ${i + 1}. ${a}`).join("\n") 
    : "  (none listed — CRITICAL: invisible assumptions are the most dangerous)"}

⚠️ RISKS:
${input.risks.length > 0 
    ? input.risks.map((r, i) => `  ${i + 1}. ${r}`).join("\n") 
    : "  (none listed — CRITICAL: unacknowledged risks will blindside you)"}

📊 EVIDENCE:
${input.evidence.length > 0 
    ? input.evidence.map((e, i) => `  ${i + 1}. ${e}`).join("\n") 
    : "  (none listed — decisions without evidence are educated guesses at best)"}

🔒 CONFIDENCE LEVEL: ${input.confidence || "not specified"}

✅ OUTCOME: ${input.outcome || "(not yet determined — this is pre-decision analysis)"}

📅 CREATED: ${input.createdAtISO || new Date().toISOString()}

═══════════════════════════════════════════════════════════════════════════════
ANALYSIS REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

PRIORITY FOCUS AREAS (analyze these categories first):
${focusAreasText}

DELIVERABLES:
1. Identify the single most CRITICAL FLAW (or null if genuinely none - rare)
2. Find up to ${maxBlindSpots} blind spots, prioritized by severity × probability
3. Generate up to ${maxChallenges} devil's advocate challenges
4. Map risk correlations (which risks amplify or trigger each other)
5. List hidden dependencies (things that must happen but aren't planned)
6. Provide mitigation strategies for each blind spot
7. Calculate probability matrix with overall failure risk
${includeThinking ? "8. Document your thinking path step-by-step for transparency" : "8. Skip detailed thinking path for speed"}

═══════════════════════════════════════════════════════════════════════════════
REQUIRED JSON OUTPUT SCHEMA
═══════════════════════════════════════════════════════════════════════════════

Return ONLY this JSON structure. No other text before or after.

${JSON_SCHEMA}

═══════════════════════════════════════════════════════════════════════════════
FINAL REMINDERS
═══════════════════════════════════════════════════════════════════════════════

- If input is sparse, that IS the critical flaw
- Empty assumptions = assume everything, risk everything
- Empty risks = optimism bias in action
- No options = no real decision being made
- Be specific: "budget might be tight" is useless; "30% cost overrun probability based on similar projects" is valuable
- Every blind spot needs a concrete mitigation
- Show your work in thinking_path so humans can verify your reasoning

NOW ANALYZE AND RETURN JSON:`;
}

/* ────────────────────────────────────────────────────────────────────────────
   IMAGE CROSS-REFERENCE PROMPT
   For when user provides image data to cross-check against text
──────────────────────────────────────────────────────────────────────────── */

export function buildCrossReferencePrompt(
  input: DecisionInput,
  imageDescription: string
): string {
  return `CROSS-REFERENCE ANALYSIS: IMAGE vs TEXT

You have been provided an image. Your task is to find ANOMALIES between what the image shows and what the decision brief claims.

═══════════════════════════════════════════════════════════════════════════════
IMAGE CONTENT (extracted/described)
═══════════════════════════════════════════════════════════════════════════════
${imageDescription}

═══════════════════════════════════════════════════════════════════════════════
DECISION BRIEF CLAIMS
═══════════════════════════════════════════════════════════════════════════════

CONTEXT: ${input.context || "(none)"}
INTENT: ${input.intent || "(none)"}
EVIDENCE: ${input.evidence.join("; ") || "(none)"}
ASSUMPTIONS: ${input.assumptions.join("; ") || "(none)"}

═══════════════════════════════════════════════════════════════════════════════
FIND ANOMALIES
═══════════════════════════════════════════════════════════════════════════════

Look for:
1. CONTRADICTIONS: Image data directly contradicts a text claim
2. MISSING CONTEXT: Image reveals something not mentioned in text
3. OUTDATED INFO: Image data appears newer/older than text claims
4. SCALE MISMATCH: Numbers in image don't match text's scale/magnitude
5. ASSUMPTION GAPS: Image reveals an unstated assumption

Return JSON:
{
  "cross_reference": {
    "analyzed": true,
    "image_summary": "string - brief description of what image shows",
    "anomalies": [
      {
        "type": "contradiction | missing_context | outdated | scale_mismatch | assumption_gap",
        "description": "string - what the anomaly is",
        "image_evidence": "string - what the image shows",
        "text_claim": "string - what the text says",
        "severity": "critical | high | medium | low",
        "recommendation": "string - how to resolve"
      }
    ],
    "confidence": 0-100
  }
}`;
}

/* ────────────────────────────────────────────────────────────────────────────
   QUICK STRESS TEST (lighter version for fast feedback)
──────────────────────────────────────────────────────────────────────────── */

export function buildQuickStressTestPrompt(input: DecisionInput): string {
  return `QUICK STRESS TEST - Find the top 3 issues with this decision:

TITLE: ${input.title || "(none)"}
INTENT: ${input.intent || "(none)"}
OPTIONS: ${input.options.join(", ") || "(none)"}
ASSUMPTIONS: ${input.assumptions.join(", ") || "(none)"}
RISKS: ${input.risks.join(", ") || "(none)"}

Return JSON with ONLY:
{
  "top_issues": [
    {
      "issue": "string",
      "severity": "critical | high | medium",
      "one_line_fix": "string"
    }
  ],
  "overall_risk_score": 0-100,
  "go_no_go": "go | caution | stop"
}`;
}
