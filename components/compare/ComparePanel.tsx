// components/compare/ComparePanel.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { ProviderId } from "@/lib/providers/types";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CompareResults, type ProviderUIConfig } from "@/components/compare/CompareResults";
import type { ProviderRowResult } from "@/components/compare/ProviderRow";
import {
  Play,
  Sparkles,
  Zap,
  Pin,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  Star,
  Search,
  BookOpen,
  Loader2,
  ExternalLink,
} from "lucide-react";

type CompareRequest = {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  models?: Partial<Record<ProviderId, string>>;
  enabled?: Partial<Record<ProviderId, boolean>>;
};

type CompareResponse = {
  results: ProviderRowResult[];
};

function hasUsableOutput(r: ProviderRowResult | null | undefined) {
  return Boolean(r && r.ok && (r.text || "").trim().length > 0);
}

function providerLabel(id: ProviderId) {
  switch (id) {
    case "google":
      return "✨ Google (Gemini 3)";
    case "openai":
      return "🧠 OpenAI";
    case "groq":
      return "⚡ Groq";
    case "openrouter":
      return "🧭 OpenRouter";
    default:
      return `🔹 ${String(id)}`;
  }
}

function pickBest(results: ProviderRowResult[], pinned: ProviderId | null): ProviderRowResult | null {
  const byId = new Map<string, ProviderRowResult>();
  for (const r of results) byId.set(r.provider, r);

  // 1) pinned wins if usable
  if (pinned) {
    const pinnedRes = byId.get(pinned) ?? null;
    if (hasUsableOutput(pinnedRes)) return pinnedRes;
  }

  // 2) otherwise choose usable by lowest latency (simple heuristic)
  const usable = results.filter((r) => hasUsableOutput(r));
  if (!usable.length) return null;

  usable.sort((a, b) => {
    const la = typeof a.latencyMs === "number" ? a.latencyMs : Number.MAX_SAFE_INTEGER;
    const lb = typeof b.latencyMs === "number" ? b.latencyMs : Number.MAX_SAFE_INTEGER;
    return la - lb;
  });

  return usable[0] ?? null;
}

function summaryCounts(results: ProviderRowResult[]) {
  const ok = results.filter((r) => r.ok && hasUsableOutput(r)).length;
  const fail = results.filter(
    (r) => !r.ok || Boolean(r.error?.message) || (r.ok && !hasUsableOutput(r))
  ).length;
  return { ok, fail, total: results.length };
}

