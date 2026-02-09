// components/compare/ProviderRow.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  Star,
  Play,
  TriangleAlert,
  CheckCircle2,
  Sparkles,
  Zap,
  Cpu,
  Globe2,
  Copy,
  ChevronDown,
  ChevronUp,
  Clock3,
  Braces,
  ClipboardCheck,
  ShieldAlert,
  ListChecks,
  BadgeCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

export type ProviderRowResult = {
  ok: boolean;
  provider: string; // "openai" | "groq" | "google" | "openrouter" etc
  model: string;
  text: string;
  latencyMs: number;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  finishReason?: string;
  error?: { message: string; code?: string };
  raw?: any;
  meta?: any; // optional: server-parsed sections / quality, etc.
};

export type ProviderRowProps = {
  id: string; // provider id
  label: string; // display name e.g. "OpenAI"
  subtitle?: string; // e.g. "Great quality..."
  enabled: boolean;
  model: string;
  modelOptions: Array<{ value: string; label: string }>;

  result?: ProviderRowResult | null;

  pinned?: boolean;
  winner?: boolean;

  loading?: boolean;

  onToggleEnabled?: (next: boolean) => void;
  onChangeModel?: (next: string) => void;

  onPin?: () => void;
  onRetry?: () => void;
};

type Tone = "good" | "warn" | "bad" | "neutral";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function prettyProviderName(id: string) {
  const m: Record<string, string> = {
    openai: "OpenAI",
    groq: "Groq",
    google: "Google",
    openrouter: "OpenRouter",
  };
  return m[id] ?? id;
}

function providerEmoji(id: string) {
  switch (id) {
    case "google":
      return "✨";
    case "groq":
      return "⚡";
    case "openrouter":
      return "🧭";
    case "openai":
      return "🧠";
    default:
      return "🔹";
  }
}

/**
 * Accent tokens:
 * IMPORTANT: use theme variables for text, but keep accent hues for identity.
 * This keeps Light mode readable while still looking premium in Dark.
 */
function providerAccent(id: string) {
  switch (id) {
    case "google":
      return {
        ring: "ring-1 ring-sky-400/25",
        border: "border-sky-400/25",
        glow: "from-sky-400/18 via-fuchsia-400/10 to-emerald-400/10",
        chip: "bg-sky-400/10 border-sky-400/20 text-[color:rgb(var(--fg))]",
        dot: "bg-sky-300",
      };
    case "groq":
      return {
        ring: "ring-1 ring-violet-400/20",
        border: "border-violet-400/20",
        glow: "from-violet-400/18 via-fuchsia-400/10 to-sky-400/10",
        chip: "bg-violet-400/10 border-violet-400/20 text-[color:rgb(var(--fg))]",
        dot: "bg-violet-300",
      };
    case "openrouter":
      return {
        ring: "ring-1 ring-amber-400/20",
        border: "border-amber-400/20",
        glow: "from-amber-400/18 via-sky-400/10 to-violet-400/10",
        chip: "bg-amber-400/10 border-amber-400/20 text-[color:rgb(var(--fg))]",
        dot: "bg-amber-300",
      };
    case "openai":
      return {
        ring: "ring-1 ring-emerald-400/20",
        border: "border-emerald-400/20",
        glow: "from-emerald-400/18 via-cyan-400/10 to-sky-400/10",
        chip: "bg-emerald-400/10 border-emerald-400/20 text-[color:rgb(var(--fg))]",
        dot: "bg-emerald-300",
      };
    default:
      return {
        ring: "ring-1 ring-[color:rgba(var(--fg),0.12)]",
        border: "border-[color:rgba(var(--fg),0.12)]",
        glow: "from-[color:rgba(var(--fg),0.10)] via-[color:rgba(var(--fg),0.06)] to-transparent",
        chip: "bg-[color:rgba(var(--fg),0.04)] border-[color:rgba(var(--fg),0.12)] text-[color:rgb(var(--fg))]",
        dot: "bg-[color:rgba(var(--fg),0.55)]",
      };
  }
}

function formatMs(ms?: number) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "";
  return `${Math.max(0, Math.round(ms))}ms`;
}

function formatTokens(n?: number) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return `${Math.max(0, Math.round(n))}`;
}

