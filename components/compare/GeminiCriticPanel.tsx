// components/compare/GeminiCriticPanel.tsx
"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Wand2, TriangleAlert, Timer, ShieldCheck, ArrowRight, Copy, Plus, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Textarea } from "@/components/ui/textarea";

type CriticRequest = {
  title?: string;
  context?: string;
  intent?: string;
  options?: string[];
  assumptions?: string[];
  risks?: string[];
  evidence?: string[];
  outcome?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type CriticResponse = {
  /** Useful for report export */
  createdAtISO: string;

  hardEdgesMissing: Array<{
    missing: string;
    suggestedMetrics: string[];
    whereToAdd: "context" | "intent" | "evidence" | "risks" | "options" | "assumptions" | "outcome";
  }>;

  genericLanguage: Array<{
    phrase: string;
    whyGeneric: string;
    rewriteConcrete: string;
  }>;

  blindSpots: Array<{
    blindSpot: string;
    whyItMatters: string;
    clarificationQuestions: string[];
  }>;

  nextActions: Array<{
    action: string;
    why: string;
    ownerHint?: string;
    timebox?: string;
  }>;

  clarificationQuestions: string[];

  meta: {
    requestId: string;
    modelUsed: string;
    latencyMs: number;
    triedModels?: string[];
    fallbackUsed?: boolean;
  };

  rawText?: string;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function uniqLines(lines: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const k = l.trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_SAFE_MODEL = "gemini-3-flash-preview";

export function GeminiCriticPanel(props: {
  title: string;
  context: string;
  intent: string;
  options: string[];
  assumptions: string[];
  risks: string[];
  evidence: string[];
  outcome?: string;
  className?: string;

  // optional: match your page button effects
  btnFx?: (extra?: string) => string;

  // optional: toast hook from page
  onToast?: (msg: string) => void;

  /**
   * ✅ Expose result to parent (for HTML/PDF report).
   * Called when a valid critic response is received.
   * Called with null when cleared.
   */
  onResult?: (result: CriticResponse | null) => void;

  /**
   * Optional "apply" hooks
   */
  onSetIntent?: (next: string) => void;
  onAppendEvidence?: (lines: string[]) => void;
  onAppendAssumptions?: (lines: string[]) => void;
  onAppendRisks?: (lines: string[]) => void;
}) {
  const {
    title,
    context,
    intent,
    options,
    assumptions,
    risks,
    evidence,
    outcome,
    className,
    btnFx,
    onToast,
    onResult,
    onSetIntent,
    onAppendEvidence,
    onAppendAssumptions,
    onAppendRisks,
  } = props;

  const [model, setModel] = useState<string>(DEFAULT_SAFE_MODEL);
  const [temperature, setTemperature] = useState<number>(0.2);
  const [maxTokens, setMaxTokens] = useState<number>(900);

  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<CriticResponse | null>(null);
  const [error, setError] = useState<string>("");

  const [appliedPulse, setAppliedPulse] = useState<string>("");

  // Check if there's enough input to run critic
  const hasInput = Boolean(
    title.trim() || context.trim() || intent.trim()
  );

  const snapshot: CriticRequest = useMemo(
    () => ({
      title,
      context,
      intent,
      options,
      assumptions,
      risks,
      evidence,
      outcome,
      model,
      temperature,
      maxTokens,
    }),
    [title, context, intent, options, assumptions, risks, evidence, outcome, model, temperature, maxTokens]
  );

  function pulse(tag: string) {
    setAppliedPulse(tag);
    window.setTimeout(() => setAppliedPulse(""), 900);
  }

  function fx(extra = "") {
    return btnFx ? btnFx(extra) : extra;
  }

  function commitResult(next: CriticResponse | null) {
    setResp(next);
    onResult?.(next);
  }

  function normalizeResponse(data: unknown): CriticResponse | null {
    if (!isRecord(data)) return null;

    const nowISO = new Date().toISOString();

    // If backend returns { result: {...} }
    const root = isRecord((data as any).result) ? ((data as any).result as Record<string, unknown>) : (data as any);

    const hardEdgesMissing = Array.isArray(root.hardEdgesMissing) ? (root.hardEdgesMissing as any[]) : [];
    const genericLanguage = Array.isArray(root.genericLanguage) ? (root.genericLanguage as any[]) : [];
    const blindSpots = Array.isArray(root.blindSpots) ? (root.blindSpots as any[]) : [];
    const nextActions = Array.isArray(root.nextActions) ? (root.nextActions as any[]) : [];
    const clarificationQuestions = Array.isArray(root.clarificationQuestions) ? (root.clarificationQuestions as any[]) : [];

    const meta = isRecord(root.meta) ? (root.meta as any) : null;
    if (
      !meta ||
      typeof meta.requestId !== "string" ||
      typeof meta.modelUsed !== "string" ||
      typeof meta.latencyMs !== "number"
    ) {
      return null;
    }

    const createdAtISO = typeof root.createdAtISO === "string" ? root.createdAtISO : nowISO;

    return {
      createdAtISO,
      hardEdgesMissing: hardEdgesMissing.map((x) => ({
        missing: String(x?.missing ?? "").trim(),
        suggestedMetrics: Array.isArray(x?.suggestedMetrics) ? x.suggestedMetrics.map((m: any) => String(m)) : [],
        whereToAdd: (x?.whereToAdd as any) || "evidence",
      })),
      genericLanguage: genericLanguage.map((x) => ({
        phrase: String(x?.phrase ?? "").trim(),
        whyGeneric: String(x?.whyGeneric ?? "").trim(),
        rewriteConcrete: String(x?.rewriteConcrete ?? "").trim(),
      })),
      blindSpots: blindSpots.map((x) => ({
        blindSpot: String(x?.blindSpot ?? "").trim(),
        whyItMatters: String(x?.whyItMatters ?? "").trim(),
        clarificationQuestions: Array.isArray(x?.clarificationQuestions)
          ? x.clarificationQuestions.map((q: any) => String(q)).filter(Boolean)
          : [],
      })),
      nextActions: nextActions.map((x) => ({
        action: String(x?.action ?? "").trim(),
        why: String(x?.why ?? "").trim(),
        ownerHint: typeof x?.ownerHint === "string" ? x.ownerHint : undefined,
        timebox: typeof x?.timebox === "string" ? x.timebox : undefined,
      })),
      clarificationQuestions: clarificationQuestions.map((q) => String(q)).filter(Boolean),
      meta: {
        requestId: meta.requestId,
        modelUsed: meta.modelUsed,
        latencyMs: meta.latencyMs,
        triedModels: Array.isArray(meta.triedModels) ? meta.triedModels.map((m: any) => String(m)) : undefined,
        fallbackUsed: typeof meta.fallbackUsed === "boolean" ? meta.fallbackUsed : undefined,
      },
      rawText: typeof root.rawText === "string" ? root.rawText : undefined,
    };
  }

  async function runCritic() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gemini/critic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          (isRecord(data) && typeof (data as any).message === "string" && (data as any).message) ||
          (isRecord(data) && typeof (data as any).error === "string" && (data as any).error) ||
          `Critic failed (${res.status})`;
        setError(msg);
        onToast?.(msg);
        return;
      }

      const normalized = normalizeResponse(data);
      if (!normalized) {
        const msg = "Critic response shape invalid.";
        setError(msg);
        onToast?.(msg);
        return;
      }

      commitResult(normalized);
      onToast?.("Gemini Critic finished ✓");
    } catch (e: any) {
      const msg = e?.message ?? "Critic failed.";
      setError(msg);
      onToast?.(msg);
    } finally {
      setLoading(false);
    }
  }

  function clearResult() {
    commitResult(null);
    onToast?.("Gemini Critic cleared");
  }

  const metaLine = resp?.meta
    ? `Model: ${resp.meta.modelUsed} · ${resp.meta.latencyMs}ms · ID: ${resp.meta.requestId.slice(0, 8)}…`
    : "";

  const triedLine =
    resp?.meta?.triedModels && resp.meta.triedModels.length ? `Tried: ${resp.meta.triedModels.join(" → ")}` : "";

  // ---------------- Action helpers ----------------

  async function handleCopy(label: string, text: string) {
    const ok = await copyToClipboard(text);
    onToast?.(ok ? `${label} copied ✓` : `Copy failed (browser blocked clipboard).`);
  }

  function applyIntentRewrite(rewrite: string) {
    const next = String(rewrite || "").trim();
    if (!next) return;

    if (onSetIntent) {
      onSetIntent(next);
      onToast?.("Intent rewritten ✓");
      pulse("intent");
      return;
    }

    void handleCopy("Intent rewrite", next);
  }

  function appendEvidence(lines: string[], label = "Evidence") {
    const clean = uniqLines(lines.map((s) => String(s ?? "").trim()).filter(Boolean));
    if (!clean.length) return;

    if (onAppendEvidence) {
      onAppendEvidence(clean);
      onToast?.(`${label} appended ✓`);
      pulse("evidence");
      return;
    }

    void handleCopy(label, clean.map((s) => `- ${s}`).join("\n"));
  }

  function appendAssumptions(lines: string[], label = "Assumptions") {
    const clean = uniqLines(lines.map((s) => String(s ?? "").trim()).filter(Boolean));
    if (!clean.length) return;

    if (onAppendAssumptions) {
      onAppendAssumptions(clean);
      onToast?.(`${label} appended ✓`);
      pulse("assumptions");
      return;
    }

    void handleCopy(label, clean.map((s) => `- ${s}`).join("\n"));
  }

  function appendRisks(lines: string[], label = "Risks") {
    const clean = uniqLines(lines.map((s) => String(s ?? "").trim()).filter(Boolean));
    if (!clean.length) return;

    if (onAppendRisks) {
      onAppendRisks(clean);
      onToast?.(`${label} appended ✓`);
      pulse("risks");
      return;
    }

    void handleCopy(label, clean.map((s) => `- ${s}`).join("\n"));
  }

  function applyAll() {
    if (!resp) return;

    const firstRewrite = resp.genericLanguage.find((x) => String(x.rewriteConcrete || "").trim())?.rewriteConcrete;
    if (firstRewrite) applyIntentRewrite(firstRewrite);

    const metrics = resp.hardEdgesMissing.flatMap((x) => x.suggestedMetrics || []).slice(0, 10);
    if (metrics.length) appendEvidence(metrics.map((m) => `[metric] ${m}`), "Metrics");

    const qs = resp.clarificationQuestions.slice(0, 12).map((q) => `[clarify] ${q}`);
    if (qs.length) appendAssumptions(qs, "Clarifications");

    const actions = resp.nextActions
      .slice(0, 8)
      .map((a) => {
        const core = String(a.action || "").trim();
        const tb = a.timebox ? ` (timebox: ${a.timebox})` : "";
        const own = a.ownerHint ? ` (owner: ${a.ownerHint})` : "";
        return core ? `[next] ${core}${own}${tb}` : "";
      })
      .filter(Boolean);

    if (actions.length) appendEvidence(actions, "Next actions");

    onToast?.("Applied key critic suggestions ✓");
  }

  const appliedBadge =
    appliedPulse === "intent"
      ? "Intent updated"
      : appliedPulse === "evidence"
      ? "Evidence updated"
      : appliedPulse === "assumptions"
      ? "Assumptions updated"
      : appliedPulse === "risks"
      ? "Risks updated"
      : "";

  return (
    <div className={className}>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Chip label="Gemini Critic" tone={"info" as any} />
              {resp ? (
                <span className="inline-flex items-center justify-center rounded-full bg-blue-500/15 text-blue-400 border border-blue-400/25 px-2.5 py-1 text-[11px] font-semibold tracking-wide">
                  Done ✓
                </span>
              ) : (
                <Chip
                  label={
                    loading 
                      ? "Running…" 
                      : hasInput 
                        ? "Ready" 
                        : "No input"
                  }
                  tone={
                    (loading 
                      ? "warn" 
                      : hasInput 
                        ? "good" 
                        : "bad") as any
                  }
                />
              )}
              {appliedBadge ? <Chip label={appliedBadge} tone={"good" as any} /> : null}
            </div>

            <div className="mt-2 text-[12px] text-white/70">
              Hard edges · Generic language · Blind spots · Next actions (decision-grade).
            </div>

            {metaLine ? <div className="mt-1 text-[11px] text-white/45">{metaLine}</div> : null}
            {triedLine ? <div className="mt-1 text-[11px] text-white/40">{triedLine}</div> : null}
          </div>

          <div className="flex items-center gap-2">
            {resp ? (
              <>
                <Button
                  variant="secondary"
                  onClick={applyAll}
                  disabled={loading}
                  className={fx("")}
                  title="Apply the most useful critic suggestions (uses callbacks if provided, otherwise copies to clipboard)."
                >
                  <Check className="h-4 w-4" /> Apply key fixes
                </Button>

                <Button
                  variant="ghost"
                  onClick={clearResult}
                  disabled={loading}
                  className={fx("")}
                  title="Clear critic result (also clears parent state via onResult)."
                >
                  Clear
                </Button>
              </>
            ) : null}

            {/* ✅ FIX: remove variant="default" because your Button Variant type doesn't include "default" */}
            <Button 
              variant="secondary"
              onClick={runCritic} 
              disabled={loading || !hasInput} 
              className={fx("disabled:opacity-50")} 
              title={hasInput ? "Run Gemini Critic" : "Fill in decision inputs first"}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Running
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" /> Run Critic
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0b0c14]/25 p-3">
            <div className="text-[11px] text-white/55 mb-1">Model</div>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={loading}
              className="w-full bg-transparent text-[13px] text-white/85 outline-none"
            >
              <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
              <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
            </select>
            <div className="mt-1 text-[10px] text-white/40">
              If Pro is rejected on your key, your API route should auto-fallback (and keep the real error if it still
              fails).
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b0c14]/25 p-3">
            <div className="text-[11px] text-white/55 mb-1">Temperature</div>
            <input
              type="number"
              step={0.1}
              min={0}
              max={2}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-[13px] text-white/85 outline-none"
            />
            <div className="mt-1 text-[10px] text-white/40">Lower = stricter, less creative.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b0c14]/25 p-3">
            <div className="text-[11px] text-white/55 mb-1">Max tokens</div>
            <input
              type="number"
              step={50}
              min={256}
              max={4000}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-[13px] text-white/85 outline-none"
            />
            <div className="mt-1 text-[10px] text-white/40">900 is a good demo default.</div>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-3 text-[12px] text-rose-50">
            {error}
          </div>
        ) : null}

        {/* Results */}
        {resp ? (
          <div className="mt-3 space-y-3">
            {/* Hard edges - ✅ Improved header */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[12px] text-white/85 font-medium inline-flex items-center gap-2">
                  <span className="text-base">📏</span>
                  <span>Hard Edges Missing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Chip label={`${resp.hardEdgesMissing.length}`} tone={"neutral" as any} />
                  {resp.hardEdgesMissing.length ? (
                    <Button
                      variant="ghost"
                      disabled={loading}
                      className={fx("")}
                      title="Append suggested metrics to Evidence (or copy if callbacks are not wired)."
                      onClick={() => {
                        const metrics = resp.hardEdgesMissing
                          .flatMap((x) => x.suggestedMetrics || [])
                          .slice(0, 12)
                          .map((m) => `[metric] ${m}`);
                        appendEvidence(metrics, "Metrics");
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add metrics
                    </Button>
                  ) : null}
                </div>
              </div>

              {resp.hardEdgesMissing.length ? (
                <div className="mt-2 space-y-2">
                  {resp.hardEdgesMissing.map((x, i) => {
                    const metrics = (x.suggestedMetrics || []).slice(0, 8);
                    const pack = [
                      `[hard-edge] ${x.missing}${x.whereToAdd ? ` (where: ${x.whereToAdd})` : ""}`,
                      ...metrics.map((m) => `[metric] ${m}`),
                    ].filter(Boolean);

                    return (
                      <div key={i} className="rounded-2xl border border-white/10 bg-[#0b0c14]/25 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[12px] text-white/85 font-medium">{x.missing}</div>
                            <div className="mt-1 text-[11px] text-white/50">
                              Where: <span className="text-white/75 font-medium">{x.whereToAdd}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              className={fx("")}
                              title="Copy this item"
                              onClick={() => void handleCopy("Hard edge item", pack.join("\n"))}
                            >
                              <Copy className="h-4 w-4" /> Copy
                            </Button>
                            <Button
                              variant="secondary"
                              className={fx("")}
                              title="Append into Evidence (or copy if callbacks are not wired)."
                              onClick={() => appendEvidence(pack, "Hard edge")}
                            >
                              <Plus className="h-4 w-4" /> Add to Evidence
                            </Button>
                          </div>
                        </div>

                        {metrics.length ? (
                          <div className="mt-2 text-[11px] text-white/70">
                            Suggested metrics:
                            <ul className="mt-1 list-disc pl-5 text-white/65">
                              {metrics.map((m, j) => (
                                <li key={j}>{m}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-white/50">No missing hard edges detected.</div>
              )}
            </div>

            {/* Generic language - ✅ Improved header */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[12px] text-white/85 font-medium inline-flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>Generic Language</span>
                </div>
                <div className="flex items-center gap-2">
                  <Chip label={`${resp.genericLanguage.length}`} tone={"neutral" as any} />
                  {resp.genericLanguage.some((x) => String(x.rewriteConcrete || "").trim()) ? (
                    <Button
                      variant="ghost"
                      className={fx("")}
                      title="Apply the first concrete rewrite to Intent (or copy if callbacks are not wired)."
                      onClick={() => {
                        const r = resp.genericLanguage.find((x) => String(x.rewriteConcrete || "").trim());
                        if (r?.rewriteConcrete) applyIntentRewrite(r.rewriteConcrete);
                      }}
                    >
                      <ArrowRight className="h-4 w-4" /> Apply rewrite
                    </Button>
                  ) : null}
                </div>
              </div>

              {resp.genericLanguage.length ? (
                <div className="mt-2 space-y-2">
                  {resp.genericLanguage.map((x, i) => {
                    const phrase = String(x.phrase || "").trim();
                    const why = String(x.whyGeneric || "").trim();
                    const rewrite = String(x.rewriteConcrete || "").trim();

                    return (
                      <div key={i} className="rounded-2xl border border-white/10 bg-[#0b0c14]/25 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[12px] text-white/85 font-medium">“{phrase || "(phrase)"}”</div>
                            {why ? <div className="mt-1 text-[11px] text-white/55">{why}</div> : null}
                          </div>

                          <div className="flex items-center gap-2">
                            {rewrite ? (
                              <>
                                <Button
                                  variant="ghost"
                                  className={fx("")}
                                  title="Copy rewrite"
                                  onClick={() => void handleCopy("Rewrite", rewrite)}
                                >
                                  <Copy className="h-4 w-4" /> Copy
                                </Button>
                                <Button
                                  variant="secondary"
                                  className={fx("")}
                                  title="Apply to Intent (or copy if callbacks are not wired)."
                                  onClick={() => applyIntentRewrite(rewrite)}
                                >
                                  <ArrowRight className="h-4 w-4" /> Apply
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                className={fx("")}
                                title="Copy phrase"
                                onClick={() => void handleCopy("Phrase", phrase)}
                              >
                                <Copy className="h-4 w-4" /> Copy
                              </Button>
                            )}
                          </div>
                        </div>

                        {rewrite ? (
                          <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-2">
                            <div className="text-[11px] text-white/55">Concrete rewrite</div>
                            <div className="mt-1 text-[12px] text-white/80 whitespace-pre-wrap">{rewrite}</div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-white/50">No generic language detected.</div>
              )}
            </div>

            {/* Blind spots - ✅ Improved header */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[12px] text-white/85 font-medium inline-flex items-center gap-2">
                  <span className="text-base">🕳️</span>
                  <span>Blind Spots</span>
                </div>
                <div className="flex items-center gap-2">
                  <Chip label={`${resp.blindSpots.length}`} tone={"neutral" as any} />
                  {resp.blindSpots.some((x) => (x.clarificationQuestions || []).length) ? (
                    <Button
                      variant="ghost"
                      className={fx("")}
                      title="Append top clarification questions to Assumptions (or copy if callbacks are not wired)."
                      onClick={() => {
                        const qs = resp.blindSpots
                          .flatMap((x) => x.clarificationQuestions || [])
                          .slice(0, 12)
                          .map((q) => `[clarify] ${q}`);
                        appendAssumptions(qs, "Clarifications");
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add questions
                    </Button>
                  ) : null}
                </div>
              </div>

              {resp.blindSpots.length ? (
                <div className="mt-2 space-y-2">
                  {resp.blindSpots.map((x, i) => {
                    const qs = (x.clarificationQuestions || []).slice(0, 10);
                    const pack = [
                      `[blind-spot] ${String(x.blindSpot || "").trim()}`,
                      x.whyItMatters ? `[why] ${String(x.whyItMatters).trim()}` : "",
                      ...qs.map((q) => `[clarify] ${q}`),
                    ].filter(Boolean);

                    return (
                      <div key={i} className="rounded-2xl border border-white/10 bg-[#0b0c14]/25 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[12px] text-white/85 font-medium">{x.blindSpot}</div>
                            {x.whyItMatters ? (
                              <div className="mt-1 text-[11px] text-white/55">{x.whyItMatters}</div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              className={fx("")}
                              title="Copy this blind spot block"
                              onClick={() => void handleCopy("Blind spot", pack.join("\n"))}
                            >
                              <Copy className="h-4 w-4" /> Copy
                            </Button>

                            {qs.length ? (
                              <>
                                <Button
                                  variant="secondary"
                                  className={fx("")}
                                  title="Append questions to Assumptions (or copy if callbacks are not wired)."
                                  onClick={() => appendAssumptions(qs.map((q) => `[clarify] ${q}`), "Clarifications")}
                                >
                                  <Plus className="h-4 w-4" /> To Assumptions
                                </Button>
                                <Button
                                  variant="secondary"
                                  className={fx("")}
                                  title="Append as Risks (when questions represent failure modes)."
                                  onClick={() => appendRisks(qs.map((q) => `[clarify] ${q}`), "Clarifications")}
                                >
                                  <Plus className="h-4 w-4" /> To Risks
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {qs.length ? (
                          <div className="mt-2 text-[11px] text-white/70">
                            Sharp questions:
                            <ul className="mt-1 list-disc pl-5 text-white/65">
                              {qs.map((q, j) => (
                                <li key={j}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-white/50">No blind spots detected.</div>
              )}
            </div>

            {/* Next actions - ✅ Improved with emoji header */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[12px] text-white/85 font-medium inline-flex items-center gap-2">
                  <span className="text-base">✅</span>
                  <span>Next Actions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Chip label={`${resp.nextActions.length}`} tone={"neutral" as any} />
                  {resp.nextActions.length ? (
                    <Button
                      variant="ghost"
                      className={fx("")}
                      title="Append next actions into Evidence (or copy if callbacks are not wired)."
                      onClick={() => {
                        const lines = resp.nextActions
                          .slice(0, 10)
                          .map((a) => {
                            const core = String(a.action || "").trim();
                            const tb = a.timebox ? ` (timebox: ${a.timebox})` : "";
                            const own = a.ownerHint ? ` (owner: ${a.ownerHint})` : "";
                            return core ? `[next] ${core}${own}${tb}` : "";
                          })
                          .filter(Boolean);
                        appendEvidence(lines, "Next actions");
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add actions
                    </Button>
                  ) : null}
                </div>
              </div>

              {resp.nextActions.length ? (
                <div className="mt-2 space-y-2">
                  {resp.nextActions.map((x, i) => {
                    const line =
                      `[next] ${String(x.action || "").trim()}` +
                      (x.ownerHint ? ` (owner: ${x.ownerHint})` : "") +
                      (x.timebox ? ` (timebox: ${x.timebox})` : "");

                    const pack = [
                      line,
                      x.why ? `[why] ${String(x.why).trim()}` : "",
                      x.ownerHint ? `[owner] ${String(x.ownerHint).trim()}` : "",
                      x.timebox ? `[timebox] ${String(x.timebox).trim()}` : "",
                    ].filter(Boolean);

                    return (
                      <div key={i} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            {/* ✅ Action with number badge */}
                            <div className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                                {i + 1}
                              </span>
                              <div className="text-[12px] text-white/90 font-medium leading-relaxed">{x.action}</div>
                            </div>
                            {x.why ? (
                              <div className="mt-2 ml-7 text-[11px] text-white/55 italic border-l-2 border-white/10 pl-2">
                                {x.why}
                              </div>
                            ) : null}
                            {(x.ownerHint || x.timebox) ? (
                              <div className="mt-2 ml-7 flex flex-wrap gap-2">
                                {x.ownerHint ? <Chip label={`👤 ${x.ownerHint}`} tone={"neutral" as any} /> : null}
                                {x.timebox ? <Chip label={`⏱️ ${x.timebox}`} tone={"neutral" as any} /> : null}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              className={fx("px-2 py-1")}
                              title="Copy action block"
                              onClick={() => void handleCopy("Next action", pack.join("\n"))}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="secondary"
                              className={fx("px-2 py-1")}
                              title="Append to Evidence (or copy if callbacks are not wired)."
                              onClick={() => appendEvidence([line], "Next action")}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-white/50">No next actions returned.</div>
              )}
            </div>

            {/* Clarification Qs - ✅ Improved header */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[12px] text-white/85 font-medium inline-flex items-center gap-2">
                  <span className="text-base">❓</span>
                  <span>Clarification Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Chip label={`${resp.clarificationQuestions.length}`} tone={"neutral" as any} />
                  {resp.clarificationQuestions.length ? (
                    <>
                      <Button
                        variant="ghost"
                        className={fx("")}
                        title="Copy questions"
                        onClick={() =>
                          void handleCopy(
                            "Clarification questions",
                            resp.clarificationQuestions.map((q) => `- ${q}`).join("\n")
                          )
                        }
                      >
                        <Copy className="h-4 w-4" /> Copy
                      </Button>
                      <Button
                        variant="secondary"
                        className={fx("")}
                        title="Append questions to Assumptions (or copy if callbacks are not wired)."
                        onClick={() =>
                          appendAssumptions(resp.clarificationQuestions.map((q) => `[clarify] ${q}`), "Clarifications")
                        }
                      >
                        <Plus className="h-4 w-4" /> To Assumptions
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {resp.clarificationQuestions.length ? (
                <div className="mt-2 rounded-2xl border border-white/10 bg-[#0b0c14]/25 p-3 pointer-events-none opacity-90">
                  <Textarea
                    rows={Math.min(10, Math.max(4, resp.clarificationQuestions.length))}
                    value={resp.clarificationQuestions.map((q) => `- ${q}`).join("\n")}
                    onChange={() => {}}
                  />
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-white/50">No clarification questions returned.</div>
              )}
            </div>

            {/* Raw debug - ✅ Better formatted display with clear sections */}
            {resp.rawText ? (
              <motion.details
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <summary className="cursor-pointer text-[12px] font-semibold text-white/80 hover:text-white/95 transition-colors flex items-center gap-2">
                  <span className="text-base">📄</span>
                  <span>Raw Model Text (Debug)</span>
                </summary>
                <div className="mt-3 space-y-4">
                  {(() => {
                    const rawText = resp.rawText || "";
                    
                    // Try to detect if there's both JSON and NEXT ACTIONS
                    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/);
                    const jsonEndIndex = rawText.lastIndexOf("}");
                    const nextActionsIndex = rawText.search(/NEXT\s*ACTIONS/i);
                    
                    // Extract JSON part (either from code block or raw)
                    let jsonPart = "";
                    let afterJsonContent = "";
                    
                    if (jsonMatch) {
                      jsonPart = jsonMatch[1].trim();
                      const afterMatch = rawText.slice(rawText.indexOf("```", rawText.indexOf("```json") + 7) + 3);
                      afterJsonContent = afterMatch.trim();
                    } else if (rawText.trim().startsWith("{") && jsonEndIndex > 0) {
                      jsonPart = rawText.slice(0, jsonEndIndex + 1).trim();
                      afterJsonContent = rawText.slice(jsonEndIndex + 1).trim();
                    }
                    
                    const hasJsonPart = jsonPart.length > 0;
                    const hasNextActions = nextActionsIndex > 0 || afterJsonContent.search(/NEXT\s*ACTIONS/i) >= 0;
                    
                    // Clean up NEXT ACTIONS content - remove duplicate headers
                    let nextActionsContent = afterJsonContent;
                    if (hasNextActions) {
                      // Remove duplicate "NEXT ACTIONS" text and emojis at the start
                      nextActionsContent = afterJsonContent
                        .replace(/^[\s\n]*NEXT\s*ACTIONS[\s\n]*/i, "")
                        .replace(/^[\s\n]*✅\s*NEXT\s*ACTIONS[\s\n]*/i, "")
                        .replace(/^[\s\n]*☑️\s*NEXT\s*ACTIONS[\s\n]*/i, "")
                        .trim();
                    }
                    
                    // Parse JSON for pretty printing
                    let parsedJson: any = null;
                    if (hasJsonPart) {
                      try {
                        parsedJson = JSON.parse(jsonPart);
                      } catch {}
                    }
                    
                    // If we have both JSON and Next Actions
                    if (hasJsonPart && hasNextActions && nextActionsContent.length > 0) {
                      return (
                        <>
                          {/* JSON Section */}
                          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-cyan-500/10">
                              <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                                <span>📋</span> JSON Response
                              </span>
                              <Button
                                variant="ghost"
                                className="px-2 py-1 h-auto text-[10px] hover:bg-cyan-500/10"
                                onClick={() => {
                                  const text = parsedJson ? JSON.stringify(parsedJson, null, 2) : jsonPart;
                                  navigator.clipboard.writeText(text);
                                  onToast?.("JSON copied ✓");
                                }}
                              >
                                <Copy className="h-3 w-3 mr-1" /> Copy
                              </Button>
                            </div>
                            <pre className="whitespace-pre-wrap break-words text-[10px] text-cyan-300/70 leading-relaxed font-mono overflow-auto max-h-[180px] scrollbar-thin">
                              {parsedJson ? JSON.stringify(parsedJson, null, 2) : jsonPart}
                            </pre>
                          </div>
                          
                          {/* Visual Divider */}
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex-1 border-t border-white/10" />
                            <span className="text-[9px] text-white/30 uppercase tracking-wider">separator</span>
                            <div className="flex-1 border-t border-white/10" />
                          </div>
                          
                          {/* NEXT ACTIONS Section */}
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-emerald-500/10">
                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                                <span>✅</span> Next Actions
                              </span>
                              <Button
                                variant="ghost"
                                className="px-2 py-1 h-auto text-[10px] hover:bg-emerald-500/10"
                                onClick={() => {
                                  navigator.clipboard.writeText(nextActionsContent);
                                  onToast?.("Next Actions copied ✓");
                                }}
                              >
                                <Copy className="h-3 w-3 mr-1" /> Copy
                              </Button>
                            </div>
                            <pre className="whitespace-pre-wrap break-words text-[10px] text-white/60 leading-relaxed font-mono overflow-auto max-h-[180px] scrollbar-thin">
                              {nextActionsContent}
                            </pre>
                          </div>
                        </>
                      );
                    }
                    
                    // Only JSON (no NEXT ACTIONS)
                    if (hasJsonPart) {
                      return (
                        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-cyan-500/10">
                            <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                              <span>📋</span> JSON Response
                            </span>
                            <Button
                              variant="ghost"
                              className="px-2 py-1 h-auto text-[10px] hover:bg-cyan-500/10"
                              onClick={() => {
                                const text = parsedJson ? JSON.stringify(parsedJson, null, 2) : jsonPart;
                                navigator.clipboard.writeText(text);
                                onToast?.("Copied ✓");
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" /> Copy
                            </Button>
                          </div>
                          <pre className="whitespace-pre-wrap break-words text-[10px] text-cyan-300/70 leading-relaxed font-mono overflow-auto max-h-[250px] scrollbar-thin">
                            {parsedJson ? JSON.stringify(parsedJson, null, 2) : jsonPart}
                          </pre>
                        </div>
                      );
                    }
                    
                    // Try to parse entire text as JSON
                    try {
                      const parsed = JSON.parse(rawText);
                      return (
                        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-cyan-500/10">
                            <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                              <span>📋</span> JSON Response
                            </span>
                            <Button
                              variant="ghost"
                              className="px-2 py-1 h-auto text-[10px] hover:bg-cyan-500/10"
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
                                onToast?.("Copied ✓");
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" /> Copy
                            </Button>
                          </div>
                          <pre className="whitespace-pre-wrap break-words text-[10px] text-cyan-300/70 leading-relaxed font-mono overflow-auto max-h-[250px] scrollbar-thin">
                            {JSON.stringify(parsed, null, 2)}
                          </pre>
                        </div>
                      );
                    } catch {
                      // Not JSON, show as plain text with sections if possible
                      const sections: { title: string; emoji: string; content: string; color: string }[] = [];
                      
                      // Try to detect sections in plain text
                      const lines = rawText.split("\n");
                      let currentSection = { title: "Raw Output", emoji: "📝", content: "", color: "white" };
                      
                      for (const line of lines) {
                        const trimmed = line.trim();
                        
                        // Detect section headers
                        if (/^(NEXT\s*ACTIONS|✅\s*NEXT\s*ACTIONS)/i.test(trimmed)) {
                          if (currentSection.content.trim()) {
                            sections.push({ ...currentSection });
                          }
                          currentSection = { title: "Next Actions", emoji: "✅", content: "", color: "emerald" };
                          continue;
                        }
                        if (/^(HARD\s*EDGES|📊\s*HARD\s*EDGES)/i.test(trimmed)) {
                          if (currentSection.content.trim()) {
                            sections.push({ ...currentSection });
                          }
                          currentSection = { title: "Hard Edges", emoji: "📊", content: "", color: "amber" };
                          continue;
                        }
                        if (/^(BLIND\s*SPOTS|👁\s*BLIND\s*SPOTS)/i.test(trimmed)) {
                          if (currentSection.content.trim()) {
                            sections.push({ ...currentSection });
                          }
                          currentSection = { title: "Blind Spots", emoji: "👁️", content: "", color: "rose" };
                          continue;
                        }
                        
                        currentSection.content += line + "\n";
                      }
                      
                      // Push last section
                      if (currentSection.content.trim()) {
                        sections.push(currentSection);
                      }
                      
                      // If we found multiple sections, render them separately
                      if (sections.length > 1) {
                        return (
                          <>
                            {sections.map((section, idx) => (
                              <React.Fragment key={idx}>
                                {idx > 0 && (
                                  <div className="flex items-center gap-3 py-1">
                                    <div className="flex-1 border-t border-white/10" />
                                    <span className="text-[9px] text-white/30 uppercase tracking-wider">separator</span>
                                    <div className="flex-1 border-t border-white/10" />
                                  </div>
                                )}
                                <div className={`rounded-xl border p-3 ${
                                  section.color === "emerald" ? "border-emerald-500/20 bg-emerald-500/5" :
                                  section.color === "amber" ? "border-amber-500/20 bg-amber-500/5" :
                                  section.color === "rose" ? "border-rose-500/20 bg-rose-500/5" :
                                  "border-white/10 bg-white/5"
                                }`}>
                                  <div className={`flex items-center justify-between mb-2 pb-2 border-b ${
                                    section.color === "emerald" ? "border-emerald-500/10" :
                                    section.color === "amber" ? "border-amber-500/10" :
                                    section.color === "rose" ? "border-rose-500/10" :
                                    "border-white/10"
                                  }`}>
                                    <span className={`text-[11px] font-bold flex items-center gap-1.5 ${
                                      section.color === "emerald" ? "text-emerald-400" :
                                      section.color === "amber" ? "text-amber-400" :
                                      section.color === "rose" ? "text-rose-400" :
                                      "text-white/70"
                                    }`}>
                                      <span>{section.emoji}</span> {section.title}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      className="px-2 py-1 h-auto text-[10px]"
                                      onClick={() => {
                                        navigator.clipboard.writeText(section.content.trim());
                                        onToast?.(`${section.title} copied ✓`);
                                      }}
                                    >
                                      <Copy className="h-3 w-3 mr-1" /> Copy
                                    </Button>
                                  </div>
                                  <pre className={`whitespace-pre-wrap break-words text-[10px] leading-relaxed font-mono overflow-auto max-h-[180px] scrollbar-thin ${
                                    section.color === "emerald" ? "text-emerald-300/70" :
                                    section.color === "amber" ? "text-amber-300/70" :
                                    section.color === "rose" ? "text-rose-300/70" :
                                    "text-white/60"
                                  }`}>
                                    {section.content.trim()}
                                  </pre>
                                </div>
                              </React.Fragment>
                            ))}
                          </>
                        );
                      }
                      
                      // Fallback: single raw text block
                      return (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                            <span className="text-[11px] font-bold text-white/70 flex items-center gap-1.5">
                              <span>📝</span> Raw Text
                            </span>
                            <Button
                              variant="ghost"
                              className="px-2 py-1 h-auto text-[10px]"
                              onClick={() => {
                                navigator.clipboard.writeText(rawText);
                                onToast?.("Copied ✓");
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" /> Copy
                            </Button>
                          </div>
                          <pre className="whitespace-pre-wrap break-words text-[10px] text-white/60 leading-relaxed font-mono overflow-auto max-h-[250px] scrollbar-thin">
                            {rawText}
                          </pre>
                        </div>
                      );
                    }
                  })()}
                </div>
              </motion.details>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 text-[11px] text-white/45">
            Tip: run this after you fill the decision inputs. It surfaces decision-grade gaps fast.
          </div>
        )}

        <div className="mt-3 text-[10px] text-white/35">
          Action buttons will mutate your form only if you pass: onSetIntent / onAppendEvidence / onAppendAssumptions /
          onAppendRisks. Otherwise they fall back to “Copy”.
        </div>
      </div>
    </div>
  );
}