export function ComparePanel(props: {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  configs?: ProviderUIConfig[];
  onToast?: (msg: string) => void;
  onUseBest?: (args: { provider: string; model: string; text: string; raw?: any }) => void;
  className?: string;
}) {
  const {
    system,
    prompt,
    temperature = 0.2,
    maxTokens = 900,
    configs,
    onToast,
    onUseBest,
    className,
  } = props;

  const providerConfigs: ProviderUIConfig[] = useMemo(() => {
    return (
      configs ?? [
        {
          id: "google" as ProviderId,
          label: "Google",
          subtitle: "Gemini 3 spotlight (hackathon) — structured, decision-grade output.",
          modelOptions: [
            { value: "gemini-3-flash-preview", label: "✨ Gemini 3 Flash (preview)" },
            { value: "gemini-3-pro-preview", label: "✨ Gemini 3 Pro (preview)" },
            { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (fallback)" },
          ],
        },
        {
          id: "openai" as ProviderId,
          label: "OpenAI",
          subtitle: "Strong reasoning baseline.",
          modelOptions: [
            { value: "gpt-4o-mini", label: "GPT-4o mini" },
            { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
          ],
        },
        {
          id: "groq" as ProviderId,
          label: "Groq",
          subtitle: "Ultra-low latency inference.",
          modelOptions: [
            { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (instant)" },
            { value: "llama-3.1-70b-versatile", label: "Llama 3.1 70B" },
          ],
        },
        {
          id: "openrouter" as ProviderId,
          label: "OpenRouter",
          subtitle: "Router across multiple providers.",
          modelOptions: [
            { value: "google/gemma-2-9b-it:free", label: "Gemma 2 9B (free)" },
            { value: "meta-llama/llama-3.1-8b-instruct", label: "Llama 3.1 8B Instruct" },
          ],
        },
      ]
    );
  }, [configs]);

  const [enabled, setEnabled] = useState<Partial<Record<ProviderId, boolean>>>(() => {
    const init: Partial<Record<ProviderId, boolean>> = {};
    for (const c of providerConfigs) init[c.id] = true;
    return init;
  });

  const [models, setModels] = useState<Partial<Record<ProviderId, string>>>(() => {
    const init: Partial<Record<ProviderId, string>> = {};
    for (const c of providerConfigs) init[c.id] = c.modelOptions[0]?.value ?? "";
    return init;
  });

  // ✅ Hackathon default: Google is pinned
  const [pinned, setPinned] = useState<ProviderId | null>(() => "google" as ProviderId);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProviderRowResult[]>([]);
  const [error, setError] = useState<string>("");

  // Auto-Research state
  const [autoResearch, setAutoResearch] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchResults, setResearchResults] = useState<{
    success: boolean;
    summary?: string;
    keyFindings?: string[];
    sources?: Array<{ title: string; url: string }>;
    latencyMs?: number;
  } | null>(null);

  async function runCompare(focusProvider?: ProviderId) {
    setLoading(true);
    setError("");

    try {
      const enabledPayload: Partial<Record<ProviderId, boolean>> = { ...enabled };
      if (focusProvider) {
        for (const c of providerConfigs) enabledPayload[c.id] = c.id === focusProvider;
      }

      // Only send enabled providers — disabled ones should never hit the API
      const activeModels: Partial<Record<ProviderId, string>> = {};
      for (const c of providerConfigs) {
        if (enabledPayload[c.id]) {
          activeModels[c.id] = models[c.id] || c.modelOptions[0]?.value || "";
        }
      }

      const body: CompareRequest = {
        system,
        prompt,
        temperature,
        maxTokens,
        models: activeModels,
        enabled: enabledPayload,
      };

      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json().catch(() => null)) as CompareResponse | null;

      if (!res.ok) {
        const msg =
          (data as any)?.message ||
          (data as any)?.error ||
          `Compare failed (${res.status})`;
        setError(String(msg));
        onToast?.(String(msg));
        return;
      }

      const list = Array.isArray(data?.results) ? data!.results : [];
      list.sort((a, b) => String(a.provider).localeCompare(String(b.provider)));
      setResults(list);

      const { ok, fail, total } = summaryCounts(list);
      onToast?.(`Compare finished ✓ (${ok}/${total} ok${fail ? `, ${fail} issues` : ""})`);
    } catch (e: any) {
      const msg = e?.message ?? "Compare request failed.";
      setError(msg);
      onToast?.(msg);
    } finally {
      setLoading(false);
    }
  }

  function useBest() {
    const best = pickBest(results, pinned);
    if (!best) {
      const msg = "Chosen provider has no usable output.";
      setError(msg);
      onToast?.(msg);
      return;
    }

    onUseBest?.({
      provider: best.provider,
      model: best.model,
      text: best.text,
      raw: best.raw,
    });
    onToast?.(`Used best option: ${providerLabel(best.provider as ProviderId)}`);
  }

  const headerStatus = loading ? "Running…" : results.length ? "Ready" : "Idle";
  const headerTone = (loading ? "info" : results.length ? "good" : "neutral") as any;

  const counts = useMemo(() => summaryCounts(results), [results]);
  const pinnedLabel = pinned ? providerLabel(pinned) : "None";

  const bestCandidate = useMemo(() => pickBest(results, pinned), [results, pinned]);
  const canUseBest = Boolean(
    !loading && results.length > 0 && bestCandidate && hasUsableOutput(bestCandidate)
  );

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
        {/* header glow */}
        <div
          aria-hidden="true"
          className={[
            "pointer-events-none absolute -inset-x-10 -top-10 h-40 blur-2xl opacity-70",
            "bg-gradient-to-r from-sky-400/15 via-fuchsia-400/10 to-emerald-400/10",
            loading ? "motion-safe:animate-pulse" : "",
          ].join(" ")}
        />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip label="Compare" tone={"info" as any} />
                <Chip label={headerStatus} tone={headerTone} />

                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                  <Pin className="h-3.5 w-3.5" />
                  <span className="text-white/50">Pinned:</span>
                  <span className="text-white/80">{pinnedLabel}</span>
                </span>

                {results.length ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span className="text-white/50">Run:</span>
                    <span className="text-white/80">
                      {counts.ok}/{counts.total} ok
                      {counts.fail ? ` · ${counts.fail} issues` : ""}
                    </span>
                  </span>
                ) : null}
              </div>

              <div className="mt-2 text-[12px] text-white/60">
                For the hackathon,{" "}
                <span className="text-white/85 font-medium">Google is pinned by default</span>{" "}
                so <span className="text-white/85 font-medium">Gemini 3</span> becomes the
                natural winner when it succeeds.
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="primary" onClick={() => runCompare()} disabled={loading}>
                  <Play className="h-4 w-4" /> Run compare
                </Button>

                <Button variant="secondary" onClick={useBest} disabled={!canUseBest}>
                  <Sparkles className="h-4 w-4" /> Use best option
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => runCompare("google" as ProviderId)}
                  disabled={loading}
                  title="Run only Google (Gemini 3)"
                >
                  <Zap className="h-4 w-4" /> Run Google only
                </Button>

                <Button
                  variant="secondary"
                  onClick={() =>
                    setPinned((prev) =>
                      prev === ("google" as ProviderId) ? null : ("google" as ProviderId)
                    )
                  }
                  disabled={loading}
                  title="Pin / unpin Google"
                >
                  <Star className="h-4 w-4" /> Toggle Google pin
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setResults([]);
                    setError("");
                    setResearchResults(null);
                    onToast?.("Cleared compare results");
                  }}
                  disabled={loading || (!results.length && !error)}
                >
                  <RotateCcw className="h-4 w-4" /> Clear
                </Button>
              </div>
            </div>

            {/* Hackathon side panel */}
            <div className="hidden sm:block w-[260px] rounded-2xl border border-white/10 bg-[#0b0c14]/25 p-3">
              <div className="text-[11px] text-white/55">Hackathon focus</div>
              <div className="mt-1 text-[12px] text-white/80 font-medium">
                Highlight Gemini 3 with structured sections and bullet points so the
                compare score can reach 100.
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[11px] text-sky-50">
                  ✨ Gemini 3
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-50">
                  🏆 Default pinned
                </span>
              </div>

              {/* Auto-Research Toggle */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-purple-400" />
                    <div>
                      <div className="text-[11px] font-medium text-white/80">Auto-Research</div>
                      <div className="text-[9px] text-white/40">Gemini Grounding</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setAutoResearch(!autoResearch)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      autoResearch ? 'bg-purple-500' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoResearch ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                {researchLoading && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-purple-300">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Researching...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Auto-Research Results */}
          {researchResults && researchResults.success && (
            <div className="mt-3 rounded-2xl border border-purple-400/20 bg-purple-500/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-400" />
                  <span className="text-[12px] font-semibold text-purple-200">Research Insights</span>
                  <span className="text-[9px] text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                    {researchResults.latencyMs}ms
                  </span>
                </div>
                <button
                  onClick={() => setResearchResults(null)}
                  className="text-[10px] text-white/40 hover:text-white/60"
                >
                  Dismiss
                </button>
              </div>

              <p className="text-[11px] text-white/70 mb-3 leading-relaxed">
                {researchResults.summary}
              </p>

              {(researchResults.keyFindings?.length ?? 0) > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-semibold text-purple-300 mb-1.5">Key Findings</div>
                  <ul className="space-y-1">
                    {researchResults.keyFindings!.slice(0, 4).map((finding: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-[10px] text-white/60">
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(researchResults.sources?.length ?? 0) > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <div className="text-[9px] text-white/40 mb-1.5">Sources ({researchResults.sources!.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {researchResults.sources!.slice(0, 3).map((source: { title: string; url: string }, i: number) => (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] text-purple-300 hover:text-purple-200 bg-purple-500/10 px-2 py-1 rounded-full"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        {source.title.slice(0, 30)}...
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error ? (
            <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-3 text-[12px] text-rose-50">
              <div className="flex items-center gap-2 font-semibold">
                <TriangleAlert className="h-4 w-4" />
                Compare error
              </div>
              <div className="mt-1 text-rose-100/80">{error}</div>
            </div>
          ) : null}

          <div className="mt-4">
            <CompareResults
              configs={providerConfigs}
              enabled={enabled}
              models={models}
              results={results}
              loading={loading}
              pinnedProvider={pinned}
              onToggleEnabled={(id, next) => {
                setEnabled((p) => ({ ...p, [id]: next }));
                // When disabling: immediately remove stale results so no error card shows
                if (!next) {
                  setResults((prev) => prev.filter((r) => r.provider !== id));
                }
              }}
              onChangeModel={(id, next) =>
                setModels((p) => ({ ...p, [id]: next }))
              }
              onPin={(id) =>
                setPinned((prev) => (prev === id ? null : id))
              }
              onRetryProvider={(id) => runCompare(id)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