function clampText(s: string, max = 220) {
  const t = String(s || "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ---------------- parsing (resilient) ---------------- */

type NextActionBlock = {
  action: string;
  owner: string;
  timebox: string;
  ok: boolean;
  rawLines: string[];
};

type ParsedSection =
  | { key: string; title: string; emoji: string; kind: "bullets"; lines: string[] }
  | { key: "next"; title: string; emoji: string; kind: "next-actions"; actions: NextActionBlock[] }
  | { key: "raw"; title: string; emoji: string; kind: "bullets"; lines: string[] };

const SECTION_ORDER: Array<{ key: string; title: string; emoji: string; aliases: string[] }> = [
  { key: "best", title: "Best option", emoji: "🏆", aliases: ["best option", "best", "recommendation"] },
  { key: "rationale", title: "Rationale", emoji: "🧩", aliases: ["rationale", "reasoning", "why"] },
  { key: "risks", title: "Top risks", emoji: "⚠️", aliases: ["top risks", "risks"] },
  {
    key: "assumptions",
    title: "Assumptions",
    emoji: "🧱",
    aliases: ["assumptions to validate", "assumptions", "assumption"],
  },
  { key: "halflife", title: "Half-life", emoji: "⏳", aliases: ["half-life", "halflife"] },
  { key: "blindspots", title: "Blind spots", emoji: "🕳️", aliases: ["blind spots", "blindspots"] },
  { key: "next", title: "Next actions", emoji: "✅", aliases: ["next actions", "next steps", "actions"] },
];

function normalizeHeader(s: string) {
  return s
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripCommonHeadingDecorators(line: string) {
  // Handles:
  // - "## NEXT ACTIONS"
  // - "**NEXT ACTIONS**"
  // - "NEXT ACTIONS:"
  // - "NEXT ACTIONS —"
  // - "NEXT ACTIONS"
  return String(line || "")
    .trim()
    .replace(/^#{1,6}\s*/g, "")
    .replace(/^\*\*+|\*\*+$/g, "")
    .replace(/^[—–-]\s*/g, "")
    .replace(/[:：]\s*$/g, "")
    .trim();
}

function detectHeader(line: string) {
  const raw = stripCommonHeadingDecorators(line);
  if (!raw) return null;

  const h = normalizeHeader(raw);

  // Fast path: must look header-ish (caps or short phrase)
  const looksHeaderish =
    /^(best option|rationale|top risks|assumptions|assumptions to validate|half life|half-life|blind spots|next actions|next steps)\b/.test(
      h
    ) ||
    raw === raw.toUpperCase() ||
    /^#{1,6}\s+/.test(String(line || "").trim()) ||
    /^\*\*[A-Z0-9 _-]{3,}\*\*$/.test(String(line || "").trim());

  if (!looksHeaderish) return null;

  for (const s of SECTION_ORDER) {
    if (s.aliases.some((a) => h === a || h.startsWith(a + " "))) return s;
  }

  // Additional tolerant match: "next action" singular, "blind spot" singular, etc.
  if (h === "next action") return SECTION_ORDER.find((x) => x.key === "next") ?? null;
  if (h === "blind spot") return SECTION_ORDER.find((x) => x.key === "blindspots") ?? null;

  return null;
}

function isBulletLine(line: string) {
  const l = String(line || "").trim();
  return /^[-•*]\s+/.test(l) || /^\d+\.\s+/.test(l) || /^\[[^\]]+\]\s+/.test(l);
}

function cleanBulletText(line: string) {
  const l = String(line || "").trim();
  const m =
    l.match(/^[-•*]\s+(.*)$/) ||
    l.match(/^\d+\.\s+(.*)$/) ||
    l.match(/^\[[^\]]+\]\s+(.*)$/);
  if (m && m[1]) return m[1].trim();
  return l;
}

function splitBullets(blockLines: string[]) {
  const out: string[] = [];
  for (const l of blockLines) {
    const line = String(l || "").trim();
    if (!line) continue;
    out.push(cleanBulletText(line));
  }
  return out;
}

function isLikelySubLine(line: string) {
  // For indented "Owner:" etc lines.
  const l = String(line || "").trim();
  if (!l) return false;
  if (/^(owner|timebox|mitigation|validation|trigger|question)\s*:/i.test(l)) return true;
  if (/^\s{2,}/.test(String(line || ""))) return true;
  return false;
}

function parseNextActions(lines: string[]) {
  // Input: raw lines that belong to the NEXT ACTIONS section.
  // Output: semantic action blocks (Action/Owner/Timebox) + quality flag.
  const raw = lines
    .map((x) => String(x || ""))
    .map((x) => x.replace(/\t/g, " "))
    .map((x) => x.replace(/\r/g, ""))
    .filter((x) => x.trim().length > 0);

  const tokens = raw.map((l) => cleanBulletText(l));

  const blocks: NextActionBlock[] = [];
  let cur: { action?: string; owner?: string; timebox?: string; rawLines: string[] } | null = null;

  const flush = () => {
    if (!cur) return;

    const action = String(cur.action ?? "").trim();
    const owner = String(cur.owner ?? "").trim();
    const timebox = String(cur.timebox ?? "").trim();

    const ok = Boolean(action) && Boolean(owner) && Boolean(timebox);

    blocks.push({
      action,
      owner,
      timebox,
      ok,
      rawLines: cur.rawLines.slice(),
    });

    cur = null;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].trim();
    if (!t) continue;

    const mAction = t.match(/^action\s*:\s*(.*)$/i);
    const mOwner = t.match(/^owner\s*:\s*(.*)$/i);
    const mTime = t.match(/^timebox\s*:\s*(.*)$/i);

    if (mAction) {
      // New action begins -> flush previous
      flush();
      cur = { rawLines: [] };
      cur.rawLines.push(t);
      cur.action = String(mAction[1] ?? "").trim();
      continue;
    }

    // If we see owner/timebox before action, start a block anyway
    if (mOwner) {
      if (!cur) cur = { rawLines: [] };
      cur.rawLines.push(t);
      cur.owner = String(mOwner[1] ?? "").trim();
      continue;
    }

    if (mTime) {
      if (!cur) cur = { rawLines: [] };
      cur.rawLines.push(t);
      cur.timebox = String(mTime[1] ?? "").trim();
      continue;
    }

    // Sometimes providers output as plain bullets without Action/Owner/Timebox labels.
    // We keep them as part of a block if a block is open; otherwise treat as action candidate.
    if (!cur) {
      cur = { rawLines: [] };
      cur.rawLines.push(t);
      // If it’s a plain sentence, treat it as Action candidate.
      cur.action = t.trim();
      continue;
    }

    // If cur.action is empty and we get a plain line, use it as action.
    if (!cur.action && !isLikelySubLine(t)) {
      cur.action = t.trim();
      cur.rawLines.push(t);
      continue;
    }

    // Otherwise keep as context.
    cur.rawLines.push(t);
  }

  flush();

  // Remove obvious junk blocks (empty everything)
  const cleaned = blocks.filter((b) => b.action || b.owner || b.timebox);

  const hasEmptyAction = cleaned.some((b) => !b.action);
  const hasIncomplete = cleaned.some((b) => !b.ok);
  const count = cleaned.length;

  return {
    actions: cleaned,
    hasEmptyAction,
    hasIncomplete,
    count,
  };
}

function parseDecisionSections(text: string): {
  sections: ParsedSection[];
  needsRepair: boolean;
  needsRepairReason: string | null;
} {
  const raw = String(text || "").trim();
  if (!raw) return { sections: [], needsRepair: false, needsRepairReason: null };

  const lines = raw.split("\n");

  // Buckets by section key
  const buckets = new Map<string, { meta: { key: string; title: string; emoji: string }; lines: string[] }>();
  for (const s of SECTION_ORDER) buckets.set(s.key, { meta: s, lines: [] });

  let current: { key: string; title: string; emoji: string } | null = null;

  for (const line of lines) {
    const hdr = detectHeader(line);
    if (hdr) {
      current = hdr;
      continue;
    }
    if (!current) continue;
    buckets.get(current.key)!.lines.push(line);
  }

  const sections: ParsedSection[] = [];

  // Build regular sections first
  for (const s of SECTION_ORDER) {
    const b = buckets.get(s.key)!;

    if (s.key === "next") {
      const parsed = parseNextActions(b.lines);
      const hasAnyLines = b.lines.some((x) => String(x || "").trim().length > 0);
      if (hasAnyLines) {
        sections.push({
          key: "next",
          title: s.title,
          emoji: s.emoji,
          kind: "next-actions",
          actions: parsed.actions,
        });
      }
      continue;
    }

    const items = splitBullets(b.lines);
    if (items.length) sections.push({ key: s.key, title: s.title, emoji: s.emoji, kind: "bullets", lines: items });
  }

  // Fallback: if nothing parsed, show top bullets from entire output
  if (!sections.length) {
    const items = splitBullets(lines);
    const preview = items.length ? items.slice(0, 18) : [raw];
    return {
      sections: [{ key: "raw", title: "Output", emoji: "📝", kind: "bullets", lines: preview }],
      needsRepair: false,
      needsRepairReason: null,
    };
  }

  // Needs-repair signal: NEXT ACTIONS has empty Action or missing Owner/Timebox
  let needsRepair = false;
  let needsRepairReason: string | null = null;

  const next = sections.find((s) => s.key === "next" && s.kind === "next-actions") as
    | Extract<ParsedSection, { key: "next"; kind: "next-actions" }>
    | undefined;

  if (next) {
    const hasEmptyAction = next.actions.some((a) => !a.action.trim());
    const hasIncomplete = next.actions.some((a) => !a.ok);
    if (hasEmptyAction) {
      needsRepair = true;
      needsRepairReason = 'NEXT ACTIONS has an empty "Action:" line.';
    } else if (hasIncomplete) {
      needsRepair = true;
      needsRepairReason = "NEXT ACTIONS is missing Owner or Timebox on at least one action.";
    } else if (next.actions.length > 0 && next.actions.length < 3) {
      // still useful as a hint, not too harsh
      needsRepair = true;
      needsRepairReason = "NEXT ACTIONS has too few action blocks (aim 6+).";
    }
  }

  return { sections, needsRepair, needsRepairReason };
}

/* ---------------- light quality hint ---------------- */

function scoreHintFromText(text: string) {
  const t = String(text || "");
  const lines = t.split("\n");
  const bullets = lines.filter((l) => /^\s*([-•*]|\d+\.)\s+/.test(l.trim())).length;
  const len = t.trim().length;

  if (len >= 900 && bullets >= 14) return { tone: "good" as Tone, label: "Decision-grade" };
  if (len >= 450 && bullets >= 8) return { tone: "warn" as Tone, label: "Almost there" };
  return { tone: "neutral" as Tone, label: "Needs structure" };
}

function sectionStyle(key: string) {
  if (key === "best") {
    return {
      wrap: "border-emerald-400/25 bg-emerald-400/10",
      title: "text-[color:rgb(var(--fg))]",
      bullet: "bg-emerald-300/70",
      badge: "border-emerald-400/25 bg-emerald-400/10 text-[color:rgb(var(--fg))]",
    };
  }
  if (key === "risks") {
    return {
      wrap: "border-amber-400/25 bg-amber-400/10",
      title: "text-[color:rgb(var(--fg))]",
      bullet: "bg-amber-300/70",
      badge: "border-amber-400/25 bg-amber-400/10 text-[color:rgb(var(--fg))]",
    };
  }
  if (key === "next") {
    return {
      wrap: "border-sky-400/20 bg-sky-400/10",
      title: "text-[color:rgb(var(--fg))]",
      bullet: "bg-sky-300/70",
      badge: "border-sky-400/20 bg-sky-400/10 text-[color:rgb(var(--fg))]",
    };
  }
  return {
    wrap: "border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.03)]",
    title: "text-[color:rgba(var(--fg),0.90)]",
    bullet: "bg-[color:rgba(var(--fg),0.45)]",
    badge: "border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.04)] text-[color:rgba(var(--fg),0.78)]",
  };
}

/* ---------------- component ---------------- */

export function ProviderRow(props: ProviderRowProps) {
  const {
    id,
    label,
    subtitle,
    enabled,
    model,
    modelOptions,
    result,
    pinned,
    winner,
    loading,
    onToggleEnabled,
    onChangeModel,
    onPin,
    onRetry,
  } = props;

  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<null | "ok">(null);

  const isFeatured = id === "google";
  const accent = providerAccent(id);

  // ✅ When disabled, completely ignore any stale result from previous runs.
  // This prevents error cards (rate limit, quota exceeded) from showing
  // when user clicks "Disabled" on a provider.
  const safeResult = enabled ? (result ?? null) : null;

  const status = useMemo(() => {
    if (!enabled) return { tone: "neutral" as Tone, label: "Disabled", icon: TriangleAlert };
    if (loading) return { tone: "neutral" as Tone, label: "Running…", icon: Play };
    if (!safeResult) return { tone: "neutral" as Tone, label: "Idle", icon: TriangleAlert };
    return safeResult.ok
      ? ({ tone: "good" as Tone, label: "Ready", icon: CheckCircle2 } as const)
      : ({ tone: "bad" as Tone, label: "Issue", icon: TriangleAlert } as const);
  }, [enabled, loading, safeResult]);

  const hasUsableOutput = Boolean(safeResult?.ok && String(safeResult?.text || "").trim().length > 0);

  const borderClass =
    winner || pinned
      ? cx(accent.border, accent.ring)
      : isFeatured
        ? "border-sky-300/25 ring-1 ring-sky-300/15"
        : "border-[color:rgba(var(--fg),0.12)]";

  const parsed = useMemo(() => {
    if (!hasUsableOutput) return { sections: [] as ParsedSection[], needsRepair: false, needsRepairReason: null as string | null };

    // Prefer server-side parsing if present (optional), but still compute NeedsRepair locally.
    // If server parsed sections exist, we still rely on raw text for empty Action detection.
    const text = String(safeResult?.text || "");
    return parseDecisionSections(text);
  }, [hasUsableOutput, safeResult]);

  const hint = useMemo(() => {
    if (!hasUsableOutput) return null;
    return scoreHintFromText(String(safeResult?.text || ""));
  }, [hasUsableOutput, safeResult]);

  const subtitleText =
    subtitle ||
    (isFeatured ? "Featured for the Gemini hackathon — tuned for structured, decision-grade output." : "Provider enabled for compare.");

  const ProviderMetaIcon = id === "groq" ? Zap : id === "openrouter" ? Globe2 : id === "openai" ? Cpu : Sparkles;

  const issueBox =
    enabled && safeResult && !safeResult.ok ? (
      <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[color:rgb(var(--fg))]">
          <TriangleAlert className="h-4 w-4" />
          Request failed
        </div>
        <div className="mt-1 text-[12px] text-[color:rgba(var(--fg),0.78)]">
          {safeResult.error?.message || "Request failed."}
        </div>
      </div>
    ) : null;

  const needsRepairBadge =
    enabled && safeResult?.ok && hasUsableOutput && parsed.needsRepair ? (
      <span
        className={cx(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-none",
          "border-amber-400/25 bg-amber-400/10 text-[color:rgb(var(--fg))]"
        )}
        title={parsed.needsRepairReason ?? "Output needs repair"}
      >
        <ShieldAlert className="h-3.5 w-3.5" />
        Needs repair
      </span>
    ) : null;

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border p-4",
        "bg-[color:rgba(var(--fg),0.03)]",
        "motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5",
        borderClass
      )}
    >
      {/* Soft glow */}
      <div
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute -inset-x-10 -top-12 h-40 blur-2xl opacity-70",
          "bg-gradient-to-r",
          accent.glow,
          (winner || (isFeatured && !winner)) && "motion-safe:animate-pulse"
        )}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Chip label={`${providerEmoji(id)} ${label || prettyProviderName(id)}`} tone={"info" as any} />
              <Chip label={status.label} tone={(status.tone as any) || ("neutral" as any)} />

              {isFeatured ? <Chip label="⭐ Featured" tone={"info" as any} /> : null}
              {winner ? <Chip label="🏆 Winner" tone={"good" as any} /> : null}
              {pinned && !winner ? <Chip label="📌 Pinned" tone={"neutral" as any} /> : null}

              {hint && enabled && safeResult?.ok ? (
                <span
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-none",
                    "motion-safe:transition-colors",
                    hint.tone === "good"
                      ? "border-emerald-400/25 bg-emerald-400/10 text-[color:rgb(var(--fg))]"
                      : hint.tone === "warn"
                        ? "border-amber-400/25 bg-amber-400/10 text-[color:rgb(var(--fg))]"
                        : "border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.04)] text-[color:rgba(var(--fg),0.78)]"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {hint.label}
                </span>
              ) : null}

              {needsRepairBadge}
            </div>

            <div className="mt-2 text-[12px] text-[color:rgba(var(--fg),0.62)]">
              {subtitleText}
              {enabled && typeof safeResult?.latencyMs === "number" ? (
                <>
                  <span className="text-[color:rgba(var(--fg),0.40)]"> · </span>
                  <span className="inline-flex items-center gap-1 text-[color:rgba(var(--fg),0.64)]">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatMs(safeResult.latencyMs)}
                  </span>
                </>
              ) : null}
            </div>

            {/* Meta strip */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[color:rgba(var(--fg),0.62)]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.04)] px-2.5 py-1">
                <ProviderMetaIcon className="h-3.5 w-3.5" />
                <span className="text-[color:rgba(var(--fg),0.68)]">Model:</span>{" "}
                <span className="text-[color:rgba(var(--fg),0.86)]">{model}</span>
              </span>

              {safeResult?.usage?.totalTokens != null ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.04)] px-2.5 py-1">
                  🧾 <span className="text-[color:rgba(var(--fg),0.68)]">Tokens:</span>{" "}
                  <span className="text-[color:rgba(var(--fg),0.86)]">{formatTokens(safeResult.usage.totalTokens)}</span>
                </span>
              ) : null}

              {safeResult?.finishReason ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.04)] px-2.5 py-1">
                  🎯 <span className="text-[color:rgba(var(--fg),0.68)]">Finish:</span>{" "}
                  <span className="text-[color:rgba(var(--fg),0.86)]">{safeResult.finishReason}</span>
                </span>
              ) : null}

              {safeResult?.raw ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.04)] px-2.5 py-1"
                  title="Raw payload present (for debugging)"
                >
                  <Braces className="h-3.5 w-3.5" />
                  <span className="text-[color:rgba(var(--fg),0.68)]">Raw</span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onPin} disabled={!enabled || loading} title="Pin this provider">
              <Star className="h-4 w-4" /> Pin
            </Button>

            <Button variant="primary" onClick={onRetry} disabled={!enabled || loading} title="Retry this provider">
              <Play className="h-4 w-4" /> Retry
            </Button>

            <Button
              variant="secondary"
              onClick={async () => {
                if (!safeResult?.text) return;
                const ok = await copyToClipboard(safeResult.text);
                setCopied(ok ? "ok" : null);
                window.setTimeout(() => setCopied(null), 900);
              }}
              disabled={!enabled || loading || !hasUsableOutput}
              title="Copy full output"
            >
              <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.03)] p-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-[color:rgba(var(--fg),0.62)]">Enabled</div>
              <button
                type="button"
                onClick={() => onToggleEnabled?.(!enabled)}
                className={cx(
                  "text-[12px] px-3 py-1 rounded-xl border",
                  "motion-safe:transition-colors motion-safe:duration-200",
                  enabled
                    ? "border-emerald-400/25 bg-emerald-400/10 text-[color:rgb(var(--fg))]"
                    : "border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.04)] text-[color:rgba(var(--fg),0.78)]"
                )}
              >
                {enabled ? "On" : "Off"}
              </button>
            </div>
            <div className="mt-2 text-[10px] text-[color:rgba(var(--fg),0.50)]">
              Turn off providers to reduce latency and noise.
            </div>
          </div>

          <div className="rounded-2xl border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.03)] p-3">
            <div className="text-[11px] text-[color:rgba(var(--fg),0.62)] mb-1">Model</div>
            <select
              value={model}
              onChange={(e) => onChangeModel?.(e.target.value)}
              disabled={!enabled || loading}
              className="w-full rounded-xl border border-[color:rgba(var(--fg),0.12)] bg-transparent px-3 py-2 text-[13px] text-[color:rgba(var(--fg),0.86)] outline-none"
            >
              {modelOptions.map((o) => (
                <option key={o.value} value={o.value} className="bg-[color:rgb(var(--bg0))] text-[color:rgb(var(--fg))]">
                  {o.label}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[10px] text-[color:rgba(var(--fg),0.50)]">Choose a supported model.</div>
          </div>
        </div>

        {/* Issue / Empty */}
        {issueBox}

        {enabled && safeResult && safeResult.ok && !hasUsableOutput ? (
          <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[color:rgb(var(--fg))]">
              <TriangleAlert className="h-4 w-4" />
              Provider returned no usable output
            </div>
            <div className="mt-1 text-[12px] text-[color:rgba(var(--fg),0.78)]">
              Try a different model or verify the adapter parsing.
            </div>
          </div>
        ) : null}

        {/* Output */}
        {enabled && safeResult && safeResult.ok && hasUsableOutput ? (
          <div className="mt-3 rounded-2xl border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.02)] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[color:rgba(var(--fg),0.86)]">
                <CheckCircle2 className="h-4 w-4" />
                Response
              </div>

              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px]",
                  "border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.03)] text-[color:rgba(var(--fg),0.78)]",
                  "motion-safe:transition-colors motion-safe:duration-200 hover:bg-[color:rgba(var(--fg),0.05)]"
                )}
                title={expanded ? "Collapse details" : "Expand details"}
              >
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {expanded ? "Hide details" : "Show details"}
              </button>
            </div>

            {/* Preview */}
            <div className="mt-2 text-[12px] text-[color:rgba(var(--fg),0.72)]">
              <span className="text-[color:rgba(var(--fg),0.55)]">Preview:</span>{" "}
              <span className="text-[color:rgba(var(--fg),0.78)]">{clampText(safeResult.text, 220)}</span>
            </div>

            {/* Needs repair explainer (smart, not ugly) */}
            {parsed.needsRepair ? (
              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[color:rgb(var(--fg))]">
                  <ShieldAlert className="h-4 w-4" />
                  Needs repair
                </div>
                <div className="mt-1 text-[12px] text-[color:rgba(var(--fg),0.74)]">
                  {parsed.needsRepairReason ?? "Some required fields are missing in NEXT ACTIONS."}
                </div>
                <div className="mt-2 text-[11px] text-[color:rgba(var(--fg),0.62)]">
                  Tip: run repair pass (or retry) to force complete Action + Owner + Timebox blocks.
                </div>
              </div>
            ) : null}

            {/* Sections */}
            <div className="mt-3 grid gap-3">
              {(parsed.sections.length
                ? parsed.sections
                : [{ key: "raw", title: "Output", emoji: "📝", kind: "bullets", lines: [String(safeResult.text || "")] } as ParsedSection]
              ).map((sec) => {
                const st = sectionStyle(sec.key);
                const isBest = sec.key === "best";
                const isNext = sec.key === "next";

                return (
                  <div
                    key={sec.key}
                    className={cx("rounded-2xl border p-3", "motion-safe:transition-colors motion-safe:duration-200", st.wrap)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className={cx("flex items-center gap-2 text-[12px] font-semibold", st.title)}>
                        <span aria-hidden="true">{sec.emoji}</span>
                        <span>{sec.title}</span>

                        {isBest ? (
                          <span
                            className={cx(
                              "ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                              st.badge
                            )}
                            title="Highlighted section"
                          >
                            <BadgeCheck className="h-3 w-3" />
                            Pick
                          </span>
                        ) : null}

                        {isNext ? (
                          <span
                            className={cx(
                              "ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                              st.badge
                            )}
                            title="Checklist view"
                          >
                            <ListChecks className="h-3 w-3" />
                            Checklist
                          </span>
                        ) : null}
                      </div>

                      <span className="inline-flex items-center gap-2 text-[11px] text-[color:rgba(var(--fg),0.60)]">
                        <span className={cx("h-2 w-2 rounded-full", accent.dot)} />
                        {prettyProviderName(id)}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="mt-2">
                      {/* NEXT ACTIONS: checklist semantics */}
                      {sec.kind === "next-actions" ? (
                        <div className="space-y-2">
                          {(expanded ? sec.actions : sec.actions.slice(0, 4)).map((a, idx) => {
                            const ok = a.ok;
                            const title = a.action.trim() || "(empty action)";

                            return (
                              <div
                                key={idx}
                                className={cx(
                                  "rounded-2xl border p-3",
                                  ok
                                    ? "border-emerald-400/18 bg-emerald-400/5"
                                    : "border-amber-400/22 bg-amber-400/10"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <div
                                    className={cx(
                                      "mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border",
                                      ok
                                        ? "border-emerald-400/25 bg-emerald-400/10 text-[color:rgb(var(--fg))]"
                                        : "border-amber-400/30 bg-amber-400/10 text-[color:rgb(var(--fg))]"
                                    )}
                                    title={ok ? "Complete action block" : "Missing Owner/Timebox or empty Action"}
                                  >
                                    {ok ? <ClipboardCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div
                                      className={cx(
                                        "text-[12px] font-semibold leading-snug",
                                        "text-[color:rgba(var(--fg),0.88)]"
                                      )}
                                    >
                                      {title}
                                    </div>

                                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[color:rgba(var(--fg),0.66)]">
                                      <span className="inline-flex items-center gap-1 rounded-full border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.03)] px-2 py-0.5">
                                        <span className="text-[color:rgba(var(--fg),0.62)]">Owner:</span>{" "}
                                        <span className="text-[color:rgba(var(--fg),0.86)]">{a.owner || "—"}</span>
                                      </span>
                                      <span className="inline-flex items-center gap-1 rounded-full border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.03)] px-2 py-0.5">
                                        <span className="text-[color:rgba(var(--fg),0.62)]">Timebox:</span>{" "}
                                        <span className="text-[color:rgba(var(--fg),0.86)]">{a.timebox || "—"}</span>
                                      </span>

                                      {!ok ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[color:rgb(var(--fg))]">
                                          <ShieldAlert className="h-3.5 w-3.5" />
                                          Needs repair
                                        </span>
                                      ) : null}
                                    </div>

                                    {expanded && a.rawLines.length > 0 ? (
                                      <div className="mt-2 text-[11px] text-[color:rgba(var(--fg),0.62)]">
                                        <div className="rounded-xl border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.03)] p-2">
                                          <div className="font-semibold text-[color:rgba(var(--fg),0.72)]">Raw block</div>
                                          <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-[color:rgba(var(--fg),0.70)]">
                                            {a.rawLines.join("\n")}
                                          </pre>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {!expanded && sec.actions.length > 4 ? (
                            <div className="text-[11px] text-[color:rgba(var(--fg),0.52)]">
                              +{sec.actions.length - 4} more action blocks
                            </div>
                          ) : null}

                          {sec.actions.length === 0 ? (
                            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-[12px] text-[color:rgba(var(--fg),0.74)]">
                              NEXT ACTIONS section was detected, but no action blocks were parsed.
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        // Regular bullet sections
                        <div className="space-y-1">
                          {(expanded ? sec.lines : sec.lines.slice(0, 6)).map((line, idx) => (
                            <div key={idx} className="flex gap-2 text-[12px] leading-relaxed text-[color:rgba(var(--fg),0.74)]">
                              <span className={cx("mt-[6px] h-1.5 w-1.5 flex-none rounded-full", st.bullet)} />
                              <div className="min-w-0">{line}</div>
                            </div>
                          ))}
                          {!expanded && sec.lines.length > 6 ? (
                            <div className="mt-2 text-[11px] text-[color:rgba(var(--fg),0.52)]">
                              +{sec.lines.length - 6} more items
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full text (only when expanded) */}
            {expanded ? (
              <div className="mt-3 rounded-2xl border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.03)] p-3">
                <div className="text-[11px] font-semibold text-[color:rgba(var(--fg),0.80)]">Full output</div>
                <pre className="mt-2 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[color:rgba(var(--fg),0.74)]">
                  {safeResult.text}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}

        {!enabled ? (
          <div className="mt-3 rounded-2xl border border-[color:rgba(var(--fg),0.12)] bg-[color:rgba(var(--fg),0.02)] p-3 text-[12px] text-[color:rgba(var(--fg),0.62)]">
            <span className="mr-2">{providerEmoji(id)}</span>
            This provider is off. Turn it on to include it in compare.
          </div>
        ) : null}
      </div>

      {/* Subtle corner sparkle */}
      <div aria-hidden="true" className={cx("pointer-events-none absolute right-3 top-3", (winner || isFeatured) && "motion-safe:animate-pulse")}>
        {isFeatured ? <Sparkles className="h-4 w-4 text-sky-400/60" /> : null}
      </div>
    </div>
  );
}
