import type { DecisionInput, HalfLife } from "./types";

function daysBetween(aISO: string, bISO: string) {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

export function computeHalfLife(input: DecisionInput, nowISO = new Date().toISOString()): HalfLife {
  const daysSince = daysBetween(input.createdAtISO, nowISO);

  // Heuristic: half-life depends on confidence and the "volatility" implied by risks/options length.
  // This is intentionally simple and transparent.
  const volatilitySignals =
    (input.risks.join(" ").length > 260 ? 1 : 0) +
    (input.options.length >= 3 ? 1 : 0) +
    (input.context.length > 400 ? 1 : 0);

  const base =
    input.confidence === "high" ? 120 : input.confidence === "medium" ? 75 : 45;

  const daysToHalfLife = Math.max(14, base - volatilitySignals * 10);

  const ratio = daysSince / daysToHalfLife;

  const status: HalfLife["status"] =
    ratio < 0.75 ? "stable" : ratio < 1.25 ? "degrading" : "expired";

  const reasons: string[] = [];
  reasons.push(`Decision age: ${daysSince} day(s).`);
  reasons.push(`Estimated half-life: ~${daysToHalfLife} day(s) based on stated confidence + context signals.`);
  if (status === "degrading") reasons.push("Context may be shifting — consider a quick refresh before committing further.");
  if (status === "expired") reasons.push("This decision likely needs re-validation under current conditions.");

  return { status, daysSinceCreated: daysSince, daysToHalfLife, reasons };
}
