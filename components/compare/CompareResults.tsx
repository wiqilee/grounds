// components/compare/CompareResults.tsx
"use client";

import React, { useMemo } from "react";
import type { ProviderId } from "@/lib/providers/types";
import { ProviderRow, type ProviderRowResult } from "@/components/compare/ProviderRow";

export type ProviderUIConfig = {
  id: ProviderId;
  label: string;
  subtitle?: string;
  modelOptions: Array<{ value: string; label: string }>;
};

export type CompareResultsProps = {
  configs: ProviderUIConfig[];

  enabled: Partial<Record<ProviderId, boolean>>;
  models: Partial<Record<ProviderId, string>>;

  results: ProviderRowResult[]; // normalized results array
  loading?: boolean;

  pinnedProvider?: ProviderId | null;

  onToggleEnabled?: (id: ProviderId, next: boolean) => void;
  onChangeModel?: (id: ProviderId, next: string) => void;

  onPin?: (id: ProviderId) => void;
  onRetryProvider?: (id: ProviderId) => void;
};

type Tone = "good" | "warn" | "bad" | "neutral";

function isEnabled(enabled: Partial<Record<ProviderId, boolean>>, id: ProviderId) {
  return enabled[id] === undefined ? true : Boolean(enabled[id]);
}

function safeText(x: unknown) {
  return typeof x === "string" ? x : "";
}

function hasUsableOutput(r?: ProviderRowResult | null) {
  return Boolean(r && r.ok && safeText(r.text).trim().length > 0);
}

function providerEmoji(id: ProviderId) {
  switch (id) {
    case "google":
      return "✨";
    case "openai":
      return "🧠";
    case "openrouter":
      return "🧭";
    case "groq":
      return "⚡";
    default:
      return "🔹";
  }
}

function providerLabel(id: ProviderId) {
  switch (id) {
    case "google":
      return "Google";
    case "openai":
      return "OpenAI";
    case "openrouter":
      return "OpenRouter";
    case "groq":
      return "Groq";
    default:
      return String(id);
  }
}

function toneFromResult(r?: ProviderRowResult | null): Tone {
  if (!r) return "neutral";
  if (r.ok && hasUsableOutput(r)) return "good";
  if (!r.ok && r.error?.message) return "bad";
  return "warn";
}

function pillClass(t: Tone) {
  // Theme-friendly: keep semantic colors but avoid “white-only” text so Light mode stays readable.
  switch (t) {
    case "good":
      return "border-emerald-400/30 bg-emerald-400/10 text-[color:rgb(var(--fg))]";
    case "warn":
      return "border-amber-400/30 bg-amber-400/10 text-[color:rgb(var(--fg))]";
    case "bad":
      return "border-rose-400/30 bg-rose-400/10 text-[color:rgb(var(--fg))]";
    default:
      return "border-[color:rgba(var(--fg),0.14)] bg-[color:rgba(var(--fg),0.04)] text-[color:rgba(var(--fg),0.78)]";
  }
}

