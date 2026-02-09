import type { DecisionInput, Perspective } from "./types";

function bulletify(lines: string[]) {
  return lines.filter(Boolean).map((s) => s.replace(/^[-*]\s*/g, "").trim());
}

export function computePerspectives(input: DecisionInput): Perspective[] {
  // Perspective Shift Mode: neutral reframing lenses.
  const lenses: Perspective[] = [
    {
      lens: "Operational reality",
      points: bulletify([
        "What breaks first in day-to-day execution?",
        "Which dependency is least reliable?",
        "What is the smallest early warning signal you can monitor weekly?",
      ]),
    },
    {
      lens: "Long-term stability",
      points: bulletify([
        "Does this choice create compounding complexity?",
        "What future you is likely to regret this — and why?",
        "Which assumption is most likely to expire over time?",
      ]),
    },
    {
      lens: "Reputation & trust",
      points: bulletify([
        "How would this look if summarized in one sentence publicly?",
        "Which stakeholder might feel surprised or unheard?",
        "What expectation should be set explicitly to avoid misunderstandings?",
      ]),
    },
    {
      lens: "Cost & opportunity",
      points: bulletify([
        "What do you give up by choosing this option?",
        "What is the hidden cost if the plan runs 2× longer than expected?",
        "Which part of the scope is optional and can be cut early?",
      ]),
    },
  ];

  // We can lightly adapt points based on content size (still deterministic)
  if (input.options.length <= 1) {
    lenses[3].points.unshift("Add at least one alternative option to reveal opportunity costs.");
  }
  if (input.evidence.length === 0) {
    lenses[0].points.unshift("Add one concrete artifact (doc/number/link) to anchor the decision.");
  }

  return lenses;
}
