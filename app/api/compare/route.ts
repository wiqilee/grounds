// app/api/compare/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER COMPARE API ROUTE
// Handles multi-provider comparison requests (Google Gemini, OpenAI, Groq, OpenRouter)
// 
// For Gemini Hackathon: Google/Gemini is prioritized as the featured provider
// ═══════════════════════════════════════════════════════════════════════════════
import { NextResponse } from "next/server";
import { runCompare } from "@/lib/providers/engine/compare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ Provider order: Google (Gemini) first for hackathon prominence
type ProviderId = "google" | "openai" | "groq" | "openrouter";
const PROVIDER_IDS: ProviderId[] = ["google", "openai", "groq", "openrouter"];

function isProviderId(x: string): x is ProviderId {
  return (PROVIDER_IDS as string[]).includes(x);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function asNumber(x: unknown): number | undefined {
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function errToMessage(e: unknown) {
  if (e instanceof Error) return e.message || "Unknown error";
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

function pickModels(x: unknown): Partial<Record<ProviderId, string>> | undefined {
  if (!isRecord(x)) return undefined;
  const out: Partial<Record<ProviderId, string>> = {};
  for (const [k, v] of Object.entries(x)) {
    if (!isProviderId(k)) continue;
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

function pickEnabled(x: unknown): Partial<Record<ProviderId, boolean>> | undefined {
  if (!isRecord(x)) return undefined;
  const out: Partial<Record<ProviderId, boolean>> = {};
  for (const [k, v] of Object.entries(x)) {
    if (!isProviderId(k)) continue;
    if (typeof v === "boolean") out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Prefer adapter’s explicit error message (never “check logs”).
 * Also try to surface something meaningful from raw payloads.
 */
function pickProviderErrorMessage(r: any): string {
  const msg =
    (typeof r?.error?.message === "string" && r.error.message) ||
    (typeof r?.error === "string" && r.error) ||
    (typeof r?.message === "string" && r.message) ||
    "";

  const clean = String(msg || "").trim();
  if (clean) return clean;

  const rawMsg = r?.raw?.error?.message || r?.raw?.message || r?.raw?.error || r?.raw?.detail || r?.raw?.details;

  if (typeof rawMsg === "string" && rawMsg.trim()) return rawMsg.trim();

  const provider = typeof r?.provider === "string" ? r.provider : "unknown";
  const status = typeof r?.raw?.status === "number" ? r.raw.status : undefined;
  return status ? `Request failed (${provider}, status ${status})` : `Request failed (${provider})`;
}

/* ---------------- optional: lightweight server-side parsing ---------------- */
// ✅ Section parsing for structured decision reports
// Gemini 3 excels at generating these structured sections consistently

type ParsedSection = { key: string; title: string; emoji: string; bullets: string[] };

const SECTION_ORDER: Array<{ key: string; title: string; emoji: string; aliases: string[] }> = [
  { key: "best", title: "BEST OPTION", emoji: "🏆", aliases: ["best option", "best", "recommendation"] },
  { key: "rationale", title: "RATIONALE", emoji: "🧩", aliases: ["rationale", "reasoning", "why"] },
  { key: "risks", title: "TOP RISKS", emoji: "⚠️", aliases: ["top risks", "risks"] },
  { key: "assumptions", title: "ASSUMPTIONS TO VALIDATE", emoji: "🧱", aliases: ["assumptions to validate", "assumptions", "assumption"] },
  { key: "halflife", title: "HALF-LIFE", emoji: "⏳", aliases: ["half-life", "halflife"] },
  { key: "blindspots", title: "BLIND SPOTS", emoji: "🕳️", aliases: ["blind spots", "blindspots"] },
  { key: "next", title: "NEXT ACTIONS", emoji: "✅", aliases: ["next actions", "next steps", "actions"] },
];

function normalizeHeader(s: string) {
  return s
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function detectHeader(line: string) {
  const raw = String(line || "").trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/:$/, "")
    .trim();

  const h = normalizeHeader(cleaned);
  for (const s of SECTION_ORDER) {
    if (s.aliases.some((a) => h === a || h.startsWith(a + " "))) return s;
  }
  return null;
}

function splitBullets(lines: string[]) {
  const out: string[] = [];
  for (const l of lines) {
    const line = String(l || "").trim();
    if (!line) continue;

    const m = line.match(/^[-•*]\s+(.*)$/) || line.match(/^\d+\.\s+(.*)$/) || line.match(/^\[\w+\]\s+(.*)$/);
    if (m && m[1]) out.push(m[1].trim());
    else out.push(line);
  }
  return out;
}

function parseDecisionSections(text: string): ParsedSection[] | undefined {
  const raw = String(text || "").trim();
  if (!raw) return undefined;

  const lines = raw.split("\n");
  const buckets = new Map<string, { meta: (typeof SECTION_ORDER)[number]; lines: string[] }>();
  for (const s of SECTION_ORDER) buckets.set(s.key, { meta: s, lines: [] });

  let current: (typeof SECTION_ORDER)[number] | null = null;

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
  for (const s of SECTION_ORDER) {
    const b = buckets.get(s.key)!;
    const bullets = splitBullets(b.lines);
    if (bullets.length) sections.push({ key: s.key, title: s.title, emoji: s.emoji, bullets });
  }

  return sections.length ? sections : undefined;
}

function simpleQualityMeta(text: string) {
  const t = String(text || "");
  const lines = t.split("\n");
  const bulletCount = lines.filter((l) => /^\s*([-•*]|\d+\.)\s+/.test(l.trim())).length;
  const charCount = t.trim().length;
  return { bulletCount, charCount };
}

/* ---------------- make output "not raw": strict formatting ---------------- */

function stripNonDecisionPreamble(raw: string) {
  // Remove noisy headers like "DECISION REPORT", "###", etc., but keep content if it contains actual sections.
  const s = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!s) return s;

  const lines = s.split("\n");

  // Drop leading empty / decorative lines
  while (lines.length && !lines[0].trim()) lines.shift();

  // If the first ~6 lines are generic report titles and not one of our headers, remove them.
  const maxScan = Math.min(8, lines.length);
  let cut = 0;
  for (let i = 0; i < maxScan; i++) {
    const line = lines[i]?.trim() ?? "";
    if (!line) {
      cut = i + 1;
      continue;
    }
    if (detectHeader(line)) break; // don't cut if we already hit a real header
    const norm = normalizeHeader(
      line
        .replace(/^#{1,6}\s*/, "")
        .replace(/^\*\*|\*\*$/g, "")
        .replace(/:$/, "")
        .trim()
    );

    // Typical preambles we want to drop
    const looksLikeTitle =
      norm === "decision report" ||
      norm.includes("decision report") ||
      norm.includes("grounds") ||
      norm.includes("public demo") ||
      norm.includes("launch") ||
      norm === "report";

    if (looksLikeTitle || line.startsWith("###") || line.startsWith("##")) {
      cut = i + 1;
      continue;
    }

    // If it's a meaningful sentence, stop cutting.
    break;
  }

  return lines.slice(cut).join("\n").trim();
}

function ensureBullets(lines: string[], min = 3) {
  const cleaned = splitBullets(lines);
  if (cleaned.length >= min) return cleaned.slice(0, 8);

  // If too few bullets, attempt to split sentences into bullets.
  const joined = cleaned.join(" ").trim();
  const parts = joined
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);

  const out = parts.length ? parts : cleaned;
  return out.slice(0, Math.max(min, Math.min(8, out.length)));
}


function formatDecisionText(rawText: string): { formatted: string; parsed: ParsedSection[] | undefined; wasRewritten: boolean } {
  const raw0 = String(rawText || "").replace(/\r\n/g, "\n").trim();
  if (!raw0) return { formatted: "", parsed: undefined, wasRewritten: false };

  const raw = stripNonDecisionPreamble(raw0);
  const parsed = parseDecisionSections(raw);

  // If we already have at least 4 sections with bullets, normalize and return with emojis
  if (parsed && parsed.length >= 4) {
    const out = SECTION_ORDER.map((s) => {
      const sec = parsed.find((x) => x.key === s.key);
      if (!sec) return null;
      const bullets = ensureBullets(sec.bullets, s.key === "best" ? 1 : 2);
      // Add emoji to header for visual clarity
      const head = `## ${s.emoji} ${s.title}`;
      const body =
        bullets.length === 0 ? "- (none)" : bullets.map((b) => `- ${String(b || "").trim()}`).filter(Boolean).join("\n");
      return `${head}\n${body}`;
    })
      .filter(Boolean)
      .join("\n\n")
      .trim();

    return { formatted: out, parsed: parseDecisionSections(out), wasRewritten: out !== raw0 };
  }

  // NO hardcoded fallback template!
  // Parse what the model actually returned and format it properly
  
  const bestGuessLine =
    raw
      .split("\n")
      .map((l) => l.trim())
      .find((l) => /best option|recommendation|option\s+[a-e]/i.test(l)) ?? "";

  // Group raw bullets by detected sections, preserving original content
  const grouped = new Map<string, string[]>();
  for (const s of SECTION_ORDER) grouped.set(s.key, []);
  
  let currentSection = "rationale"; // default bucket for unassigned content
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const hdr = detectHeader(trimmed);
    if (hdr) {
      currentSection = hdr.key;
      continue;
    }
    
    // Clean up bullet markers
    const cleaned = trimmed
      .replace(/^[-•*]\s*/, "")
      .replace(/^\d+\.\s*/, "")
      .replace(/^\[\w+\]\s*/, "")
      .trim();
    
    if (cleaned && cleaned.length > 3) {
      grouped.get(currentSection)?.push(cleaned);
    }
  }

  // Build formatted output with emojis - only include sections that have content
  const formatted = SECTION_ORDER.map((s) => {
    const bullets = grouped.get(s.key) ?? [];
    
    // Special handling for best option
    if (s.key === "best" && bullets.length === 0 && bestGuessLine) {
      bullets.push(bestGuessLine.replace(/^\*\*|\*\*$/g, "").trim());
    }
    
    if (bullets.length === 0) return null;
    
    const head = `## ${s.emoji} ${s.title}`;
    // Remove duplicates and limit to 8 bullets
    const uniqueBullets = [...new Set(bullets)].slice(0, 8);
    const body = uniqueBullets.map((b) => `- ${b}`).join("\n");
    return `${head}\n${body}`;
  })
    .filter(Boolean)
    .join("\n\n")
    .trim();

  // If we have formatted content, use it
  if (formatted) {
    return { formatted, parsed: parseDecisionSections(formatted), wasRewritten: true };
  }

  // Fallback: just return cleaned raw as bullets (no hardcoded content!)
  const rawBullets = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l.length > 3 && !detectHeader(l))
    .slice(0, 20);
    
  const cleanedRaw = rawBullets.length 
    ? rawBullets.map((b) => `- ${b.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s*/, "")}`).join("\n")
    : raw;
    
  return { formatted: cleanedRaw, parsed: undefined, wasRewritten: false };
}

/* ---------------- output normalization (UI contract) ---------------- */

/**
 * UI contract:
 * - provider, ok, text, latencyMs, usage, error.message
 * - modelRequested: the model selected in the UI (if any)
 * - modelUsed: the model actually used by the adapter (including fallbacks)
 * - meta: optional parsedSections + quality counters
 *
 * Key change in this file:
 * ✅ server-side formatting to prevent "raw" outputs in the UI <pre>
 */
function normalizeCompareResult(res: any, requestedModels: Partial<Record<ProviderId, string>> | undefined) {
  const results = Array.isArray(res?.results) ? res.results : [];

  const fixed = results.map((r: any) => {
    const provider = (typeof r?.provider === "string" ? r.provider : "unknown") as ProviderId | "unknown";
    const modelUsed = typeof r?.model === "string" ? r.model : "";
    const modelRequested = provider !== "unknown" ? (requestedModels?.[provider as ProviderId] ?? "") : "";

    const ok = Boolean(r?.ok);
    const originalText = typeof r?.text === "string" ? r.text : "";

    const latencyMs = typeof r?.latencyMs === "number" && Number.isFinite(r.latencyMs) ? r.latencyMs : undefined;
    const usage = isRecord(r?.usage) ? r.usage : undefined;

    if (ok) {
      const fmt = formatDecisionText(originalText);
      const text = fmt.formatted;

      const quality = text.trim() ? simpleQualityMeta(text) : undefined;

      return {
        provider,
        ok: true,
        text,
        latencyMs,
        usage,
        finishReason: typeof r?.finishReason === "string" ? r.finishReason : undefined,

        // Requested vs used
        modelRequested,
        modelUsed,

        // keep raw for debugging
        raw: r?.raw,

        meta: {
          parsedSections: fmt.parsed,
          quality,
          wasRewritten: fmt.wasRewritten,
          // Helpful for debugging
          original: {
            charCount: originalText.trim().length,
          },
        },
      };
    }

    const message = pickProviderErrorMessage(r);

    // Even on error, sometimes text exists; format it lightly so the UI isn't ugly.
    const fmtErrText = originalText.trim() ? formatDecisionText(originalText) : null;
    const text = fmtErrText ? fmtErrText.formatted : originalText;

    const quality = text.trim() ? simpleQualityMeta(text) : undefined;

    return {
      provider,
      ok: false,
      text,
      latencyMs,
      usage,
      finishReason: typeof r?.finishReason === "string" ? r.finishReason : undefined,
      error: { message },

      modelRequested,
      modelUsed,

      raw: r?.raw,

      meta: {
        parsedSections: fmtErrText?.parsed,
        quality,
        wasRewritten: Boolean(fmtErrText?.wasRewritten),
      },
    };
  });

  return { ...res, results: fixed };
}

export async function POST(req: Request) {
  const requestId =
    (globalThis.crypto?.randomUUID?.() as string | undefined) ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body", requestId }, { status: 400 });
    }

    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    if (!prompt.trim()) {
      return NextResponse.json({ error: "Missing prompt", requestId }, { status: 400 });
    }

    const system = typeof body.system === "string" ? body.system : undefined;

    const temperatureRaw = asNumber(body.temperature);
    const temperature = temperatureRaw == null ? undefined : clamp(temperatureRaw, 0, 2);

    const maxTokensRaw = asNumber(body.maxTokens);
    const maxTokens = maxTokensRaw == null ? undefined : Math.max(1, Math.floor(maxTokensRaw));

    // Only accept known providers
    const models = pickModels(body.models);

    // Backward compatible:
    // - If enabled is missing, assume all providers enabled.
    // - If enabled exists, enforce at least one true.
    // ✅ Google (Gemini) listed first for hackathon prominence
    const enabledInput = pickEnabled(body.enabled);
    const enabled: Partial<Record<ProviderId, boolean>> =
      enabledInput ??
      ({
        google: true,      // ✅ Gemini first - hackathon featured
        openai: true,
        groq: true,
        openrouter: true,
      } as Partial<Record<ProviderId, boolean>>);

    if (!Object.values(enabled).some(Boolean)) {
      return NextResponse.json({ error: "No providers enabled. Enable at least one provider.", requestId }, { status: 400 });
    }

    const enabledProviders: ProviderId[] = Object.entries(enabled)
      .filter(([, v]) => v === true)
      .map(([k]) => k as ProviderId);

    // Run compare (adapters decide final modelUsed + fallback)
    const res = await runCompare({
      system,
      prompt,
      temperature,
      maxTokens,
      models,
      enabled,
    });

    // ✅ Key: normalize + format server-side to avoid "raw" output in UI
    const normalized = normalizeCompareResult(res, models);

    // ✅ Strip results from disabled providers so frontend never sees stale errors
    if (Array.isArray(normalized.results)) {
      normalized.results = normalized.results.filter((r: any) => {
        const pid = typeof r?.provider === "string" ? r.provider : "";
        return enabled[pid as ProviderId] === true;
      });
    }

    return NextResponse.json(
      {
        ...normalized,
        meta: {
          requestId,
          enabledProviders,
          requestedModels: models ?? {},
          hasModels: Boolean(models && Object.keys(models).length > 0),
        },
      },
      { status: 200 }
    );
  } catch (e) {
    const message = errToMessage(e);

    console.error("[/api/compare] request failed:", {
      requestId,
      message,
      error: e,
    });

    return NextResponse.json({ error: "Compare route failed", message, requestId }, { status: 500 });
  }
}