function MiniPill({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: Tone;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-none",
        "backdrop-blur-sm",
        "motion-safe:transition-colors motion-safe:duration-200",
        pillClass(tone),
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function pickWinner(results: ProviderRowResult[], pinned?: ProviderId | null, enabled?: Partial<Record<ProviderId, boolean>>): ProviderId | null {
  // Only consider results from enabled providers
  const enabledResults = enabled 
    ? results.filter((r) => isEnabled(enabled, r.provider as ProviderId))
    : results;
  
  const byId = new Map<ProviderId, ProviderRowResult>();
  for (const r of enabledResults) byId.set(r.provider as ProviderId, r);

  // pinned wins if usable
  if (pinned) {
    const r = byId.get(pinned);
    if (hasUsableOutput(r)) return pinned;
  }

  const usable = enabledResults.filter(hasUsableOutput);
  if (!usable.length) return null;

  // Prefer highest score if present, otherwise lowest latency among usable.
  // (Score is optional; this keeps behavior stable even if some providers don’t return it.)
  usable.sort((a, b) => {
    const sa = typeof (a as any).score === "number" ? (a as any).score : -1;
    const sb = typeof (b as any).score === "number" ? (b as any).score : -1;
    if (sa !== sb) return sb - sa;

    const la = typeof a.latencyMs === "number" ? a.latencyMs : Number.MAX_SAFE_INTEGER;
    const lb = typeof b.latencyMs === "number" ? b.latencyMs : Number.MAX_SAFE_INTEGER;
    return la - lb;
  });

  return (usable[0]?.provider as ProviderId) ?? null;
}

function orderProviders(args: {
  configs: ProviderUIConfig[];
  enabled: Partial<Record<ProviderId, boolean>>;
  resultsById: Map<ProviderId, ProviderRowResult | null>;
  winner: ProviderId | null;
  pinned?: ProviderId | null;
}) {
  const { configs, enabled, resultsById, winner, pinned } = args;

  const score = (id: ProviderId) => {
    const r = resultsById.get(id) ?? null;
    const usable = hasUsableOutput(r);
    const hasErr = Boolean(r && (!r.ok || r.error?.message));
    const en = isEnabled(enabled, id);

    if (pinned && id === pinned) return 0;
    if (winner && id === winner && id !== pinned) return 1;

    // Featured provider emphasis (when nothing is pinned)
    if (!pinned && !winner && id === "google") return 2;

    if (en && usable) return 3;
    if (en && (hasErr || r)) return 4;
    if (en && !r) return 4;
    return 5;
  };

  return [...configs].sort((a, b) => {
    const sa = score(a.id);
    const sb = score(b.id);
    if (sa !== sb) return sa - sb;

    // stable tie-breakers
    if (a.id === "google" && b.id !== "google") return -1;
    if (a.id !== "google" && b.id === "google") return 1;

    return a.label.localeCompare(b.label);
  });
}

export function CompareResults(props: CompareResultsProps) {
  const {
    configs,
    enabled,
    models,
    results,
    loading,
    pinnedProvider,
    onToggleEnabled,
    onChangeModel,
    onPin,
    onRetryProvider,
  } = props;

  const winner = useMemo(() => pickWinner(results, pinnedProvider, enabled), [results, pinnedProvider, enabled]);

  const resultByProvider = useMemo(() => {
    const m = new Map<ProviderId, ProviderRowResult | null>();
    for (const cfg of configs) m.set(cfg.id, null);
    for (const r of results) m.set(r.provider as ProviderId, r);
    return m;
  }, [configs, results]);

  const orderedConfigs = useMemo(() => {
    return orderProviders({
      configs,
      enabled,
      resultsById: resultByProvider,
      winner,
      pinned: pinnedProvider ?? null,
    });
  }, [configs, enabled, resultByProvider, winner, pinnedProvider]);

  const summary = useMemo(() => {
    const enabledCount = configs.filter((c) => isEnabled(enabled, c.id)).length;
    
    // Only count results from enabled providers
    const enabledResults = results.filter((r) => isEnabled(enabled, r.provider as ProviderId));

    const okCount = enabledResults.filter((r) => r.ok && hasUsableOutput(r)).length;
    const issueCount = enabledResults.filter(
      (r) => !r.ok || Boolean(r.error?.message) || (r.ok && !hasUsableOutput(r))
    ).length;

    const googleRes = resultByProvider.get("google") ?? null;
    const googleTone = toneFromResult(googleRes);

    return {
      enabledCount,
      okCount,
      issueCount,
      googleTone,
      googleHasOutput: Boolean(googleRes && googleRes.ok && hasUsableOutput(googleRes)),
    };
  }, [configs, enabled, results, resultByProvider]);

  const showEmpty = !loading && (!results || results.length === 0);

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div
        className={[
          "rounded-2xl border bg-[color:rgba(var(--fg),0.03)] px-4 py-3",
          "border-[color:rgba(var(--fg),0.12)]",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
          "motion-safe:transition-colors motion-safe:duration-200",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold tracking-tight text-[color:rgba(var(--fg),0.92)]">
                Provider compare
              </div>

              {pinnedProvider ? (
                <MiniPill tone="neutral" title="Pinned provider is always shown first">
                  📌 Pinned: {providerLabel(pinnedProvider)}
                </MiniPill>
              ) : null}

              {winner ? (
                <MiniPill tone="good" title="Winner is chosen among usable outputs (or pinned if usable)">
                  🏆 Winner: {providerLabel(winner)}
                </MiniPill>
              ) : (
                <MiniPill tone="neutral" title="Run compare to see structured outputs">
                  🧪 Waiting for results
                </MiniPill>
              )}

              <MiniPill tone={summary.googleTone} title="Google should be healthy and decision-grade">
                ✨ Google:{" "}
                {summary.googleHasOutput
                  ? "ready"
                  : summary.googleTone === "bad"
                    ? "error"
                    : summary.googleTone === "warn"
                      ? "check"
                      : "idle"}
              </MiniPill>
            </div>

            <div className="mt-1 text-xs text-[color:rgba(var(--fg),0.62)]">
              Clear headings + bullets + enough depth makes the output easier to act on (and scores higher).
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <MiniPill tone="neutral" title="How many providers are enabled for compare">
              ✅ Enabled: {summary.enabledCount}
            </MiniPill>
            <MiniPill tone={summary.okCount > 0 ? "good" : "neutral"} title="Providers with usable output">
              ✅ OK: {summary.okCount}
            </MiniPill>
            <MiniPill tone={summary.issueCount > 0 ? "warn" : "neutral"} title="Errors or empty outputs">
              ⚠️ Issues: {summary.issueCount}
            </MiniPill>
          </div>
        </div>

        {loading ? (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[color:rgba(var(--fg),0.10)]">
            <div className="h-full w-[45%] motion-safe:animate-pulse rounded-full bg-[color:rgba(var(--fg),0.18)]" />
          </div>
        ) : null}
      </div>

      {/* Empty state */}
      {showEmpty ? (
        <div className="rounded-2xl border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.02)] p-5 text-sm text-[color:rgba(var(--fg),0.72)]">
          <div className="flex items-start gap-3">
            <div className="text-xl">🧪</div>
            <div className="min-w-0">
              <div className="font-semibold text-[color:rgba(var(--fg),0.88)]">No results yet</div>
              <div className="mt-1 text-xs text-[color:rgba(var(--fg),0.62)]">
                Run compare to see outputs from each provider in a consistent layout.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Rows — only show enabled providers */}
      <div className="space-y-3">
        {orderedConfigs.filter((cfg) => isEnabled(enabled, cfg.id)).map((cfg) => {
          const id = cfg.id;
          const en = true; // guaranteed enabled by filter above
          const model = (models[id] || cfg.modelOptions[0]?.value || "").trim();
          const res = resultByProvider.get(id) ?? null;

          const subtitle =
            id === "google"
              ? cfg.subtitle
                ? `Featured • ${cfg.subtitle}`
                : "Featured • Gemini (hackathon)"
              : cfg.subtitle;

          const tone = toneFromResult(res);

          const isPinned = Boolean(pinnedProvider && pinnedProvider === id);
          const isWinner = Boolean(winner && winner === id);

          const wrapperRing = isWinner
            ? "ring-1 ring-emerald-400/25"
            : isPinned
              ? "ring-1 ring-[color:rgba(var(--fg),0.16)]"
              : !pinnedProvider && !winner && id === "google"
                ? "ring-1 ring-sky-400/20"
                : "";

          return (
            <div
              key={id}
              className={[
                "relative rounded-2xl",
                wrapperRing,
                "motion-safe:transition-shadow motion-safe:duration-200",
              ].join(" ")}
            >
              {/* Compact label line */}
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[color:rgba(var(--fg),0.62)]">
                  <span aria-hidden="true">{providerEmoji(id)}</span>
                  <span className="font-medium text-[color:rgba(var(--fg),0.78)]">{cfg.label}</span>
                  {isWinner ? <span className="text-emerald-500/90">• Winner</span> : null}
                  {isPinned ? <span className="text-[color:rgba(var(--fg),0.72)]">• Pinned</span> : null}
                  {!en ? <span className="text-[color:rgba(var(--fg),0.52)]">• Disabled</span> : null}
                  {!pinnedProvider && !winner && id === "google" ? (
                    <span className="text-sky-400/90">• Featured</span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {res ? (
                    <MiniPill tone={tone} title={res.error?.message || undefined}>
                      {res.ok && hasUsableOutput(res) ? "✅ OK" : res.error?.message ? "⚠️ Issue" : "🟡 Check"}
                    </MiniPill>
                  ) : loading && en ? (
                    <MiniPill tone="neutral">⏳ Running…</MiniPill>
                  ) : null}
                </div>
              </div>

              <ProviderRow
                id={id}
                label={cfg.label}
                subtitle={subtitle}
                enabled={en}
                model={model}
                modelOptions={cfg.modelOptions}
                result={res}
                pinned={isPinned}
                winner={isWinner}
                loading={loading}
                onToggleEnabled={(next) => onToggleEnabled?.(id, next)}
                onChangeModel={(next) => onChangeModel?.(id, next)}
                onPin={() => onPin?.(id)}
                onRetry={() => onRetryProvider?.(id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
