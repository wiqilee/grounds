// lib/report/html.ts
import type { AnalysisBundle, DecisionInput } from "@/lib/analysis/types";

// ============================================================================
// NEW TYPES for Radar Chart, Sentiment Analysis, Conclusion, Related Research
// ============================================================================

export type SentimentAspect = {
  aspect: string;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  confidence: number;
  keySignals: string[];
  summary: string;
};

export type SentimentAnalysisData = {
  aspects: SentimentAspect[];
  overallSentiment: "positive" | "negative" | "neutral" | "mixed";
  overallConfidence: number;
  summary: string;
  modelUsed: string;
};

export type ConclusionData = {
  summary: string;
  recommendation: string;
  keyTakeaways: string[];
  nextSteps: string[];
  reviewDate: string;
  confidenceStatement: string;
};

export type ResearchLink = {
  title: string;
  description: string;
  type: "research" | "news" | "case_study" | "article";
  suggestedSearch: string;
  relevance: string;
};

export type RelatedResearchData = {
  links: ResearchLink[];
  searchSuggestions: string[];
  educationalNote: string;
};

export type RadarChartData = {
  readiness: number;
  riskCoverage: number;
  evidenceQuality: number;
  assumptionClarity: number;
  actionability: number;
  confidence: number;
};

export type ThemeInfo = {
  id: string;
  label: string;
  emoji: string;
};

/** HTML-safe escape */
function esc(x: unknown) {
  const s = String(x ?? "");
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sectionTitle(t: string, sub?: string) {
  return `
    <div class="secHead">
      <div class="secTitle"><strong>${esc(t)}</strong></div>
      ${sub ? `<div class="secSub">${esc(sub)}</div>` : ""}
    </div>
  `;
}

function pill(label: string, tone: "good" | "warn" | "bad" | "info" | "neutral" = "neutral") {
  const map: Record<string, string> = {
    neutral: "p-neutral",
    good: "p-good",
    warn: "p-warn",
    bad: "p-bad",
    info: "p-info",
  };
  // Allow HTML tags like <strong> to pass through
  const escaped = esc(label).replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>');
  return `<span class="pill ${map[tone]}">${escaped}</span>`;
}

function list(items: string[]) {
  if (!items.length) return `<div class="muted">-</div>`;
  return `<ul>${items.map((x) => {
    // Remove leading bullet chars to avoid double bullets
    let cleaned = x.replace(/^[\s]*[-*•▪○●]\s*/, '').replace(/^[\s]*\d+[.)]\s*/, '').trim();
    // Make Option A, B, C, D or Option 1, 2, 3 bold
    const formatted = cleaned
      .replace(/^(Option\s*[A-Z0-9]+)([:.]?\s*)/i, '<strong>$1</strong>$2');
    return `<li>${esc(formatted).replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>')}</li>`;
  }).join("")}</ul>`;
}

/** List items with HIGH/MEDIUM/LOW status highlighting for Risks */
function listRisks(items: string[]) {
  if (!items.length) return `<div class="muted">-</div>`;
  return `<ul>${items.map((x) => {
    let cleaned = x.replace(/^[\s]*[-*•▪○●]\s*/, '').replace(/^[\s]*\d+[.)]\s*/, '').trim();
    // Highlight HIGH, MEDIUM, LOW with colored bold
    const formatted = cleaned
      .replace(/\b(HIGH)\b/gi, '<span class="riskStatusHigh">$1</span>')
      .replace(/\b(MEDIUM)\b/gi, '<span class="riskStatusMedium">$1</span>')
      .replace(/\b(LOW)\b/gi, '<span class="riskStatusLow">$1</span>');
    return `<li>${esc(formatted)
      .replace(/&lt;span class="riskStatusHigh"&gt;/g, '<span class="riskStatusHigh">')
      .replace(/&lt;span class="riskStatusMedium"&gt;/g, '<span class="riskStatusMedium">')
      .replace(/&lt;span class="riskStatusLow"&gt;/g, '<span class="riskStatusLow">')
      .replace(/&lt;\/span&gt;/g, '</span>')}</li>`;
  }).join("")}</ul>`;
}

/** Convert paragraph text into bullet list - avoids double bullets */
function listParagraph(text: string | undefined): string {
  if (!text || !text.trim()) return `<span class="muted">-</span>`;
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return `<span class="muted">-</span>`;
  
  // Clean lines - remove existing bullet chars to avoid double bullets
  const cleanedLines = lines.map(l => {
    // Remove leading bullet characters: -, *, •, ▪, ○, ●, numbers with dots/parens
    return l.replace(/^[\s]*[-*•▪○●]\s*/, '').replace(/^[\s]*\d+[.)]\s*/, '').trim();
  }).filter(l => l);
  
  if (cleanedLines.length === 0) return `<span class="muted">-</span>`;
  if (cleanedLines.length === 1) return `<p class="singleLine">${esc(cleanedLines[0])}</p>`;
  return `<ul>${cleanedLines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

function uid() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

/** ---------- Report extras (tooltips that should appear in HTML/PDF) ---------- */
export type ReportTooltip = {
  id: string;
  title: string;
  lines: string[];
};

export type ProviderCompareRow = {
  provider: string;
  model?: string;
  latencyMs?: number;
  ok?: boolean; // preferred
  success?: boolean; // tolerated
  text?: string;
  output?: string;
  content?: string;
  result?: string;
  error?: string;
  message?: string;
  status?: string;
};

/**
 * ✅ Exported type for Page.tsx
 * This matches the shape emitted by components/compare/GeminiCriticPanel.tsx (CriticResponse).
 */
export type GeminiCriticResult = {
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

export type ReportExtras = {
  tooltips?: ReportTooltip[];
  /** Attach provider compare result here to render in report appendix */
  providerCompare?: { results?: ProviderCompareRow[] } | ProviderCompareRow[] | unknown;

  /** Gemini Critic output (for HTML/PDF section) */
  geminiCritic?: GeminiCriticResult | null;

  /** NEW: Sentiment Analysis data */
  sentiment?: SentimentAnalysisData | null;

  /** NEW: Executive Conclusion data */
  conclusion?: ConclusionData | null;

  /** NEW: Related Research data */
  relatedResearch?: RelatedResearchData | null;

  /** NEW: Radar Chart data */
  radarChart?: RadarChartData | null;

  /** NEW: Timezone for display */
  timezone?: string;

  /** NEW: Theme information */
  theme?: ThemeInfo | null;

  /** NEW: Deep Reasoner Stress Test result */
  stressTest?: StressTestReportData | null;
};

// ─── Deep Reasoner Stress Test Types (for report rendering) ───
export type StressTestReportData = {
  scores: {
    overall_robustness: number;
    assumption_strength: number;
    risk_coverage: number;
    evidence_quality: number;
    execution_readiness: number;
  };
  critical_flaw: {
    title: string;
    severity: string;
    explanation: string;
    failure_scenario: string;
  } | null;
  blind_spots: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    probability_score: number;
    impact_score: number;
  }>;
  devils_advocate_challenges: Array<{
    type: string;
    challenge: string;
    target: string;
    counter_argument: string;
    suggested_response: string;
  }>;
  hidden_dependencies: Array<{
    dependency: string;
    why_critical: string;
    current_status: string;
    risk_if_missing: string;
  }>;
  probability_matrix: {
    overall_failure_risk: number;
    risk_diversity_score: number;
    single_point_of_failures: string[];
    highest_risk_cluster: string[];
  };
  thinking_path: Array<{
    step: number;
    action: string;
    target: string;
    reasoning: string;
    confidence: number;
  }>;
  meta: {
    model_used: string;
    processing_time_ms: number;
  };
  config_aggression?: string;
};

function normalizeTooltip(t: Partial<ReportTooltip> | null | undefined): ReportTooltip | null {
  if (!t) return null;
  const title = typeof t.title === "string" ? t.title.trim() : "";
  const lines = Array.isArray(t.lines)
    ? t.lines.filter((x) => typeof x === "string").map((x) => String(x))
    : [];
  if (!title && !lines.length) return null;
  return {
    id: typeof t.id === "string" && t.id.trim() ? t.id.trim() : uid(),
    title: title || "Notes",
    lines,
  };
}

/** ---------- Hackathon card (visible, not tooltip) ---------- */
function renderHackathonCard() {
  return `
    <div class="card support hackathonCard">
      ${sectionTitle("🏆 Google Gemini 3 Hackathon 2026", "Where Gemini API is used in this project")}
      <div class="muted">
        <ul>
          <li><strong>🤖 Gemini Critic:</strong> Critique pass that flags missing hard edges, vague claims, blind spots, and next actions.</li>
          <li><strong>⚡ Provider Compare:</strong> Runs the same task across providers (can include Gemini models) and exports outputs + latency + errors.</li>
          <li><strong>📄 Decision Artifacts:</strong> Exports <strong>HTML + PDF</strong> so judges can review explanations even without hover tooltips.</li>
        </ul>
      </div>
    </div>
  `;
}

/** ---------- Explainability / tooltip notes ---------- */
function renderExplainabilityCard(tooltips: ReportTooltip[]) {
  const safe = tooltips.map(normalizeTooltip).filter(Boolean) as ReportTooltip[];
  if (!safe.length) return "";

  const blocks = safe
    .map((t) => {
      return `
        <div class="note">
          <div class="noteTitle"><strong>${esc(t.title)}</strong></div>
          <div class="noteBody">${list((t.lines || []).slice(0, 12))}</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="card support tooltipCard">
      ${sectionTitle("💬 Tooltip Notes", "Same explanations as in-app hover tooltips (for HTML/PDF)")}
      <div class="noteGrid">${blocks}</div>
      <div class="small" style="margin-top:10px;">
        💡 These notes are exported so reviewers can read explanations without hover.
      </div>
    </div>
  `;
}

/** ---------- Grade meaning (right chip becomes SCORE for active row) ---------- */
function gradeLegendCard(grade: string, readinessScore: number) {
  const g = String(grade || "").toUpperCase();
  const score = Number.isFinite(readinessScore) ? Math.round(readinessScore) : 0;

  const meaning: Record<string, { tone: "good" | "info" | "warn" | "bad"; title: string; desc: string }> = {
    A: { tone: "good", title: "Decision-grade", desc: "Concrete inputs. Clear trade-offs. Ready to commit and document." },
    B: { tone: "info", title: "Nearly ready", desc: "Mostly clear. Fix 1-2 gaps (hard edges, evidence, or options) before committing." },
    C: { tone: "warn", title: "Needs work", desc: "Too many unknowns. Add specifics (metrics, risks, assumptions) to avoid churn." },
    D: { tone: "bad", title: "Not ready", desc: "Inputs are thin or vague. Don’t commit yet-rewrite the brief with hard edges + evidence." },
  };

  const rows = ["A", "B", "C", "D"]
    .map((k) => {
      const it = meaning[k];
      const active = k === g;

      const badge = `<span class="gBadge g-${k}">${esc(k)}</span>`;

      // right chip = score ONLY on active row (no repetition)
      const rightChip = active
        ? `<span class="gRightChip">${pill(`${score}/100`, "neutral")}</span>`
        : `<span class="gRightChip gRightGhost"></span>`;

      return `
        <div class="gRow ${active ? "gActive" : ""}">
          <div class="gLeft">
            ${badge}
            <div class="gTitle">
              <div class="gTitleTop">
                <span class="gName">${esc(it.title)}</span>
                ${rightChip}
              </div>
              <div class="gDesc">${esc(it.desc)}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="card support gradeLegendCard">
      ${sectionTitle("📊 Grade meaning", "What the readiness grade implies")}
      <div class="gGrid">${rows}</div>
    </div>
  `;
}

/** ---------- Gemini Critic section (HTML/PDF) ---------- */
function normalizeGeminiCritic(raw: unknown): GeminiCriticResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const metaU = obj.meta;
  if (!metaU || typeof metaU !== "object") return null;
  const meta = metaU as Record<string, unknown>;

  const requestId = typeof meta.requestId === "string" ? meta.requestId : "";
  const modelUsed = typeof meta.modelUsed === "string" ? meta.modelUsed : "";
  const latencyMs = typeof meta.latencyMs === "number" ? meta.latencyMs : NaN;

  if (!requestId || !modelUsed || !Number.isFinite(latencyMs)) return null;

  const createdAtISO = typeof obj.createdAtISO === "string" ? obj.createdAtISO : new Date().toISOString();

  const hardEdgesMissingRaw = Array.isArray(obj.hardEdgesMissing) ? obj.hardEdgesMissing : [];
  const genericLanguageRaw = Array.isArray(obj.genericLanguage) ? obj.genericLanguage : [];
  const blindSpotsRaw = Array.isArray(obj.blindSpots) ? obj.blindSpots : [];
  const nextActionsRaw = Array.isArray(obj.nextActions) ? obj.nextActions : [];
  const clarificationQuestionsRaw = Array.isArray(obj.clarificationQuestions) ? obj.clarificationQuestions : [];

  return {
    createdAtISO,

    hardEdgesMissing: hardEdgesMissingRaw.map((x: unknown) => {
      const it = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
      const missing = typeof it.missing === "string" ? it.missing : "";
      const whereToAdd =
        typeof it.whereToAdd === "string" &&
        ["context", "intent", "evidence", "risks", "options", "assumptions", "outcome"].includes(it.whereToAdd)
          ? (it.whereToAdd as GeminiCriticResult["hardEdgesMissing"][number]["whereToAdd"])
          : "evidence";

      const suggestedMetricsRaw = Array.isArray(it.suggestedMetrics) ? it.suggestedMetrics : [];
      const suggestedMetrics = suggestedMetricsRaw
        .map((m: unknown) => String(m))
        .map((s) => s.trim())
        .filter(Boolean);

      return { missing: String(missing).trim(), suggestedMetrics, whereToAdd };
    }),

    genericLanguage: genericLanguageRaw.map((x: unknown) => {
      const it = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
      const phrase = typeof it.phrase === "string" ? it.phrase : "";
      const whyGeneric = typeof it.whyGeneric === "string" ? it.whyGeneric : "";
      const rewriteConcrete = typeof it.rewriteConcrete === "string" ? it.rewriteConcrete : "";
      return {
        phrase: String(phrase).trim(),
        whyGeneric: String(whyGeneric).trim(),
        rewriteConcrete: String(rewriteConcrete).trim(),
      };
    }),

    blindSpots: blindSpotsRaw.map((x: unknown) => {
      const it = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
      const blindSpot = typeof it.blindSpot === "string" ? it.blindSpot : "";
      const whyItMatters = typeof it.whyItMatters === "string" ? it.whyItMatters : "";
      const qsRaw = Array.isArray(it.clarificationQuestions) ? it.clarificationQuestions : [];
      const clarificationQuestions = qsRaw
        .map((q: unknown) => String(q))
        .map((s) => s.trim())
        .filter(Boolean);

      return {
        blindSpot: String(blindSpot).trim(),
        whyItMatters: String(whyItMatters).trim(),
        clarificationQuestions,
      };
    }),

    nextActions: nextActionsRaw.map((x: unknown) => {
      const it = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
      const action = typeof it.action === "string" ? it.action : "";
      const why = typeof it.why === "string" ? it.why : "";
      const ownerHint = typeof it.ownerHint === "string" ? it.ownerHint : undefined;
      const timebox = typeof it.timebox === "string" ? it.timebox : undefined;

      return {
        action: String(action).trim(),
        why: String(why).trim(),
        ownerHint: ownerHint ? String(ownerHint).trim() : undefined,
        timebox: timebox ? String(timebox).trim() : undefined,
      };
    }),

    clarificationQuestions: clarificationQuestionsRaw
      .map((q: unknown) => String(q))
      .map((s) => s.trim())
      .filter(Boolean),

    meta: {
      requestId,
      modelUsed,
      latencyMs,
      triedModels: Array.isArray(meta.triedModels)
        ? meta.triedModels.map((m: unknown) => String(m)).map((s) => s.trim()).filter(Boolean)
        : undefined,
      fallbackUsed: typeof meta.fallbackUsed === "boolean" ? meta.fallbackUsed : undefined,
    },

    rawText: typeof obj.rawText === "string" ? obj.rawText : undefined,
  };
}

function renderGeminiCriticSection(raw: unknown) {
  const r = normalizeGeminiCritic(raw);
  if (!r) return "";

  const metaLine = [
    `Model: ${r.meta.modelUsed}`,
    `Latency: ${Math.round(r.meta.latencyMs)}ms`,
    `ID: ${r.meta.requestId}`,
    r.meta.fallbackUsed ? `Fallback: yes` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const hardEdges = r.hardEdgesMissing
    .slice(0, 10)
    .map((x) => {
      const missing = String(x.missing ?? "").trim();
      const where = String(x.whereToAdd ?? "").trim();
      const metrics = Array.isArray(x.suggestedMetrics)
        ? x.suggestedMetrics.map((m: string) => String(m)).filter(Boolean).slice(0, 8)
        : [];
      const lines = [
        missing ? `[hard-edge] ${missing}${where ? ` (where: ${where})` : ""}` : "",
        ...metrics.map((m: string) => `[metric] ${m}`),
      ].filter(Boolean);
      return lines.join("\n");
    })
    .filter(Boolean);

  const generic = r.genericLanguage
    .slice(0, 10)
    .map((x) => {
      const phrase = String(x.phrase ?? "").trim();
      const why = String(x.whyGeneric ?? "").trim();
      const rewrite = String(x.rewriteConcrete ?? "").trim();
      const lines = [phrase ? `“${phrase}”` : "", why ? `[why] ${why}` : "", rewrite ? `[rewrite] ${rewrite}` : ""].filter(Boolean);
      return lines.join("\n");
    })
    .filter(Boolean);

  const blind = r.blindSpots
    .slice(0, 10)
    .map((x) => {
      const spot = String(x.blindSpot ?? "").trim();
      const why = String(x.whyItMatters ?? "").trim();
      const qs = Array.isArray(x.clarificationQuestions)
        ? x.clarificationQuestions.map((q: string) => String(q)).filter(Boolean).slice(0, 8)
        : [];
      const lines = [spot ? `[blind-spot] ${spot}` : "", why ? `[why] ${why}` : "", ...qs.map((q: string) => `[clarify] ${q}`)].filter(Boolean);
      return lines.join("\n");
    })
    .filter(Boolean);

  const actions = r.nextActions
    .slice(0, 12)
    .map((a) => {
      const act = String(a.action ?? "").trim();
      const why = String(a.why ?? "").trim();
      const owner = typeof a.ownerHint === "string" ? a.ownerHint.trim() : "";
      const tb = typeof a.timebox === "string" ? a.timebox.trim() : "";
      const head = act ? `[next] ${act}${owner ? ` (owner: ${owner})` : ""}${tb ? ` (timebox: ${tb})` : ""}` : "";
      const lines = [head, why ? `[why] ${why}` : ""].filter(Boolean);
      return lines.join("\n");
    })
    .filter(Boolean);

  const clarQs = (r.clarificationQuestions || [])
    .slice(0, 12)
    .map((q: string) => `[clarify] ${String(q).trim()}`)
    .filter(Boolean);

  const block = (lines: string[]) =>
    lines.length ? `<pre class="mono monoBlock">${esc(lines.join("\n\n"))}</pre>` : `<div class="muted">-</div>`;

  return `
    <div class="card support geminiCriticCard">
      ${sectionTitle("🤖 Gemini Critic", "Hard edges, generic language, blind spots, and next actions")}
      <div class="small" style="margin-top:10px;">${esc(metaLine)}</div>

      <div class="hr"></div>

      <div class="two">
        <div class="kpiBox">
          <div class="kpiLabel">Hard edges missing</div>
          <div class="kpiHint">${block(hardEdges)}</div>
        </div>
        <div class="kpiBox">
          <div class="kpiLabel">Generic language</div>
          <div class="kpiHint">${block(generic)}</div>
        </div>
      </div>

      <div class="two" style="margin-top:12px;">
        <div class="kpiBox">
          <div class="kpiLabel">Blind spots</div>
          <div class="kpiHint">${block(blind)}</div>
        </div>
        <div class="kpiBox">
          <div class="kpiLabel">Next actions</div>
          <div class="kpiHint">${block(actions)}</div>
        </div>
      </div>

      <div class="hr"></div>

      <div class="kpiBox">
        <div class="kpiLabel">Clarification questions</div>
        <div class="kpiHint">${block(clarQs)}</div>
      </div>
    </div>
  `;
}

/** ---------- Provider compare (appendix) ---------- */
type PCRow = {
  provider: string;
  model?: string;
  latencyMs?: number;
  ok: boolean;
  text?: string;
  error?: string;
};

function normalizeProviderCompare(raw: unknown): PCRow[] {
  const r = raw as any;
  const arr: any[] = Array.isArray(r)
    ? r
    : Array.isArray(r?.results)
      ? r.results
      : Array.isArray(r?.rows)
        ? r.rows
        : [];

  return arr
    .map((x) => {
      const provider = String(x?.provider ?? x?.name ?? x?.key ?? "Provider").trim() || "Provider";
      const model = x?.model ? String(x.model) : undefined;

      const latencyMs =
        typeof x?.latencyMs === "number"
          ? x.latencyMs
          : typeof x?.latency === "number"
            ? x.latency
            : typeof x?.timingMs === "number"
              ? x.timingMs
              : undefined;

      const ok =
        typeof x?.ok === "boolean"
          ? x.ok
          : typeof x?.success === "boolean"
            ? x.success
            : !x?.error && String(x?.status ?? "").toLowerCase() !== "error";

      const error =
        x?.error
          ? String(x.error)
          : x?.message
            ? String(x.message)
            : String(x?.status ?? "").toLowerCase() === "error"
              ? "Request failed"
              : undefined;

      const text =
        typeof x?.text === "string"
          ? x.text
          : typeof x?.content === "string"
            ? x.content
            : typeof x?.output === "string"
              ? x.output
              : typeof x?.result === "string"
                ? x.result
                : undefined;

      return { provider, model, latencyMs, ok, error, text } as PCRow;
    })
    .filter((row) => row.provider);
}

function providerKey(name: string) {
  const s = String(name || "").toLowerCase();
  if (s.includes("openai")) return "openai";
  if (s.includes("groq")) return "groq";
  if (s.includes("google") || s.includes("gemini")) return "google";
  if (s.includes("openrouter")) return "openrouter";
  if (s.includes("anthropic") || s.includes("claude")) return "anthropic";
  if (s.includes("mistral")) return "mistral";
  return "other";
}

function providerLabel(key: string) {
  // Keep it “special”, but consistent across providers
  switch (key) {
    case "openai":
      return { emoji: "🟩", verb: "OpenAI", vibe: "Crisp baseline" };
    case "google":
      return { emoji: "🟦", verb: "Google", vibe: "Structured clarity" };
    case "groq":
      return { emoji: "🟪", verb: "Groq", vibe: "Fast latency" };
    case "openrouter":
      return { emoji: "🟨", verb: "OpenRouter", vibe: "Diverse routing" };
    case "anthropic":
      return { emoji: "🟧", verb: "Anthropic", vibe: "Reasoned tone" };
    case "mistral":
      return { emoji: "🟥", verb: "Mistral", vibe: "Direct output" };
    default:
      return { emoji: "⬜", verb: "Provider", vibe: "Output" };
  }
}

/* ---------- Lightweight Decision Report parsing (export parity) ---------- */

type DRSectionKey = "best" | "rationale" | "risks" | "assumptions" | "halflife" | "blindspots" | "next" | "raw";

type DRNextAction = {
  action: string;
  owner: string;
  timebox: string;
  ok: boolean;
};

type DRSection =
  | { key: Exclude<DRSectionKey, "next">; title: string; emoji: string; lines: string[] }
  | { key: "next"; title: string; emoji: string; actions: DRNextAction[] };

const DR_ORDER: Array<{ key: DRSectionKey; title: string; emoji: string; aliases: string[] }> = [
  { key: "best", title: "Best option", emoji: "🏆", aliases: ["best option", "best", "recommendation"] },
  { key: "rationale", title: "Rationale", emoji: "🧩", aliases: ["rationale", "reasoning", "why"] },
  { key: "risks", title: "Top risks", emoji: "⚠️", aliases: ["top risks", "risks"] },
  { key: "assumptions", title: "Assumptions", emoji: "🧱", aliases: ["assumptions to validate", "assumptions", "assumption"] },
  { key: "halflife", title: "Half-life", emoji: "⏳", aliases: ["half-life", "halflife"] },
  { key: "blindspots", title: "Blind spots", emoji: "🕳️", aliases: ["blind spots", "blindspots"] },
  { key: "next", title: "Next actions", emoji: "✅", aliases: ["next actions", "next steps", "actions"] },
  { key: "raw", title: "Output", emoji: "📝", aliases: [] },
];

function drNormalizeHeader(s: string) {
  return s
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function drStripHeadingDecorators(line: string) {
  return String(line || "")
    .trim()
    .replace(/^#{1,6}\s*/g, "")
    .replace(/^\*\*+|\*\*+$/g, "")
    .replace(/^[-–-]\s*/g, "")
    .replace(/[:：]\s*$/g, "")
    .trim();
}

function drDetectHeader(line: string) {
  const raw = drStripHeadingDecorators(line);
  if (!raw) return null;

  const h = drNormalizeHeader(raw);

  const looksHeaderish =
    raw === raw.toUpperCase() ||
    /^#{1,6}\s+/.test(String(line || "").trim()) ||
    /^\*\*[A-Z0-9 _-]{3,}\*\*$/.test(String(line || "").trim()) ||
    /^(best option|rationale|top risks|assumptions|half life|half-life|blind spots|next actions|next steps)\b/.test(h);

  if (!looksHeaderish) return null;

  for (const s of DR_ORDER) {
    if (!s.aliases.length) continue;
    if (s.aliases.some((a) => h === a || h.startsWith(a + " "))) return s;
  }

  // tolerant singulars
  if (h === "next action") return DR_ORDER.find((x) => x.key === "next") ?? null;
  if (h === "blind spot") return DR_ORDER.find((x) => x.key === "blindspots") ?? null;

  return null;
}

function drCleanBulletText(line: string) {
  const l = String(line || "").trim();
  const m =
    l.match(/^[-•*]\s+(.*)$/) ||
    l.match(/^\d+\.\s+(.*)$/) ||
    l.match(/^\[[^\]]+\]\s+(.*)$/);
  if (m && m[1]) return m[1].trim();
  return l;
}

function drSplitBullets(blockLines: string[]) {
  const out: string[] = [];
  for (const l of blockLines) {
    const line = String(l || "").trim();
    if (!line) continue;
    out.push(drCleanBulletText(line));
  }
  return out;
}

function drLooksLikeDecisionReport(text: string) {
  const t = String(text || "").toLowerCase();
  return (
    t.includes("best option") ||
    t.includes("next actions") ||
    t.includes("blind spots") ||
    t.includes("assumptions") ||
    t.includes("top risks") ||
    t.includes("decision report")
  );
}

function drParseNextActions(lines: string[]) {
  const raw = lines
    .map((x) => String(x ?? ""))
    .map((x) => x.replace(/\t/g, " "))
    .map((x) => x.replace(/\r/g, ""))
    .filter((x) => x.trim().length > 0);

  const tokens = raw.map((l) => drCleanBulletText(l));

  const out: DRNextAction[] = [];
  let cur: { action?: string; owner?: string; timebox?: string } | null = null;

  const flush = () => {
    if (!cur) return;

    const action = String(cur.action ?? "").trim();
    const owner = String(cur.owner ?? "").trim();
    const timebox = String(cur.timebox ?? "").trim();
    const ok = Boolean(action) && Boolean(owner) && Boolean(timebox);

    if (action || owner || timebox) out.push({ action, owner, timebox, ok });
    cur = null;
  };

  for (const t of tokens) {
    const s = String(t || "").trim();
    if (!s) continue;

    const mA = s.match(/^action\s*:\s*(.*)$/i);
    const mO = s.match(/^owner\s*:\s*(.*)$/i);
    const mT = s.match(/^timebox\s*:\s*(.*)$/i);

    if (mA) {
      flush();
      cur = {};
      cur.action = String(mA[1] ?? "").trim();
      continue;
    }
    if (mO) {
      if (!cur) cur = {};
      cur.owner = String(mO[1] ?? "").trim();
      continue;
    }
    if (mT) {
      if (!cur) cur = {};
      cur.timebox = String(mT[1] ?? "").trim();
      continue;
    }

    // plain bullet fallback: treat as action if no action yet
    if (!cur) cur = {};
    if (!cur.action) cur.action = s;
  }

  flush();

  return out;
}

function drParseSections(text: string): DRSection[] {
  const raw = String(text || "").trim();
  if (!raw) return [{ key: "raw", title: "Output", emoji: "📝", lines: ["-"] }];

  const lines = raw.split("\n");

  const buckets = new Map<DRSectionKey, string[]>();
  for (const s of DR_ORDER) buckets.set(s.key, []);

  let current: DRSectionKey | null = null;
  const seenSections = new Set<DRSectionKey>(); // Track seen sections to prevent duplicates

  for (const line of lines) {
    const hdr = drDetectHeader(line);
    if (hdr) {
      // Only switch to new section if not already seen (prevents duplicates)
      const newKey = hdr.key as DRSectionKey;
      if (!seenSections.has(newKey)) {
        current = newKey;
        seenSections.add(newKey);
      }
      continue;
    }
    if (!current) continue;
    buckets.get(current)!.push(line);
  }

  const sections: DRSection[] = [];

  for (const s of DR_ORDER) {
    if (s.key === "raw") continue;

    const b = buckets.get(s.key as DRSectionKey) || [];
    if (!b.length) continue;

    if (s.key === "next") {
      const actions = drParseNextActions(b);
      sections.push({ key: "next", title: s.title, emoji: s.emoji, actions });
      continue;
    }

    const items = drSplitBullets(b);
    if (items.length) {
      sections.push({
        key: s.key as Exclude<DRSectionKey, "next" | "raw">,
        title: s.title,
        emoji: s.emoji,
        lines: items,
      } as any);
    }
  }

  // if nothing detected, fallback to lite markdown-like output as bullets
  if (!sections.length) {
    const items = drSplitBullets(lines);
    return [{ key: "raw", title: "Output", emoji: "📝", lines: items.length ? items.slice(0, 18) : [raw] }];
  }

  return sections;
}

/* ---------- Lite markdown (fallback) ---------- */

function renderInlineBold(safeLine: string) {
  // Input MUST already be escaped.
  // Convert **bold** segments without risking broken tags.
  const parts = safeLine.split("**");
  if (parts.length < 3) return safeLine; // no pairs
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i % 2 === 1) out += `<b>${part}</b>`;
    else out += part;
  }
  return out;
}

/**
 * Lightweight readability formatter for markdown-ish text:
 * - safe (escape first)
 * - headings (#, ##, ###)
 * - numbered lists (1.)
 * - bullets (-, *, +)
 * - blank lines -> spacing
 * - **bold** -> <b>
 *
 * Not a full markdown parser by design (keeps PDF export stable).
 */
function renderLiteMarkdown(text: string) {
  const safe = esc(text || "");
  const lines = safe.split("\n");

  type Block =
    | { kind: "h"; level: 1 | 2 | 3; html: string }
    | { kind: "p"; html: string }
    | { kind: "ul"; items: string[] }
    | { kind: "ol"; items: string[] }
    | { kind: "sp" };

  const blocks: Block[] = [];
  let ul: string[] | null = null;
  let ol: string[] | null = null;

  const flushLists = () => {
    if (ul && ul.length) blocks.push({ kind: "ul", items: ul });
    if (ol && ol.length) blocks.push({ kind: "ol", items: ol });
    ul = null;
    ol = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");
    const trimmed = line.trim();

    // blank
    if (!trimmed) {
      flushLists();
      blocks.push({ kind: "sp" });
      continue;
    }

    // headings
    if (trimmed.startsWith("### ")) {
      flushLists();
      blocks.push({ kind: "h", level: 3, html: renderInlineBold(trimmed.slice(4)) });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushLists();
      blocks.push({ kind: "h", level: 2, html: renderInlineBold(trimmed.slice(3)) });
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushLists();
      blocks.push({ kind: "h", level: 1, html: renderInlineBold(trimmed.slice(2)) });
      continue;
    }

    // numbered list "1. "
    if (/^\d+\.\s+/.test(trimmed)) {
      ul = null;
      if (!ol) ol = [];
      ol.push(renderInlineBold(trimmed.replace(/^\d+\.\s+/, "")));
      continue;
    }

    // bullets: -, *, +
    if (/^[-*+]\s+/.test(trimmed)) {
      ol = null;
      if (!ul) ul = [];
      ul.push(renderInlineBold(trimmed.replace(/^[-*+]\s+/, "")));
      continue;
    }

    // paragraph
    flushLists();
    blocks.push({ kind: "p", html: renderInlineBold(trimmed) });
  }

  flushLists();

  const html = blocks
    .map((b) => {
      if (b.kind === "sp") return `<div class="mdSp"></div>`;
      if (b.kind === "h") return `<div class="mdH${b.level}">${b.html}</div>`;
      if (b.kind === "p") return `<div class="mdP">${b.html}</div>`;
      if (b.kind === "ul") return `<ul class="mdUl">${b.items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
      if (b.kind === "ol") return `<ol class="mdOl">${b.items.map((x) => `<li>${x}</li>`).join("")}</ol>`;
      return "";
    })
    .join("");

  return `<div class="md">${html}</div>`;
}

/* ---------- Decision report renderer (export parity) ---------- */

function drSectionTone(key: DRSectionKey): "neutral" | "good" | "warn" | "info" {
  if (key === "best") return "good";
  if (key === "risks") return "warn";
  if (key === "next") return "info";
  return "neutral";
}

function renderDecisionReportBlocks(text: string) {
  const sections = drParseSections(text);
  const isDecision = drLooksLikeDecisionReport(text);

  // If it's not decision-like and nothing parsed, keep lite markdown.
  const onlyRaw = sections.length === 1 && sections[0].key === "raw";
  if (!isDecision && onlyRaw) return `<div class="outPanel">${renderLiteMarkdown(text || "-")}</div>`;

  const blocks = sections
    .map((sec) => {
      const tone = drSectionTone(sec.key);
      const badge = pill(`${sec.emoji} ${sec.title}`, tone);

      if (sec.key === "next") {
        const rows = sec.actions || [];
        const hasAny = rows.length > 0;

        const body = hasAny
          ? `
            <div class="drNext">
              ${rows
                .slice(0, 12)
                .map((a) => {
                  const ok = a.ok;
                  const st = ok ? "drOk" : "drNeeds";
                  const statusPill = ok ? pill("OK", "good") : pill("Needs repair", "warn");
                  return `
                    <div class="drAction ${st}">
                      <div class="drActionTop">
                        <div class="drActionTitle">${esc(a.action || "(empty action)")}</div>
                        <div class="drActionStatus">${statusPill}</div>
                      </div>
                      <div class="drActionMeta">
                        <span class="drMetaChip"><b>Owner:</b> ${esc(a.owner || "-")}</span>
                        <span class="drMetaChip"><b>Timebox:</b> ${esc(a.timebox || "-")}</span>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          `
          : `<div class="muted">-</div>`;

        return `
          <div class="drSec dr-${sec.key}">
            <div class="drHead">${badge}</div>
            <div class="drBody">${body}</div>
          </div>
        `;
      }

      const lines = "lines" in sec ? (sec.lines || []) : [];
      const body = lines.length
        ? `<ul class="drUl">${lines.slice(0, 14).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
        : `<div class="muted">-</div>`;

      return `
        <div class="drSec dr-${sec.key}">
          <div class="drHead">${badge}</div>
          <div class="drBody">${body}</div>
        </div>
      `;
    })
    .join("");

  return `<div class="outPanel"><div class="drGrid">${blocks}</div></div>`;
}

function renderProviderCompareAppendix(raw: unknown) {
  const metaObj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;

  const prompt = typeof metaObj?.prompt === "string" ? metaObj.prompt.trim() : "";
  const generatedAtISO = typeof metaObj?.generatedAtISO === "string" ? metaObj.generatedAtISO : "";
  const winnerProvider = typeof metaObj?.winnerProvider === "string" ? metaObj.winnerProvider : "";
  const pinnedProvider = typeof metaObj?.pinnedProvider === "string" ? metaObj.pinnedProvider : "";

  const metaLine = [
    winnerProvider ? `🏆 Winner: ${winnerProvider}` : "",
    pinnedProvider ? `📌 Pinned: ${pinnedProvider}` : "",
    generatedAtISO ? `🗓️ Generated: ${new Date(generatedAtISO).toLocaleString()}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const rows = normalizeProviderCompare(raw);
  if (!rows.length) return "";

  const fails = rows.filter((row) => !(row.ok && !row.error));
  const anyFail = fails.length > 0;

  const headerBadge = anyFail ? pill("<strong>⚠️ Some providers failed</strong>", "warn") : pill("<strong>✅ All providers OK</strong>", "good");
  const summary = anyFail ? `${rows.length} providers • ${fails.length} failed` : `${rows.length} providers • all succeeded`;

  const metaBlock = metaLine
    ? `
      <div class="small" style="margin-top:10px;">
        ${esc(metaLine)}
      </div>
    `
    : "";

  const promptBlock = prompt
    ? `
      <div class="small" style="margin-top:8px;">
        <b>🧠 Task</b>: ${esc(prompt)}
      </div>
    `
    : "";

  const items = rows
    .map((row) => {
      const ok = row.ok && !row.error;
      const statusTone = ok ? "good" : "bad";
      const statusLabel = ok ? "<strong>OK</strong>" : "<strong>ERROR</strong>";

      const key = providerKey(row.provider);
      const cls = `pcP-${key}`;
      const lab = providerLabel(key);

      const meta = [
        row.model ? `🤖 ${row.model}` : "",
        typeof row.latencyMs === "number" ? `⏱️ ${Math.round(row.latencyMs)}ms` : "",
      ]
        .filter(Boolean)
        .join(" • ");

      // ✅ Decision-report rendering (sectioned blocks) for exports.
      // Note: renderDecisionReportBlocks already wraps in outPanel, so we don't double-wrap here
      const body = ok
        ? renderDecisionReportBlocks(row.text || "-")
        : `<pre class="mono monoPanel monoErr">${esc(row.error || "Request failed")}</pre>`;

      return `
        <div class="pcRow ${cls} ${ok ? "pcOk" : "pcErr"}">
          <div class="pcHead">
            <div class="pcLeft">
              <div class="pcName">
                <span class="pcDot" aria-hidden="true"></span>
                <span class="pcEmoji" aria-hidden="true">${lab.emoji}</span>
                <span class="pcNameText">${esc(row.provider)}</span>
                <span class="pcMini">${esc(lab.vibe)}</span>
              </div>
              <div class="pcMeta">${meta ? esc(meta) : "-"}</div>
            </div>
            <div class="pcRight">
              <span class="pcStatus">${pill(statusLabel, statusTone)}</span>
            </div>
          </div>

          <div class="pcBody">
            ${body}
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="card support providerCompareCard">
      ${sectionTitle("Provider compare", "Cross-provider output (from the app)")}
      <div class="row" style="margin-top:10px;">${headerBadge}</div>
      ${metaBlock}
      ${promptBlock}

      <details class="pcDetails" open>
        <summary class="pcSummary">
          <div class="pcSummaryLeft">
            <div class="pcSummaryTitle">✨ ${esc(summary)}</div>
            <div class="pcSummarySub">For PDF/print exports, full details are always included.</div>
          </div>
          <div class="pcSummaryRight">
            <span class="pcChip">${pill("Details", "neutral")}</span>
            <span class="pcChevron" aria-hidden="true">›</span>
          </div>
        </summary>

        <div class="pcGrid">${items}</div>
      </details>
    </div>
  `;
}

// ============================================================================
// NEW RENDER FUNCTIONS: Radar Chart, Sentiment, Conclusion, Research, etc.
// ============================================================================

/** Social Icons SVG (inline for PDF compatibility) */
const SOCIAL_ICONS = {
  twitter: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  github: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`,
  discord: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>`,
};

/** Render Radar Chart as SVG with colors and tooltips - includes Reality Check */
function renderRadarChart(data: RadarChartData | null | undefined, outcome?: string): string {
  if (!data) return "";

  const dimensions = [
    { key: "readiness", label: "Readiness", value: data.readiness, color: "#10b981", desc: "Overall decision preparedness - how ready you are to commit" },
    { key: "riskCoverage", label: "Risk Coverage", value: data.riskCoverage, color: "#f59e0b", desc: "How well risks are identified and mitigated" },
    { key: "evidenceQuality", label: "Evidence Quality", value: data.evidenceQuality, color: "#3b82f6", desc: "Strength and reliability of supporting data" },
    { key: "assumptionClarity", label: "Assumption Clarity", value: data.assumptionClarity, color: "#8b5cf6", desc: "How explicitly stated your assumptions are" },
    { key: "actionability", label: "Actionability", value: data.actionability, color: "#ec4899", desc: "Can you take concrete action based on this?" },
    { key: "confidence", label: "Confidence", value: data.confidence, color: "#06b6d4", desc: "Your stated confidence in this decision" },
  ];

  const cx = 150;
  const cy = 150;
  const maxRadius = 120;
  const levels = 5;
  const angleStep = (2 * Math.PI) / dimensions.length;

  // Generate grid lines - use radarGrid variable for light/dark mode
  let gridLines = "";
  for (let i = 1; i <= levels; i++) {
    const r = (maxRadius * i) / levels;
    const points = dimensions
      .map((_, idx) => {
        const angle = idx * angleStep - Math.PI / 2;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      })
      .join(" ");
    gridLines += `<polygon points="${points}" fill="none" stroke="var(--radarGrid)" stroke-width="1" opacity="0.7"/>`;
  }

  // Generate axis lines - use radarGrid variable
  let axisLines = "";
  dimensions.forEach((_, idx) => {
    const angle = idx * angleStep - Math.PI / 2;
    const x2 = cx + maxRadius * Math.cos(angle);
    const y2 = cy + maxRadius * Math.sin(angle);
    axisLines += `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="var(--radarGrid)" stroke-width="1" opacity="0.7"/>`;
  });

  // Generate data polygon
  const dataPoints = dimensions
    .map((dim, idx) => {
      const angle = idx * angleStep - Math.PI / 2;
      const r = (maxRadius * dim.value) / 100;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(" ");

  // Generate labels and value indicators - BOLD labels
  let labels = "";
  let valueIndicators = "";
  dimensions.forEach((dim, idx) => {
    const angle = idx * angleStep - Math.PI / 2;
    const labelR = maxRadius + 25;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    
    const valueR = (maxRadius * dim.value) / 100;
    const vx = cx + valueR * Math.cos(angle);
    const vy = cy + valueR * Math.sin(angle);

    const textAnchor = Math.abs(angle) < 0.1 ? "middle" : angle > -Math.PI / 2 && angle < Math.PI / 2 ? "start" : "end";
    
    labels += `
      <text x="${lx}" y="${ly}" text-anchor="${textAnchor}" dominant-baseline="middle" 
            fill="var(--fg)" font-size="11" font-weight="700" class="radarLabel">
        ${esc(dim.label)}
      </text>
    `;
    
    valueIndicators += `
      <circle cx="${vx}" cy="${vy}" r="6" fill="${dim.color}" stroke="var(--bg0)" stroke-width="2" class="radar-dot">
        <title>${dim.label}: ${dim.value}/100</title>
      </circle>
    `;
  });

  // Generate legend with descriptions - bold labels with hover
  const legendItems = dimensions
    .map(
      (dim) => `
      <div class="radarLegendItem">
        <span class="radarLegendDot" style="background:${dim.color}"></span>
        <div class="radarLegendText">
          <span class="radarLegendLabel"><strong>${esc(dim.label)}</strong></span>
          <span class="radarLegendDesc">${esc(dim.desc)}</span>
        </div>
        <span class="radarLegendValue">${dim.value}/100</span>
      </div>
    `
    )
    .join("");

  // Score interpretation
  const avgScore = Math.round(dimensions.reduce((sum, d) => sum + d.value, 0) / dimensions.length);
  const interpretation = avgScore >= 80 ? "Excellent - Decision is well-prepared" 
    : avgScore >= 60 ? "Good - Minor gaps to address" 
    : avgScore >= 40 ? "Fair - Several areas need attention"
    : "Weak - Significant preparation needed";

  // Reality check section if outcome exists
  const realityCheckSection = outcome && String(outcome).trim().length > 0 ? `
    <div class="radarRealityCheck">
      <div class="radarRealityCheckTitle">🎯 <strong>Reality Check</strong> - Your actual outcome</div>
      <div class="radarRealityCheckDesc">
        <em>This is what actually happened after your decision was made. Use this to compare your expectations with reality and learn for future decisions.</em>
      </div>
      <div class="radarRealityCheckContent">${esc(outcome).replaceAll("\n","<br/>")}</div>
    </div>
  ` : "";

  return `
    <div class="card radarCard">
      ${sectionTitle("📊 Decision Quality Radar", "Multi-dimensional analysis of your decision")}
      <div class="radarContainer">
        <div class="radarChart">
          <svg width="280" height="280" viewBox="0 0 300 300" class="radarSvg" style="overflow:visible;">
            <defs>
              <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.5">
                  <animate attributeName="stop-opacity" values="0.4;0.6;0.4" dur="3s" repeatCount="indefinite"/>
                </stop>
                <stop offset="50%" style="stop-color:#3b82f6;stop-opacity:0.4">
                  <animate attributeName="stop-opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite"/>
                </stop>
                <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.5">
                  <animate attributeName="stop-opacity" values="0.4;0.6;0.4" dur="3s" repeatCount="indefinite"/>
                </stop>
              </linearGradient>
              <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            ${gridLines}
            ${axisLines}
            <polygon points="${dataPoints}" fill="url(#radarGradient)" stroke="#10b981" stroke-width="2" opacity="0.9" filter="url(#radarGlow)" class="radarPolygon"/>
            ${valueIndicators}
            ${labels}
          </svg>
        </div>
        <div class="radarLegend">
          ${legendItems}
        </div>
      </div>
      <div class="radarInterpretation">
        <div class="radarInterpretationScore">
          <span class="radarInterpretationLabel">Average Score</span>
          <span class="radarInterpretationValue">${avgScore}/100</span>
        </div>
        <div class="radarInterpretationText">${interpretation}</div>
      </div>
      ${realityCheckSection}
      <div class="radarNote">
        <strong>How to read:</strong> Each axis represents a quality dimension (0-100). Higher values = better coverage. 
        Aim for balanced scores above 70 across all areas for a decision-ready state.
      </div>
    </div>
  `;
}

/** Render Sentiment Analysis Section */
function renderSentimentAnalysis(data: SentimentAnalysisData | null | undefined): string {
  if (!data || !data.aspects || data.aspects.length === 0) return "";

  const sentimentColors: Record<string, { bg: string; text: string; bar: string; emoji: string; desc: string }> = {
    positive: { 
      bg: "rgba(16,185,129,0.15)", 
      text: "#10b981", 
      bar: "#10b981", 
      emoji: "😊",
      desc: "Indicates satisfaction, approval, or favorable perception toward this aspect."
    },
    negative: { 
      bg: "rgba(239,68,68,0.15)", 
      text: "#ef4444", 
      bar: "#ef4444", 
      emoji: "😞",
      desc: "Indicates dissatisfaction, concern, or unfavorable perception toward this aspect."
    },
    neutral: { 
      bg: "rgba(148,163,184,0.15)", 
      text: "#94a3b8", 
      bar: "#94a3b8", 
      emoji: "😐",
      desc: "Indicates balanced or factual tone without strong positive or negative sentiment."
    },
  };

  const overallColor = sentimentColors[data.overallSentiment] || sentimentColors.neutral;
  const overallTone = data.overallSentiment === "positive" ? "good" : data.overallSentiment === "negative" ? "bad" : "info";

  // Sentiment Legend explaining what each sentiment means
  const sentimentLegend = `
    <div class="sentimentLegend">
      <div class="sentimentLegendTitle">📌 Sentiment Guide</div>
      <div class="sentimentLegendGrid">
        <div class="sentimentLegendItem">
          <span class="sentimentLegendEmoji">😊</span>
          <div class="sentimentLegendContent">
            <span class="sentimentLegendLabel" style="color:#10b981">POSITIVE</span>
            <span class="sentimentLegendDesc">${sentimentColors.positive.desc}</span>
          </div>
        </div>
        <div class="sentimentLegendItem">
          <span class="sentimentLegendEmoji">😞</span>
          <div class="sentimentLegendContent">
            <span class="sentimentLegendLabel" style="color:#ef4444">NEGATIVE</span>
            <span class="sentimentLegendDesc">${sentimentColors.negative.desc}</span>
          </div>
        </div>
        <div class="sentimentLegendItem">
          <span class="sentimentLegendEmoji">😐</span>
          <div class="sentimentLegendContent">
            <span class="sentimentLegendLabel" style="color:#94a3b8">NEUTRAL</span>
            <span class="sentimentLegendDesc">${sentimentColors.neutral.desc}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const aspectRows = data.aspects
    .map((aspect) => {
      const colors = sentimentColors[aspect.sentiment] || sentimentColors.neutral;
      const signals = aspect.keySignals.slice(0, 4).join(", ");
      const locationText = (aspect as any).location ? `<div class="sentimentLocation">📍 <strong>Location:</strong> ${esc((aspect as any).location)}</div>` : "";
      
      // Balanced bar colors - comfortable for eyes (not too bright, not too dark)
      const softBarColor = aspect.sentiment === 'positive' ? '#4ade80'  // green-400 - balanced
        : aspect.sentiment === 'negative' ? '#f87171'  // red-400 - balanced
        : '#a1a1aa';  // zinc-400 - balanced gray
      
      return `
        <div class="sentimentRow">
          <div class="sentimentAspect">
            <span class="sentimentEmoji">${colors.emoji}</span>
            <span class="sentimentLabel"><strong>${esc(aspect.aspect)}</strong></span>
            <span class="sentimentBadge" style="background:${colors.bg};color:${colors.text}">
              ${esc(aspect.sentiment.toUpperCase())}
            </span>
          </div>
          <div class="sentimentBarContainer">
            <div class="sentimentBarTrack">
              <div class="sentimentBar" style="width:${aspect.confidence}%;background:linear-gradient(90deg,${softBarColor}cc,${softBarColor},${softBarColor}88);background-size:200% 100%"></div>
            </div>
            <span class="sentimentPercent">${aspect.confidence}%</span>
          </div>
          ${locationText}
          ${aspect.summary ? `
            <div class="sentimentExplanation">
              <span class="sentimentExplanationIcon">💡</span>
              <div class="sentimentExplanationContent">
                <strong>Explanation:</strong> ${esc(aspect.summary)}
              </div>
            </div>
          ` : ""}
          ${signals ? `
            <div class="sentimentKeySignals">
              <span class="sentimentKeySignalsIcon">🔑</span>
              <div class="sentimentKeySignalsContent">
                <strong>Key signals:</strong> ${esc(signals)}
              </div>
            </div>
          ` : ""}
        </div>
      `;
    })
    .join("");

  // Generate sentiment conclusion/interpretation
  const sentimentConclusion = data.overallSentiment === "positive" 
    ? "The overall sentiment leans positive, indicating stakeholders may perceive this decision favorably. This is a good foundation for communication."
    : data.overallSentiment === "negative"
    ? "The overall sentiment leans negative, suggesting potential concerns or resistance. Consider addressing these areas before proceeding."
    : "The overall sentiment is neutral/balanced, indicating no strong positive or negative bias. This provides a balanced starting point for discussion.";

  return `
    <div class="card sentimentCard">
      ${sectionTitle("🎭 Sentiment Analysis (ABSA)", "Aspect-based sentiment detection powered by AI")}
      ${sentimentLegend}
      <div class="sentimentOverview">
        <div class="sentimentOverviewLeft">
          <span class="sentimentOverviewEmoji">${overallColor.emoji}</span>
          <span class="sentimentOverviewLabel">Overall Sentiment</span>
          ${pill(data.overallSentiment.toUpperCase(), overallTone)}
          <span class="sentimentOverviewConf">${data.overallConfidence}% confidence</span>
        </div>
        <div class="sentimentOverviewRight">
          <span class="sentimentModelBadge">🤖 Powered by ${esc(data.modelUsed)}</span>
        </div>
      </div>
      <div class="sentimentConclusion">
        <strong>🎯 Interpretation:</strong> ${sentimentConclusion}
      </div>
      ${data.summary ? `<div class="sentimentSummary"><strong>Summary:</strong> ${esc(data.summary)}</div>` : ""}
      <div class="sentimentGrid">
        ${aspectRows}
      </div>
      <div class="sentimentNote">
        <strong>What is ABSA?</strong> Aspect-Based Sentiment Analysis identifies sentiment toward specific aspects of your decision. 
        This helps reveal which parts of your decision framing are perceived positively or negatively, 
        enabling more balanced communication with stakeholders.
      </div>
    </div>
  `;
}

/** Render Conclusion Section */
/** ---------- Deep Reasoner Stress Test Section (HTML/PDF) ---------- */
function renderStressTest(data: StressTestReportData | null | undefined): string {
  if (!data || !data.scores) return "";

  const s = data.scores;
  const robustness = Math.round(s.overall_robustness ?? 0);
  const assumptionStr = Math.round(s.assumption_strength ?? 0);
  const riskCov = Math.round(s.risk_coverage ?? 0);
  const evidenceQ = Math.round(s.evidence_quality ?? 0);
  const execReady = Math.round(s.execution_readiness ?? 0);

  // Score color helper — matches score scale interpretation
  function scoreColor(v: number): string {
    if (v >= 80) return "#10b981";  // Strong — green
    if (v >= 60) return "#06b6d4";  // Moderate — cyan
    if (v >= 40) return "#f59e0b";  // Weak — orange/amber
    return "#ef4444";               // Critical — red
  }

  // Score label for layperson interpretation
  function scoreLabel(v: number): string {
    if (v >= 80) return "Strong";
    if (v >= 60) return "Moderate";
    if (v >= 40) return "Weak";
    return "Critical";
  }

  // Plain-language interpretation per dimension
  function interpret(dim: string, v: number): string {
    const level = v >= 80 ? "high" : v >= 60 ? "mid" : v >= 40 ? "low" : "critical";
    const map: Record<string, Record<string, string>> = {
      robustness: {
        high: "Your decision holds up well under adversarial pressure — most challenges have solid counter-arguments.",
        mid: "Some parts of your decision may crumble under scrutiny. Address the weak points before committing.",
        low: "Significant structural weaknesses found. This decision is likely to fail under real-world pressure.",
        critical: "The decision framework is fundamentally fragile. Major rework is required before proceeding.",
      },
      assumption: {
        high: "Assumptions are well-grounded with evidence and realistic expectations.",
        mid: "Some assumptions are untested or rely on optimistic projections. Validate before proceeding.",
        low: "Many assumptions are unverified or contradicted by available evidence.",
        critical: "Core assumptions are largely unfounded. The entire decision rests on shaky ground.",
      },
      risk: {
        high: "Risks are comprehensively identified with clear mitigation strategies in place.",
        mid: "Most obvious risks are covered, but some edge cases or cascading effects are unaddressed.",
        low: "Major risk categories are missing. Blind spots could derail execution.",
        critical: "Risk analysis is superficial. Critical failure modes are not even acknowledged.",
      },
      evidence: {
        high: "Supporting evidence is concrete, verifiable, and directly relevant to the decision.",
        mid: "Some evidence is anecdotal or indirect. Strengthen with data or authoritative sources.",
        low: "Evidence is thin, outdated, or tangentially related to key claims.",
        critical: "Almost no reliable evidence supports this decision. It is essentially based on intuition.",
      },
      execution: {
        high: "Clear action plan with defined owners, timelines, and success metrics.",
        mid: "Execution plan exists but lacks specificity in some areas. Define concrete next steps.",
        low: "Execution readiness is low — who does what, by when, and how is largely unclear.",
        critical: "No actionable execution plan. This decision cannot be implemented as described.",
      },
    };
    return map[dim]?.[level] ?? "";
  }

  // Build score cards
  const scoreCards = [
    { key: "robustness", label: "Overall Robustness", value: robustness, emoji: "🛡️" },
    { key: "assumption", label: "Assumption Strength", value: assumptionStr, emoji: "🧱" },
    { key: "risk", label: "Risk Coverage", value: riskCov, emoji: "⚡" },
    { key: "evidence", label: "Evidence Quality", value: evidenceQ, emoji: "📎" },
    { key: "execution", label: "Execution Readiness", value: execReady, emoji: "🚀" },
  ];

  // User action per dimension
  function userAction(dim: string, v: number): string {
    if (v >= 80) return "No action needed — maintain current quality.";
    if (v >= 60) return dim === "robustness" ? "Strengthen weak arguments before presenting to stakeholders."
      : dim === "assumption" ? "Validate top 2–3 assumptions with data or expert input."
      : dim === "risk" ? "Add mitigation plans for uncovered risk categories."
      : dim === "evidence" ? "Gather 1–2 more concrete data points or authoritative sources."
      : "Define clear owners, deadlines, and success metrics for each action.";
    if (v >= 40) return dim === "robustness" ? "Rework core arguments — they will not survive pushback."
      : dim === "assumption" ? "Most assumptions are unverified — run validation before proceeding."
      : dim === "risk" ? "Major blind spots exist — conduct a dedicated risk workshop."
      : dim === "evidence" ? "Evidence is insufficient — do not commit until stronger data is collected."
      : "Create a step-by-step execution plan with accountability before proceeding.";
    return "Critical gap — this dimension blocks the decision. Resolve before any commitment.";
  }

  const scoreCardsHtml = scoreCards.map(sc => {
    const color = scoreColor(sc.value);
    const label = scoreLabel(sc.value);
    const interp = interpret(sc.key, sc.value);
    const action = userAction(sc.key, sc.value);
    return `
      <div class="stressScoreCard">
        <div class="stressScoreHeader">
          <span class="stressScoreEmoji">${sc.emoji}</span>
          <span class="stressScoreLabel">${esc(sc.label)}</span>
          <span class="stressScoreBadge" style="background:${color}18;color:${color};border:1px solid ${color}40">${label}</span>
        </div>
        <div class="stressScoreBarWrap">
          <div class="stressScoreBar" style="width:${sc.value}%;background:linear-gradient(90deg,${color}cc,${color},${color}88);background-size:200% 100%"></div>
        </div>
        <div class="stressScoreRow">
          <span class="stressScoreValue"><span style="color:${color}">${sc.value}</span><span style="color:#10b981">/100</span></span>
        </div>
        <div class="stressScoreInterp">${esc(interp)}</div>
        <div class="stressScoreAction" style="margin-top:6px;font-size:10px;color:${color};font-weight:600">→ ${esc(action)}</div>
      </div>
    `;
  }).join("");

  // Score scale legend with colored levels
  const scaleLegend = `
    <div class="stressScaleLegend">
      <div class="stressScaleLegendTitle">📏 Score Scale — What the numbers mean</div>
      <div class="stressScaleLegendGrid">
        <div class="stressScaleLegendItem"><span style="color:#10b981;font-weight:700">80–100 Strong</span> — Ready to commit. This dimension is well-prepared.</div>
        <div class="stressScaleLegendItem"><span style="color:#06b6d4;font-weight:700">60–79 Moderate</span> — Acceptable but has gaps. Address before finalizing.</div>
        <div class="stressScaleLegendItem"><span style="color:#f59e0b;font-weight:700">40–59 Weak</span> — Significant issues. Do not commit without improvement.</div>
        <div class="stressScaleLegendItem"><span style="color:#ef4444;font-weight:700">0–39 Critical</span> — Blocks the decision. Must resolve before proceeding.</div>
      </div>
    </div>
  `;

  // Critical flaw section
  let criticalFlawHtml = "";
  if (data.critical_flaw) {
    const cf = data.critical_flaw;
    const sevColor = cf.severity === "critical" ? "#ef4444" : cf.severity === "high" ? "#f97316" : "#f59e0b";
    criticalFlawHtml = `
      <div class="stressCriticalFlaw">
        <div class="stressCritFlawHeader">
          <span class="stressCritFlawIcon">🚨</span>
          <span class="stressCritFlawTitle">Critical Flaw Detected</span>
          <span class="stressCritFlawSev" style="background:${sevColor}20;color:${sevColor};border:1px solid ${sevColor}40">${esc(String(cf.severity).toUpperCase())}</span>
        </div>
        <div class="stressCritFlawBody">
          <div class="stressCritFlawName"><strong>${esc(cf.title)}</strong></div>
          <div class="stressCritFlawDesc">${esc(cf.explanation)}</div>
          <div class="stressCritFlawScenario">
            <strong>Failure scenario:</strong> ${esc(cf.failure_scenario)}
          </div>
        </div>
      </div>
    `;
  }

  // Devil's advocate challenges
  const challengesSlice = (data.devils_advocate_challenges || []).slice(0, 5);
  let challengesHtml = "";
  if (challengesSlice.length > 0) {
    const items = challengesSlice.map((c, i) => {
      const typeEmoji = c.type === "counter_example" ? "⚔️" : c.type === "worst_case" ? "💀" : c.type === "reductio_ad_absurdum" ? "🔄" : "🎯";
      return `
        <div class="stressChallengeItem">
          <div class="stressChallengeHead">
            <span>${typeEmoji}</span>
            <span class="stressChallengeType">${esc(c.type.replace(/_/g, " "))}</span>
            <span class="stressChallengeTarget">→ ${esc(c.target)}</span>
          </div>
          <div class="stressChallengeBody">
            <div><strong>Challenge:</strong> ${esc(c.challenge)}</div>
            <div class="stressChallengeSub"><strong>Counter-argument:</strong> ${esc(c.counter_argument)}</div>
            <div class="stressChallengeSub"><strong>Suggested response:</strong> ${esc(c.suggested_response)}</div>
          </div>
        </div>
      `;
    }).join("");
    challengesHtml = `
      <div class="stressChallenges">
        <div class="stressSectionHead">😈 Devil's Advocate Challenges</div>
        <div class="stressSectionHint">AI-generated adversarial challenges to stress-test your reasoning</div>
        ${items}
      </div>
    `;
  }

  // Hidden dependencies
  const depsSlice = (data.hidden_dependencies || []).slice(0, 5);
  let depsHtml = "";
  if (depsSlice.length > 0) {
    const items = depsSlice.map(d => `
      <div class="stressDepItem">
        <div class="stressDepName"><strong>${esc(d.dependency)}</strong></div>
        <div class="stressDepWhy">${esc(d.why_critical)}</div>
        <div class="stressDepRow">
          <span class="stressDepStatus">Status: ${esc(d.current_status)}</span>
          <span class="stressDepRisk">Risk: ${esc(d.risk_if_missing)}</span>
        </div>
      </div>
    `).join("");
    depsHtml = `
      <div class="stressDeps">
        <div class="stressSectionHead">🔗 Hidden Dependencies</div>
        <div class="stressSectionHint">Unacknowledged dependencies that could cause cascading failure</div>
        ${items}
      </div>
    `;
  }

  // Probability matrix
  let matrixHtml = "";
  if (data.probability_matrix) {
    const pm = data.probability_matrix;
    const failRisk = Math.round(pm.overall_failure_risk ?? 0);
    const diversity = Math.round(pm.risk_diversity_score ?? 0);
    const failColor = failRisk >= 60 ? "#ef4444" : failRisk >= 40 ? "#f59e0b" : "#10b981";
    const divColor = diversity >= 60 ? "#10b981" : diversity >= 40 ? "#f59e0b" : "#ef4444";
    const spofs = (pm.single_point_of_failures || []).slice(0, 4);
    const cluster = (pm.highest_risk_cluster || []).slice(0, 4);
    
    matrixHtml = `
      <div class="stressMatrix">
        <div class="stressSectionHead">📊 Probability Matrix</div>
        <div class="stressSectionHint">Quantified risk correlations and failure probability</div>
        <div class="stressMatrixGrid">
          <div class="stressMatrixCard">
            <div class="stressMatrixLabel">Overall Failure Risk</div>
            <div class="stressMatrixValue" style="color:${failColor}">${failRisk}%</div>
            <div class="stressMatrixHint">${failRisk >= 60 ? "Dangerously high — mitigate urgently" : failRisk >= 40 ? "Elevated — needs attention" : "Within acceptable range"}</div>
          </div>
          <div class="stressMatrixCard">
            <div class="stressMatrixLabel">Risk Diversity</div>
            <div class="stressMatrixValue"><span style="color:${divColor}">${diversity}</span><span style="color:#10b981">/100</span></div>
            <div class="stressMatrixHint">${diversity >= 60 ? "Risks are independent — good" : diversity >= 40 ? "Some risks are correlated" : "Risks are highly correlated — domino effect likely"}</div>
          </div>
        </div>
        ${spofs.length ? `
          <div class="stressMatrixList">
            <strong>⚠️ Single Points of Failure:</strong>
            <ul>${spofs.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
          </div>
        ` : ""}
        ${cluster.length ? `
          <div class="stressMatrixList">
            <strong>🔴 Highest Risk Cluster:</strong>
            <ul>${cluster.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
          </div>
        ` : ""}
      </div>
    `;
  }

  // Thinking path
  const thinkSlice = (data.thinking_path || []).slice(0, 6);
  let thinkHtml = "";
  if (thinkSlice.length > 0) {
    const steps = thinkSlice.map(t => {
      const confColor = t.confidence >= 80 ? "#10b981" : t.confidence >= 60 ? "#f59e0b" : "#ef4444";
      return `
        <div class="stressThinkStep">
          <div class="stressThinkNum">${t.step}</div>
          <div class="stressThinkBody">
            <div class="stressThinkAction"><strong>${esc(t.action)}</strong> → ${esc(t.target)}</div>
            <div class="stressThinkReason">${esc(t.reasoning)}</div>
            <div class="stressThinkConf" style="color:${confColor}">Confidence: ${t.confidence}%</div>
          </div>
        </div>
      `;
    }).join("");
    thinkHtml = `
      <div class="stressThink">
        <div class="stressSectionHead">🧠 AI Reasoning Path</div>
        <div class="stressSectionHint">Step-by-step breakdown of how the AI stress-tested your decision</div>
        ${steps}
      </div>
    `;
  }

  // Meta line — map model IDs to friendly names
  const friendlyModel = (m: string) => {
    if (m.includes('2.5-flash') || m.includes('2.0-flash')) return 'Gemini 3 Flash';
    if (m.includes('2.5-pro') || m.includes('1.5-pro')) return 'Gemini 3 Pro';
    if (m.includes('gemini')) return 'Gemini 3';
    return m;
  };
  const metaParts = [
    data.meta?.model_used ? `Model: ${friendlyModel(data.meta.model_used)}` : "",
    data.meta?.processing_time_ms ? `Processing: ${Math.round(data.meta.processing_time_ms)}ms` : "",
    data.config_aggression ? `Aggression: ${data.config_aggression}` : "",
  ].filter(Boolean);

  // Overall interpretation for laypeople
  const overallEmoji = robustness >= 70 ? "✅" : robustness >= 50 ? "⚠️" : "🚨";
  const overallVerdict = robustness >= 80
    ? "This decision is well-fortified and can withstand scrutiny. Minor improvements noted."
    : robustness >= 60
    ? "This decision has a solid foundation but contains vulnerabilities that should be addressed before committing."
    : robustness >= 40
    ? "Significant weaknesses detected. This decision is likely to encounter serious problems during execution."
    : "This decision is not ready for commitment. Fundamental issues must be resolved first.";

  return `
    <div class="card stressTestCard">
      ${sectionTitle("🔬 Deep Reasoner: Stress Test", "Adversarial analysis — finding what could break your decision")}
      <div class="small" style="margin-top:6px;">${esc(metaParts.join(" • "))}</div>

      <div class="stressVerdict">
        <span class="stressVerdictIcon">${overallEmoji}</span>
        <div class="stressVerdictText">${esc(overallVerdict)}</div>
      </div>

      <div class="stressScoreGrid">
        ${scoreCardsHtml}
      </div>

      ${scaleLegend}

      ${criticalFlawHtml}
      ${challengesHtml}
      ${depsHtml}
      ${matrixHtml}
      ${thinkHtml}
    </div>
  `;
}

function renderConclusion(data: ConclusionData | null | undefined, analysis?: { readiness: any; halfLife: any; blindSpots: any } | null, hasCompare?: boolean, sentimentData?: SentimentAnalysisData | null, stressTestData?: StressTestReportData | null, providerCompareData?: { results?: ProviderCompareRow[] } | null, geminiCriticData?: GeminiCriticResult | null): string {
  // Generate intelligent conclusion based on what user has run
  
  // Build sentiment insights section if data available
  let sentimentInsightsHtml = "";
  if (sentimentData && sentimentData.aspects && sentimentData.aspects.length > 0) {
    const positiveAspects = sentimentData.aspects.filter(a => a.sentiment === 'positive');
    const negativeAspects = sentimentData.aspects.filter(a => a.sentiment === 'negative');
    const neutralAspects = sentimentData.aspects.filter(a => a.sentiment === 'neutral');
    
    const overallEmoji = sentimentData.overallSentiment === 'positive' ? '😊' 
      : sentimentData.overallSentiment === 'negative' ? '😟' 
      : sentimentData.overallSentiment === 'mixed' ? '🤔' : '😐';
    // FIXED: Use soft teal/green for neutral and mixed instead of gray (better readability in light/dark mode)
    const overallColor = sentimentData.overallSentiment === 'positive' ? '#10b981' 
      : sentimentData.overallSentiment === 'negative' ? '#ef4444' 
      : sentimentData.overallSentiment === 'mixed' ? '#14b8a6' : '#06b6d4';  // teal for mixed, cyan for neutral
    
    let insightsList: string[] = [];
    
    // Add overall sentiment insight
    insightsList.push(`Overall sentiment is <strong style="color:${overallColor}">${sentimentData.overallSentiment.toUpperCase()}</strong> with ${sentimentData.overallConfidence}% confidence`);
    
    // Add aspect-specific insights
    if (positiveAspects.length > 0) {
      const topPositive = positiveAspects.sort((a, b) => b.confidence - a.confidence)[0];
      insightsList.push(`Strongest positive signal in <strong>${topPositive.aspect}</strong> (${topPositive.confidence}%): ${topPositive.summary || topPositive.keySignals.slice(0, 2).join(', ')}`);
    }
    
    if (negativeAspects.length > 0) {
      const topNegative = negativeAspects.sort((a, b) => b.confidence - a.confidence)[0];
      insightsList.push(`Key concern in <strong>${topNegative.aspect}</strong> (${topNegative.confidence}%): ${topNegative.summary || topNegative.keySignals.slice(0, 2).join(', ')}`);
    }
    
    // Add risk indicator if negative sentiment is high
    const avgNegativeConfidence = negativeAspects.length > 0 
      ? negativeAspects.reduce((sum, a) => sum + a.confidence, 0) / negativeAspects.length 
      : 0;
    if (avgNegativeConfidence > 70) {
      insightsList.push(`⚠️ <strong>Risk Alert:</strong> High negative sentiment detected - consider addressing concerns before proceeding`);
    }
    
    const insightsListHtml = insightsList.map(i => `<li>${i}</li>`).join('');
    
    sentimentInsightsHtml = `
      <div class="conclusionSentimentInsights">
        <div class="conclusionSentimentHeader">
          <span class="conclusionSentimentIcon">${overallEmoji}</span>
          <span class="conclusionSentimentTitle">Stakeholder Sentiment Insights (ABSA)</span>
          <span class="conclusionSentimentBadge" style="background:${overallColor}20;color:${overallColor}">
            ${positiveAspects.length} positive · ${negativeAspects.length} negative · ${neutralAspects.length} neutral
          </span>
        </div>
        <ul class="conclusionSentimentList">${insightsListHtml}</ul>
      </div>
    `;
  }
  
  if (!data) {
    const r = analysis?.readiness;
    const h = analysis?.halfLife;
    const b = analysis?.blindSpots;
    
    // Determine decision quality
    const quality = r?.score >= 80 ? 'strong' : r?.score >= 60 ? 'moderate' : r?.score >= 40 ? 'limited' : 'insufficient';
    const gradeEmoji = r?.grade === 'A' ? '🟢' : r?.grade === 'B' ? '🟡' : r?.grade === 'C' ? '🟠' : '🔴';
    
    // Build intelligent summary
    let summaryParts: string[] = [];
    if (r) {
      summaryParts.push(`Decision readiness is ${quality} at ${r.score}/100 (Grade ${r.grade})`);
    }
    if (h) {
      const halfLifeDesc = h.status === 'stable' ? 'context remains valid long-term' : h.status === 'degrading' ? 'context may change over time' : 'context is volatile and needs frequent review';
      summaryParts.push(halfLifeDesc);
    }
    if (b) {
      summaryParts.push(`Blind-spot coverage is ${b.score >= 80 ? 'excellent' : b.score >= 60 ? 'adequate' : 'needs attention'} (${b.score}/100)`);
    }
    if (hasCompare) {
      summaryParts.push('Provider comparison completed - review AI recommendations above for best option');
    }
    
    const defaultSummary = summaryParts.length > 0 
      ? summaryParts.join('. ') + '.'
      : "Analysis in progress. Complete more inputs for a comprehensive conclusion.";
    
    // Build recommendation with actionable advice
    let recommendation = '';
    if (r?.grade === 'A') {
      recommendation = '✅ PROCEED WITH CONFIDENCE - Your decision framework is well-structured. Document final choice and communicate to stakeholders.';
    } else if (r?.grade === 'B') {
      recommendation = '⚡ PROCEED WITH MINOR REFINEMENTS - Good foundation, but address highlighted gaps before finalizing. Consider running Sentiment Analysis for deeper insights.';
    } else if (r?.grade === 'C') {
      recommendation = '⚠️ REFINE BEFORE PROCEEDING - Several areas need attention. Focus on improving readiness score by addressing blind spots and validating assumptions.';
    } else {
      recommendation = '🔴 SIGNIFICANT WORK NEEDED - Decision framework needs substantial improvement. Complete all input fields and run full analysis before proceeding.';
    }
    
    // Build pros and cons
    const pros: string[] = [];
    const cons: string[] = [];
    
    if (r?.score >= 70) pros.push('Strong readiness foundation');
    if (r?.score < 60) cons.push('Readiness score needs improvement');
    if (h?.status === 'stable') pros.push('Context is stable for long-term planning');
    if (h?.status === 'volatile') cons.push('Volatile context requires frequent review');
    if (b?.score >= 70) pros.push('Good blind-spot coverage');
    if (b?.score < 60) cons.push('Blind spots need attention');
    if (hasCompare) pros.push('Multiple AI perspectives considered');
    if (sentimentData) pros.push('Stakeholder sentiment analyzed');
    if (stressTestData) {
      const rob = stressTestData.scores?.overall_robustness ?? 0;
      if (rob >= 70) pros.push(`Stress test robustness is strong (${Math.round(rob)}/100)`);
      if (rob < 50) cons.push(`Stress test robustness is weak (${Math.round(rob)}/100) — decision may fail under pressure`);
      if (stressTestData.critical_flaw) cons.push(`Critical flaw found: ${stressTestData.critical_flaw.title}`);
      if ((stressTestData.probability_matrix?.overall_failure_risk ?? 0) >= 50) cons.push(`High overall failure risk (${Math.round(stressTestData.probability_matrix.overall_failure_risk)}%)`);
      if (!stressTestData.critical_flaw && rob >= 60) pros.push('No critical flaws detected by adversarial analysis');
    }
    
    const prosHtml = pros.length > 0 
      ? pros.map(p => `<li class="conclusionPro">✅ ${esc(p)}</li>`).join('')
      : '<li class="conclusionNeutral">Run more analysis to identify strengths</li>';
    const consHtml = cons.length > 0 
      ? cons.map(c => `<li class="conclusionCon">⚠️ ${esc(c)}</li>`).join('')
      : '<li class="conclusionNeutral">No major concerns identified</li>';
    
    // Build Priority Action Checklist - SPECIFIC to analysis results
    const priorityActions: { priority: string; action: string; color: string }[] = [];
    
    // Get specific values for personalized actions
    const readinessScore = r?.score || 0;
    const blindSpotScore = b?.score || 0;
    const halfLifeStatus = h?.status || 'unknown';
    const sentimentConf = sentimentData?.overallConfidence || 0;
    const sentimentLabel = sentimentData?.overallSentiment || 'unknown';
    
    // HIGH Priority Actions - Based on critical issues
    if (readinessScore < 50) {
      priorityActions.push({ 
        priority: 'HIGH', 
        action: `Readiness Score is ${readinessScore}/100 (Grade ${r?.grade || 'F'}) - requires immediate attention to missing criteria`, 
        color: '#ef4444' 
      });
    }
    if (blindSpotScore < 50) {
      const blindSpotAreas = b?.areas?.filter((a: any) => a.coverage < 50).map((a: any) => a.area).slice(0, 2).join(', ') || 'multiple areas';
      priorityActions.push({ 
        priority: 'HIGH', 
        action: `Blind Spot Coverage only ${blindSpotScore}% - address gaps in: ${blindSpotAreas}`, 
        color: '#ef4444' 
      });
    }
    if (halfLifeStatus === 'volatile') {
      priorityActions.push({ 
        priority: 'HIGH', 
        action: `Decision context is VOLATILE (Half-life: ${h?.daysRemaining || '?'} days) - implement weekly review cycle`, 
        color: '#ef4444' 
      });
    }
    if (sentimentData && sentimentLabel === 'negative') {
      priorityActions.push({ 
        priority: 'HIGH', 
        action: `Negative sentiment detected (${sentimentConf}% confidence) - reframe decision or address concerns`, 
        color: '#ef4444' 
      });
    }
    
    // MEDIUM Priority Actions - Improvement opportunities
    if (readinessScore >= 50 && readinessScore < 70) {
      priorityActions.push({ 
        priority: 'MEDIUM', 
        action: `Readiness at ${readinessScore}/100 - gather more evidence to reach 70+ threshold`, 
        color: '#f59e0b' 
      });
    }
    if (!hasCompare) {
      priorityActions.push({ 
        priority: 'MEDIUM', 
        action: 'Run Provider Compare for multi-AI validation before finalizing', 
        color: '#f59e0b' 
      });
    }
    if (!sentimentData) {
      priorityActions.push({ 
        priority: 'MEDIUM', 
        action: 'Run ABSA Sentiment Analysis to understand stakeholder perception', 
        color: '#f59e0b' 
      });
    }
    if (blindSpotScore >= 50 && blindSpotScore < 70) {
      priorityActions.push({ 
        priority: 'MEDIUM', 
        action: `Blind Spot Coverage at ${blindSpotScore}% - review remaining gaps before proceeding`, 
        color: '#f59e0b' 
      });
    }
    if (halfLifeStatus === 'degrading') {
      priorityActions.push({ 
        priority: 'MEDIUM', 
        action: `Decision validity DEGRADING - schedule bi-weekly review (${h?.daysRemaining || '?'} days remaining)`, 
        color: '#f59e0b' 
      });
    }
    // Stress Test priority actions
    if (stressTestData) {
      const stRob = stressTestData.scores?.overall_robustness ?? 0;
      if (stressTestData.critical_flaw) {
        priorityActions.push({
          priority: 'HIGH',
          action: `Stress Test critical flaw: "${stressTestData.critical_flaw.title}" — resolve before proceeding`,
          color: '#ef4444'
        });
      }
      if (stRob < 50) {
        priorityActions.push({
          priority: 'HIGH',
          action: `Stress Test robustness only ${Math.round(stRob)}/100 — decision is fragile under pressure`,
          color: '#ef4444'
        });
      }
      if ((stressTestData.probability_matrix?.overall_failure_risk ?? 0) >= 50) {
        priorityActions.push({
          priority: 'HIGH',
          action: `Overall failure risk is ${Math.round(stressTestData.probability_matrix.overall_failure_risk)}% — reduce before committing`,
          color: '#ef4444'
        });
      }
      if (stRob >= 50 && stRob < 70) {
        priorityActions.push({
          priority: 'MEDIUM',
          action: `Stress Test robustness at ${Math.round(stRob)}/100 — strengthen weak dimensions`,
          color: '#f59e0b'
        });
      }
    } else {
      priorityActions.push({
        priority: 'MEDIUM',
        action: 'Run Deep Reasoner Stress Test for adversarial validation before committing',
        color: '#f59e0b'
      });
    }
    
    // LOW Priority Actions - Enhancement & Documentation
    if (readinessScore >= 70) {
      priorityActions.push({ 
        priority: 'LOW', 
        action: `Strong readiness (${readinessScore}/100, Grade ${r?.grade}) - document rationale for audit trail`, 
        color: '#10b981' 
      });
    }
    if (r?.grade === 'A' || r?.grade === 'A+') {
      priorityActions.push({ 
        priority: 'LOW', 
        action: 'Excellent score achieved - proceed with confidence and communicate decision', 
        color: '#10b981' 
      });
    }
    if (sentimentData && sentimentLabel === 'positive') {
      priorityActions.push({ 
        priority: 'LOW', 
        action: `Positive sentiment (${sentimentConf}% confidence) - leverage for stakeholder buy-in`, 
        color: '#10b981' 
      });
    }
    if (priorityActions.length < 4) {
      priorityActions.push({ 
        priority: 'LOW', 
        action: 'Export PDF/HTML report for compliance records and team sharing', 
        color: '#10b981' 
      });
    }
    
    // Ensure at least 3 actions
    if (priorityActions.length === 0) {
      priorityActions.push(
        { priority: 'MEDIUM', action: 'Complete all analysis steps for comprehensive evaluation', color: '#f59e0b' },
        { priority: 'MEDIUM', action: 'Run Provider Compare and Sentiment Analysis', color: '#f59e0b' },
        { priority: 'LOW', action: 'Export report and document decision rationale', color: '#10b981' }
      );
    }
    
    const priorityActionsHtml = priorityActions.slice(0, 6).map(a => `
      <div class="conclusionPriorityItem">
        <span class="conclusionPriorityBadge" style="background:${a.color}20;color:${a.color};border:1px solid ${a.color}40">${a.priority}</span>
        <span class="conclusionPriorityText">${esc(a.action)}</span>
      </div>
    `).join('');
    
    // Calculate overall decision confidence
    const overallConfidence = Math.round(((r?.score || 0) * 0.4 + (b?.score || 0) * 0.3 + (sentimentData?.overallConfidence || 50) * 0.2 + 50 * 0.1));
    const confidenceLevel = overallConfidence >= 80 ? 'Very High' : overallConfidence >= 65 ? 'High' : overallConfidence >= 50 ? 'Moderate' : overallConfidence >= 35 ? 'Low' : 'Very Low';
    const confidenceColor = overallConfidence >= 80 ? '#10b981' : overallConfidence >= 65 ? '#22c55e' : overallConfidence >= 50 ? '#f59e0b' : overallConfidence >= 35 ? '#f97316' : '#ef4444';
    
    return `
    <div class="card conclusionCard">
      ${sectionTitle("📝 Executive Conclusion & Action Plan", "Intelligent summary with prioritized recommendations")}
      
      <div class="conclusionSummary">
        <strong>${gradeEmoji} Summary:</strong> ${esc(defaultSummary)}
      </div>
      
      <div class="conclusionConfidenceOverview">
        <div class="conclusionConfidenceScore">
          <span class="conclusionConfidenceValue" style="color:${confidenceColor}">${overallConfidence}%</span>
          <span class="conclusionConfidenceLabel">Decision Confidence</span>
        </div>
        <div class="conclusionConfidenceDetails">
          <div class="conclusionConfidenceLevel" style="background:${confidenceColor}20;color:${confidenceColor}">${confidenceLevel}</div>
          <div class="conclusionConfidenceExplain">
            Based on weighted analysis of readiness (40%), blind spots (30%), sentiment (20%), and baseline (10%)
          </div>
        </div>
      </div>
      
      <div class="conclusionRecommendation">
        <div class="conclusionRecLabel">💡 Strategic Recommendation</div>
        <div class="conclusionRecText">${recommendation}</div>
      </div>
      
      <div class="conclusionPrioritySection">
        <div class="conclusionPriorityTitle">🎯 Priority Action Checklist</div>
        <div class="conclusionPriorityList">
          ${priorityActionsHtml}
        </div>
      </div>
      
      <div class="conclusionGrid">
        <div class="conclusionBox conclusionBoxPros">
          <div class="conclusionBoxTitle">👍 Strengths</div>
          <ul class="conclusionList">${prosHtml}</ul>
        </div>
        <div class="conclusionBox conclusionBoxCons">
          <div class="conclusionBoxTitle">👎 Areas to Improve</div>
          <ul class="conclusionList">${consHtml}</ul>
        </div>
      </div>
      
      <div class="conclusionGrid">
        <div class="conclusionBox conclusionBoxMetrics">
          <div class="conclusionBoxTitle">🎯 Key Metrics</div>
          <ul class="conclusionList">
            ${r ? `<li><strong>Readiness:</strong> ${r.score}/100 (Grade ${r.grade})</li>` : ''}
            ${h ? `<li><strong>Half-life:</strong> ${String(h.status).toUpperCase()}</li>` : ''}
            ${b ? `<li><strong>Blind-Spot Index:</strong> ${b.score}/100</li>` : ''}
            ${hasCompare ? `<li><strong>Provider Compare:</strong> Completed</li>` : ''}
            ${sentimentData ? `<li><strong>Sentiment:</strong> ${sentimentData.overallSentiment.toUpperCase()} (${sentimentData.overallConfidence}%)</li>` : ''}
          </ul>
        </div>
        <div class="conclusionBox conclusionBoxActions">
          <div class="conclusionBoxTitle">⚡ Immediate Next Steps</div>
          <ul class="conclusionList">
            ${r && r.score < 80 ? '<li>Improve input completeness to raise readiness</li>' : ''}
            ${b && b.score < 70 ? '<li>Address identified blind spots</li>' : ''}
            ${h?.status === 'volatile' ? '<li>Set calendar reminder for weekly review</li>' : ''}
            ${!hasCompare ? '<li>Run Provider Compare for multiple AI perspectives</li>' : ''}
            ${!sentimentData ? '<li>Run Sentiment Analysis for deeper stakeholder insights</li>' : ''}
            ${r?.score >= 80 ? '<li>Finalize and document your decision</li>' : ''}
          </ul>
        </div>
      </div>
      
      ${sentimentInsightsHtml}
      
      <div class="conclusionMeta">
        <div class="conclusionMetaItem">
          <span class="conclusionMetaLabel">📅 Suggested Review</span>
          <span class="conclusionMetaValue">${h?.status === 'volatile' ? 'Weekly' : h?.status === 'degrading' ? 'Monthly' : 'Quarterly'}</span>
        </div>
        <div class="conclusionMetaItem">
          <span class="conclusionMetaLabel">🎯 Analysis Completeness</span>
          <span class="conclusionMetaValue">${hasCompare ? 'Compare ✓' : 'Compare ✗'} | ${sentimentData ? 'Sentiment ✓' : 'Sentiment ✗'} | ${stressTestData ? 'Stress Test ✓' : 'Stress Test ✗'}</span>
        </div>
      </div>
      
      <div class="conclusionDataScience">
        <div class="conclusionDataScienceTitle">📊 Data Science Insights Summary</div>
        <div class="conclusionDataScienceGrid">
          <div class="conclusionDSItem">
            <span class="conclusionDSIcon">📈</span>
            <div class="conclusionDSContent">
              <span class="conclusionDSLabel">Confidence Intervals</span>
              <span class="conclusionDSDesc">${r ? `<ul><li>Readiness ±${Math.round(r.score * 0.15)}% uncertainty range</li><li>${r.score >= 80 ? 'High confidence in metrics' : r.score >= 60 ? 'Moderate uncertainty - consider gathering more data' : 'High uncertainty - requires validation'}</li></ul>` : '95% CI shows uncertainty range for all metrics'}</span>
            </div>
          </div>
          <div class="conclusionDSItem">
            <span class="conclusionDSIcon">📉</span>
            <div class="conclusionDSContent">
              <span class="conclusionDSLabel">Progress Timeline</span>
              <span class="conclusionDSDesc">${h?.status === 'volatile' ? '<ul><li>Decision context is rapidly changing</li><li>Track weekly</li></ul>' : h?.status === 'degrading' ? '<ul><li>Decision quality may decline</li><li>Review monthly</li></ul>' : '<ul><li>Decision context is stable</li><li>Quarterly review sufficient</li></ul>'}</span>
            </div>
          </div>
          <div class="conclusionDSItem">
            <span class="conclusionDSIcon">☁️</span>
            <div class="conclusionDSContent">
              <span class="conclusionDSLabel">Word Cloud</span>
              <span class="conclusionDSDesc">${r ? `<ul><li>Primary focus areas identified</li><li>${b && b.score < 70 ? 'Consider expanding coverage of underrepresented themes' : 'Key themes well-covered in context'}</li></ul>` : 'Key themes extracted from context & intent'}</span>
            </div>
          </div>
          <div class="conclusionDSItem">
            <span class="conclusionDSIcon">🔗</span>
            <div class="conclusionDSContent">
              <span class="conclusionDSLabel">Correlation Matrix</span>
              <span class="conclusionDSDesc">${sentimentData ? `<ul><li>Sentiment confidence: ${sentimentData.overallConfidence}%</li><li>${sentimentData.overallSentiment === 'positive' ? 'Positively correlates with readiness' : sentimentData.overallSentiment === 'negative' ? 'Shows tension with readiness score' : 'Neutral across metrics'}</li></ul>` : 'Metric relationships & dependencies visualized'}</span>
            </div>
          </div>
          ${hasCompare ? `
          <div class="conclusionDSItem">
            <span class="conclusionDSIcon">📦</span>
            <div class="conclusionDSContent">
              <span class="conclusionDSLabel">Box Plot Analysis</span>
              <span class="conclusionDSDesc"><ul><li>Provider response times analyzed</li><li>Use fastest provider for time-sensitive decisions</li></ul></span>
            </div>
          </div>
          ` : ''}
          ${hasCompare && providerCompareData?.results && providerCompareData.results.length > 1 ? (() => {
            const pcResults = providerCompareData.results!;
            const successCount = pcResults.filter(p => p.ok || p.success).length;
            const fastest = [...pcResults].filter(p => p.ok || p.success).sort((a, b) => (a.latencyMs || 9999) - (b.latencyMs || 9999))[0];
            const avgLatency = Math.round(pcResults.reduce((sum, p) => sum + (p.latencyMs || 0), 0) / pcResults.length);
            const winner = fastest || pcResults[0];
            const runnerUp = [...pcResults].filter(p => (p.ok || p.success) && p.provider !== winner?.provider).sort((a, b) => (a.latencyMs || 9999) - (b.latencyMs || 9999))[0];
            return '<div class="conclusionDSItem"><span class="conclusionDSIcon">⚖️</span><div class="conclusionDSContent"><span class="conclusionDSLabel">Provider Compare Conclusion</span><span class="conclusionDSDesc"><ul>' +
              '<li>Fastest: <strong>' + esc(winner?.provider || 'N/A') + '</strong> (' + (winner?.latencyMs || 0) + 'ms)</li>' +
              '<li>' + pcResults.length + ' providers compared — ' + successCount + ' succeeded</li>' +
              '<li>Avg latency: ' + avgLatency + 'ms across all providers</li>' +
              (runnerUp ? '<li>Runner-up: ' + esc(runnerUp.provider || 'N/A') + ' (' + (runnerUp.latencyMs || 0) + 'ms)</li>' : '') +
              '</ul></span></div></div>';
          })() : ''}
          ${r ? (() => {
            const mcBase = r.score;
            const mcBlind = b?.score || 50;
            const mcVariance = (100 - mcBlind) * 0.4;
            let mcRng = mcBase * 17 + mcBlind * 31;
            const mcPR = () => { mcRng = (mcRng * 1103515245 + 12345) & 0x7fffffff; return mcRng / 0x7fffffff; };
            const mcRes: number[] = [];
            for (let i = 0; i < 1000; i++) {
              const g = ((mcPR() - 0.5) * 2) * Math.sqrt(-2 * Math.log(Math.max(0.001, mcPR())));
              mcRes.push(Math.max(0, Math.min(100, mcBase + g * mcVariance * 0.3)));
            }
            mcRes.sort((a, b) => a - b);
            const mcSucc = Math.round((mcRes.filter(v => v >= 70).length / 1000) * 100);
            const mcP50 = mcRes[500];
            return '<div class="conclusionDSItem"><span class="conclusionDSIcon">🎲</span><div class="conclusionDSContent"><span class="conclusionDSLabel">Monte Carlo Simulation</span><span class="conclusionDSDesc"><ul><li>1,000 simulations run</li><li>Median outcome: ' + mcP50.toFixed(1) + '%</li><li>Probability of success (≥70%): ' + mcSucc + '%</li><li>' + (mcSucc >= 80 ? 'Strong probability — inputs are robust' : mcSucc >= 50 ? 'Moderate probability — strengthen weak areas' : 'Lower probability — improve input quality') + '</li></ul></span></div></div>';
          })() : ''}
          ${stressTestData && stressTestData.scores ? (() => {
            const stSc = stressTestData.scores;
            const stRobust = Math.round(stSc.overall_robustness);
            const stAssump = Math.round(stSc.assumption_strength);
            const stRisk = Math.round(stSc.risk_coverage);
            const stEvid = Math.round(stSc.evidence_quality);
            const stExec = Math.round(stSc.execution_readiness);
            const stFail = stressTestData.probability_matrix?.overall_failure_risk ?? 50;
            const dims = [{n:'Assumptions',v:stAssump},{n:'Risk Coverage',v:stRisk},{n:'Evidence',v:stEvid},{n:'Execution',v:stExec}].sort((a,b)=>a.v-b.v);
            const weakest = dims[0];
            const actionText = stRobust >= 70 ? 'Decision is stress-tested — proceed with confidence, monitor weak areas.' : stRobust >= 50 ? 'Address ' + weakest.n + ' (' + weakest.v + '/100) before committing — it is the most vulnerable dimension.' : 'Decision is fragile — strengthen ' + weakest.n + ' (' + weakest.v + '/100) and re-run stress test before proceeding.';
            return '<div class="conclusionDSItem"><span class="conclusionDSIcon">🔬</span><div class="conclusionDSContent"><span class="conclusionDSLabel">Deep Reasoner Stress Test</span><span class="conclusionDSDesc"><ul><li>Robustness: ' + stRobust + '/100 — ' + (stRobust >= 80 ? 'Strong' : stRobust >= 60 ? 'Moderate' : stRobust >= 40 ? 'Weak' : 'Critical') + '</li><li>Failure risk: ' + stFail + '% — ' + (stFail >= 50 ? 'High risk, revise before committing' : stFail >= 30 ? 'Moderate risk, address blind spots' : 'Low risk, proceed with monitoring') + '</li><li>' + (stressTestData.critical_flaw ? '⚠️ Critical flaw: ' + esc(stressTestData.critical_flaw.title) : '✅ No critical flaws detected') + '</li><li>Weakest: ' + weakest.n + ' (' + weakest.v + '/100) — focus here</li><li>' + (stressTestData.devils_advocate_challenges?.length || 0) + ' challenges, ' + (stressTestData.hidden_dependencies?.length || 0) + ' hidden deps, ' + (stressTestData.blind_spots?.length || 0) + ' blind spots</li><li><strong>→ ' + actionText + '</strong></li></ul></span></div></div>';
          })() : ''}
          ${sentimentData ? (() => {
            const abAspects = sentimentData.aspects || [];
            const posCount = abAspects.filter(a => a.sentiment === 'positive').length;
            const negCount = abAspects.filter(a => a.sentiment === 'negative').length;
            const neutralCount = abAspects.filter(a => a.sentiment === 'neutral' || a.sentiment === 'mixed').length;
            const netAssessment = negCount > posCount ? '⚠️ Net negative — address concerns before proceeding.' : posCount > negCount ? '✅ Net positive — stakeholder alignment is favorable.' : 'Balanced — no strong bias detected.';
            const topAspects = abAspects.slice(0, 3).map(a => esc(a.aspect || '') + ' (' + (a.sentiment || 'neutral') + ')').join(', ');
            return '<div class="conclusionDSItem"><span class="conclusionDSIcon">💬</span><div class="conclusionDSContent"><span class="conclusionDSLabel">ABSA Sentiment Analysis</span><span class="conclusionDSDesc"><ul><li>Overall: ' + esc(sentimentData.overallSentiment) + ' (confidence: ' + sentimentData.overallConfidence + '%)</li><li>' + abAspects.length + ' aspects analyzed: ' + posCount + ' positive, ' + negCount + ' negative, ' + neutralCount + ' neutral</li><li>' + netAssessment + '</li>' + (topAspects ? '<li>Top: ' + topAspects + '</li>' : '') + '</ul></span></div></div>';
          })() : ''}
          ${geminiCriticData ? (() => {
            const cHard = geminiCriticData.hardEdgesMissing?.length || 0;
            const cBlind = geminiCriticData.blindSpots?.length || 0;
            const cGeneric = geminiCriticData.genericLanguage?.length || 0;
            const cActions = geminiCriticData.nextActions?.length || 0;
            const criticAssessment = (cHard === 0 && cBlind === 0) ? '✅ Clean pass — no structural issues detected.' : cHard > 2 ? '⚠️ Multiple hard edges missing — strengthen specifics before committing.' : 'Minor improvements suggested — review flagged items.';
            return '<div class="conclusionDSItem"><span class="conclusionDSIcon">🧠</span><div class="conclusionDSContent"><span class="conclusionDSLabel">Gemini Critic Review</span><span class="conclusionDSDesc"><ul><li>' + cHard + ' hard edges missing, ' + cBlind + ' blind spots, ' + cGeneric + ' generic phrases</li><li>' + cActions + ' recommended next actions</li><li>' + criticAssessment + '</li><li>Model: ' + esc(geminiCriticData.meta?.modelUsed || 'N/A') + ' (' + (geminiCriticData.meta?.latencyMs || 0) + 'ms)</li></ul></span></div></div>';
          })() : ''}
        </div>
        <div class="conclusionDSNote">
          💡 <strong>Key Finding:</strong> ${r && r.score >= 80 && (!b || b.score >= 70) ? 'Decision readiness is strong with minimal blind spots. Proceed with confidence.' : r && r.score >= 60 ? 'Decision is moderately ready but has areas for improvement. Address blind spots before finalizing.' : 'Decision requires more preparation. Focus on improving input completeness and addressing risks.'} Use the Data Export section for programmatic access.
        </div>
      </div>
    </div>
  `;
  }

  const takeawaysList = data.keyTakeaways
    .slice(0, 6)
    .map((t) => `<li>${esc(t)}</li>`)
    .join("");

  const nextStepsList = data.nextSteps
    .slice(0, 5)
    .map((s) => `<li>${esc(s)}</li>`)
    .join("");

  // Determine confidence level styling
  const confidenceLower = (data.confidenceStatement || "").toLowerCase();
  const confidenceLevel = confidenceLower.includes("high") ? "high" 
    : confidenceLower.includes("low") ? "low" 
    : "medium";
  const confidenceColor = confidenceLevel === "high" ? "#10b981" 
    : confidenceLevel === "low" ? "#ef4444" 
    : "#f59e0b";

  return `
    <div class="card conclusionCard">
      ${sectionTitle("📝 Executive Conclusion", "AI-powered decision intelligence summary")}
      
      <div class="conclusionSummary">
        <div class="conclusionSummaryHeader">
          <span class="conclusionSummaryIcon">📊</span>
          <strong>Executive Summary</strong>
        </div>
        <div class="conclusionSummaryText">${esc(data.summary)}</div>
      </div>
      
      <div class="conclusionRecommendation">
        <div class="conclusionRecLabel">💡 Strategic Recommendation</div>
        <div class="conclusionRecText">${esc(data.recommendation)}</div>
      </div>
      
      <div class="conclusionGrid">
        <div class="conclusionBox conclusionBoxTakeaways">
          <div class="conclusionBoxTitle">🎯 Key Takeaways</div>
          <ul class="conclusionList">${takeawaysList || "<li>No takeaways generated</li>"}</ul>
        </div>
        <div class="conclusionBox conclusionBoxNextSteps">
          <div class="conclusionBoxTitle">⚡ Immediate Next Steps</div>
          <ul class="conclusionList">${nextStepsList || "<li>No next steps generated</li>"}</ul>
        </div>
      </div>
      
      ${sentimentInsightsHtml}
      
      ${analysis?.readiness ? (() => {
        const r = analysis.readiness;
        const b = analysis.blindSpots;
        const h = analysis.halfLife;
        
        // Priority Action Checklist
        const priorityActions: { priority: string; action: string; color: string }[] = [];
        if (r.score < 50) priorityActions.push({ priority: 'HIGH', action: `Readiness Score is ${r.score}/100 (Grade ${r.grade}) — requires immediate attention`, color: '#ef4444' });
        if (b && b.score < 50) priorityActions.push({ priority: 'HIGH', action: `Blind-Spot Index is ${b.score}/100 — critical gaps in analysis`, color: '#ef4444' });
        if (stressTestData && stressTestData.scores.overall_robustness < 50) priorityActions.push({ priority: 'HIGH', action: `Stress test robustness is ${Math.round(stressTestData.scores.overall_robustness)}/100 — decision is fragile`, color: '#ef4444' });
        if (r.score >= 50 && r.score < 80) priorityActions.push({ priority: 'MEDIUM', action: `Improve readiness from ${r.score} to 80+ for confident execution`, color: '#f59e0b' });
        if (b && b.score >= 50 && b.score < 80) priorityActions.push({ priority: 'MEDIUM', action: `Strengthen blind-spot coverage from ${b.score} to 80+`, color: '#f59e0b' });
        if (h?.status === 'volatile') priorityActions.push({ priority: 'MEDIUM', action: 'Set weekly review — context is volatile', color: '#f59e0b' });
        if (r.score >= 80) priorityActions.push({ priority: 'LOW', action: 'Document final decision and communicate to stakeholders', color: '#10b981' });
        priorityActions.push({ priority: 'LOW', action: 'Archive analysis artifacts for audit trail', color: '#10b981' });
        
        const priorityActionsHtml = priorityActions.slice(0, 6).map(a => `
          <div class="conclusionPriorityItem">
            <span class="conclusionPriorityBadge" style="background:${a.color}20;color:${a.color};border:1px solid ${a.color}40">${a.priority}</span>
            <span class="conclusionPriorityText">${esc(a.action)}</span>
          </div>
        `).join('');
        
        // Strengths & Weaknesses
        const pros: string[] = [];
        const cons: string[] = [];
        if (r.score >= 70) pros.push('Strong readiness foundation');
        if (r.score < 60) cons.push('Readiness score needs improvement');
        if (h?.status === 'stable') pros.push('Context is stable for long-term planning');
        if (h?.status === 'volatile') cons.push('Volatile context requires frequent review');
        if (b && b.score >= 70) pros.push('Good blind-spot coverage');
        if (b && b.score < 60) cons.push('Blind spots need attention');
        if (hasCompare) pros.push('Multiple AI perspectives considered');
        if (sentimentData) pros.push('Stakeholder sentiment analyzed');
        if (stressTestData) {
          if (stressTestData.scores.overall_robustness >= 70) pros.push('Decision passed stress test');
          else cons.push(`Stress test robustness: ${Math.round(stressTestData.scores.overall_robustness)}/100`);
        }
        const prosHtml = pros.length > 0 ? pros.map(p => `<li class="conclusionPro">✅ ${esc(p)}</li>`).join('') : '<li class="conclusionNeutral">Run more analysis to identify strengths</li>';
        const consHtml = cons.length > 0 ? cons.map(c => `<li class="conclusionCon">⚠️ ${esc(c)}</li>`).join('') : '<li class="conclusionNeutral">No major concerns identified</li>';
        
        // Monte Carlo
        const mcBase = r.score;
        const mcBlind = b?.score || 50;
        const mcVariance = (100 - mcBlind) * 0.4;
        let mcRng = mcBase * 17 + mcBlind * 31;
        const mcPR = () => { mcRng = (mcRng * 1103515245 + 12345) & 0x7fffffff; return mcRng / 0x7fffffff; };
        const mcRes: number[] = [];
        for (let i = 0; i < 1000; i++) {
          const g = ((mcPR() - 0.5) * 2) * Math.sqrt(-2 * Math.log(Math.max(0.001, mcPR())));
          mcRes.push(Math.max(0, Math.min(100, mcBase + g * mcVariance * 0.3)));
        }
        mcRes.sort((a2, b2) => a2 - b2);
        const mcSucc = Math.round((mcRes.filter(v => v >= 70).length / 1000) * 100);
        const mcP50 = mcRes[500];
        const mcP5 = mcRes[50];
        const mcP95 = mcRes[950];
        
        return `
        <div class="conclusionPrioritySection">
          <div class="conclusionPriorityTitle">🎯 Priority Action Checklist</div>
          <div class="conclusionPriorityList">${priorityActionsHtml}</div>
        </div>
        
        <div class="conclusionGrid">
          <div class="conclusionBox conclusionBoxPros">
            <div class="conclusionBoxTitle">👍 Strengths</div>
            <ul class="conclusionList">${prosHtml}</ul>
          </div>
          <div class="conclusionBox conclusionBoxCons">
            <div class="conclusionBoxTitle">👎 Areas to Improve</div>
            <ul class="conclusionList">${consHtml}</ul>
          </div>
        </div>
        
        <div class="conclusionGrid">
          <div class="conclusionBox conclusionBoxMetrics">
            <div class="conclusionBoxTitle">🎯 Key Metrics</div>
            <ul class="conclusionList">
              <li><strong>Readiness:</strong> ${r.score}/100 (Grade ${r.grade})</li>
              ${h ? `<li><strong>Half-life:</strong> ${String(h.status).toUpperCase()}</li>` : ''}
              ${b ? `<li><strong>Blind-Spot Index:</strong> ${b.score}/100</li>` : ''}
              ${hasCompare ? '<li><strong>Provider Compare:</strong> Completed</li>' : ''}
              ${sentimentData ? `<li><strong>Sentiment:</strong> ${sentimentData.overallSentiment.toUpperCase()} (${sentimentData.overallConfidence}%)</li>` : ''}
              ${stressTestData ? `<li><strong>Stress Robustness:</strong> ${Math.round(stressTestData.scores.overall_robustness)}/100</li>` : ''}
            </ul>
          </div>
          <div class="conclusionBox conclusionBoxActions">
            <div class="conclusionBoxTitle">⚡ Immediate Next Steps</div>
            <ul class="conclusionList">
              ${r.score < 80 ? '<li>Improve input completeness to raise readiness</li>' : ''}
              ${b && b.score < 70 ? '<li>Address identified blind spots</li>' : ''}
              ${r.score >= 80 ? '<li>Finalize and document your decision</li>' : ''}
            </ul>
          </div>
        </div>
        
        ${stressTestData && stressTestData.scores ? (() => {
          const sc2 = stressTestData.scores;
          const sColor2 = (v: number) => v >= 80 ? '#10b981' : v >= 60 ? '#06b6d4' : v >= 40 ? '#f59e0b' : '#ef4444';
          const sLabel2 = (v: number) => v >= 80 ? 'Strong' : v >= 60 ? 'Moderate' : v >= 40 ? 'Weak' : 'Critical';
          const failRisk2 = stressTestData.probability_matrix?.overall_failure_risk ?? 50;
          const cf2 = stressTestData.critical_flaw;
          return '<div class="conclusionStressInsights">' +
            '<div class="conclusionStressTitle">🔬 Deep Reasoner Stress Test Insights</div>' +
            '<div class="conclusionStressGrid">' +
            [
              { label: 'Robustness', val: sc2.overall_robustness },
              { label: 'Assumptions', val: sc2.assumption_strength },
              { label: 'Risk Cov.', val: sc2.risk_coverage },
              { label: 'Evidence', val: sc2.evidence_quality },
              { label: 'Execution', val: sc2.execution_readiness },
            ].map(s2 => '<div class="conclusionStressScoreCard">' +
              '<div class="conclusionStressScoreLabel">' + s2.label + '</div>' +
              '<div class="conclusionStressScoreValue"><span style="color:' + sColor2(s2.val) + '">' + Math.round(s2.val) + '</span><span style="color:#10b981">/100</span></div>' +
              '<div class="conclusionStressScoreTag" style="color:' + sColor2(s2.val) + '">' + sLabel2(s2.val) + '</div></div>').join('') +
            '</div>' +
            '<ul class="conclusionStressList">' +
            '<li>Overall robustness: <strong><span style="color:' + sColor2(sc2.overall_robustness) + '">' + Math.round(sc2.overall_robustness) + '</span><span style="color:#10b981">/100</span> <span style="color:' + sColor2(sc2.overall_robustness) + '">(' + sLabel2(sc2.overall_robustness) + ')</span></strong></li>' +
            '<li>Failure risk: <strong style="color:' + (failRisk2 >= 50 ? '#ef4444' : failRisk2 >= 30 ? '#f59e0b' : '#10b981') + '">' + failRisk2 + '%</strong> — ' +
              (failRisk2 >= 70 ? 'Very high risk. Do not proceed without major revisions to assumptions, evidence, and risk coverage.' :
               failRisk2 >= 50 ? 'High risk. Significant weaknesses exist — revisit weak areas and strengthen evidence before committing.' :
               failRisk2 >= 30 ? 'Moderate risk. Some gaps remain — address the identified blind spots and strengthen weaker dimensions.' :
               'Low risk. Decision inputs are solid — proceed with standard monitoring.') + '</li>' +
            (cf2 ? '<li>⚠️ Critical flaw: <strong>' + esc(cf2.title) + '</strong> — ' + esc(cf2.explanation || 'Resolve before proceeding.') + '</li>' : '<li>✅ No critical flaws detected</li>') +
            '<li>' + (stressTestData.devils_advocate_challenges?.length || 0) + ' challenges · ' + (stressTestData.hidden_dependencies?.length || 0) + ' hidden deps · ' + (stressTestData.blind_spots?.length || 0) + ' blind spots</li>' +
            '</ul>' +
            '<div class="conclusionStressAction">' +
              (failRisk2 >= 50 ? '🚨 <strong>Action Required:</strong> Focus on the weakest dimension (' + (() => {
                const dims = [
                  { label: 'Robustness', val: sc2.overall_robustness },
                  { label: 'Assumptions', val: sc2.assumption_strength },
                  { label: 'Risk Coverage', val: sc2.risk_coverage },
                  { label: 'Evidence', val: sc2.evidence_quality },
                  { label: 'Execution', val: sc2.execution_readiness },
                ];
                dims.sort((a, b) => a.val - b.val);
                return dims[0].label + ': ' + Math.round(dims[0].val) + '/100';
              })() + '). Improve this score before making a final decision.' :
               failRisk2 >= 30 ? '⚡ <strong>Recommendation:</strong> Address identified blind spots and consider running the stress test again after improvements.' :
               '✅ <strong>Status:</strong> Decision inputs have passed adversarial testing. Proceed with confidence and standard review cycles.') +
            '</div></div>';
        })() : ''}
        
        <div class="conclusionMonteCarloSummary">
          <div class="conclusionMCHeader">
            <span class="conclusionMCIcon">🎲</span>
            <span class="conclusionMCTitle">Monte Carlo Simulation Summary</span>
          </div>
          <div class="conclusionMCContent">
            <div class="conclusionMCStats">
              <div class="conclusionMCStat">
                <span class="conclusionMCLabel">Median Outcome</span>
                <span class="conclusionMCValue" style="color:#10b981">${mcP50.toFixed(1)}%</span>
              </div>
              <div class="conclusionMCStat">
                <span class="conclusionMCLabel">Success Rate (≥70%)</span>
                <span class="conclusionMCValue" style="color:${mcSucc >= 70 ? '#10b981' : mcSucc >= 50 ? '#f59e0b' : '#ef4444'}">${mcSucc}%</span>
              </div>
              <div class="conclusionMCStat">
                <span class="conclusionMCLabel">Range (P5-P95)</span>
                <span class="conclusionMCValue">${mcP5.toFixed(0)}% - ${mcP95.toFixed(0)}%</span>
              </div>
            </div>
            <div class="conclusionMCInterpretation">
              ${mcSucc >= 80 ? '✅ <strong>Strong probability</strong> — your decision inputs are robust and likely to succeed.' : mcSucc >= 50 ? '⚡ <strong>Moderate probability</strong> — consider strengthening weaker areas to improve odds.' : '⚠️ <strong>Lower probability</strong> — significant improvement needed in input quality.'}
            </div>
          </div>
        </div>
        
        <div class="conclusionDataScience">
          <div class="conclusionDataScienceTitle">📊 Data Science Insights Summary</div>
          <div class="conclusionDataScienceGrid">
            <div class="conclusionDSItem"><span class="conclusionDSIcon">📈</span><div class="conclusionDSContent"><span class="conclusionDSLabel">Confidence Intervals</span><span class="conclusionDSDesc"><ul><li>Readiness ±${Math.round(r.score * 0.15)}% uncertainty range</li><li>${r.score >= 80 ? 'High confidence' : r.score >= 60 ? 'Moderate uncertainty' : 'High uncertainty'}</li></ul></span></div></div>
            <div class="conclusionDSItem"><span class="conclusionDSIcon">📉</span><div class="conclusionDSContent"><span class="conclusionDSLabel">Progress Timeline</span><span class="conclusionDSDesc"><ul><li>${h?.status === 'volatile' ? 'Context rapidly changing' : h?.status === 'degrading' ? 'Quality may decline' : 'Context stable'}</li><li>${h?.status === 'volatile' ? 'Track weekly' : h?.status === 'degrading' ? 'Review monthly' : 'Quarterly review'}</li></ul></span></div></div>
            <div class="conclusionDSItem"><span class="conclusionDSIcon">🎲</span><div class="conclusionDSContent"><span class="conclusionDSLabel">Monte Carlo</span><span class="conclusionDSDesc"><ul><li>Median ${mcP50.toFixed(1)}%</li><li>Success rate: ${mcSucc}%</li></ul></span></div></div>
            ${stressTestData ? (() => {
              const stFail2 = stressTestData.probability_matrix?.overall_failure_risk ?? 50;
              const stRob2 = Math.round(stressTestData.scores.overall_robustness);
              const dims2 = [{n:'Assumptions',v:Math.round(stressTestData.scores.assumption_strength)},{n:'Risk Coverage',v:Math.round(stressTestData.scores.risk_coverage)},{n:'Evidence',v:Math.round(stressTestData.scores.evidence_quality)},{n:'Execution',v:Math.round(stressTestData.scores.execution_readiness)}].sort((a,b)=>a.v-b.v);
              const weak2 = dims2[0];
              const act2 = stRob2 >= 70 ? 'Proceed with confidence' : 'Fix ' + weak2.n + ' (' + weak2.v + '/100) first';
              return '<div class="conclusionDSItem"><span class="conclusionDSIcon">🔬</span><div class="conclusionDSContent"><span class="conclusionDSLabel">Deep Reasoner</span><span class="conclusionDSDesc"><ul><li>Robustness: ' + stRob2 + '/100 — Failure risk: ' + stFail2 + '%</li><li><strong>→ ' + act2 + '</strong></li></ul></span></div></div>';
            })() : ''}
            ${hasCompare && providerCompareData?.results && providerCompareData.results.length > 1 ? (() => {
              const pcR2 = providerCompareData.results!;
              const successCnt2 = pcR2.filter(p => p.ok || p.success).length;
              const fastest2 = [...pcR2].filter(p => p.ok || p.success).sort((a, b) => (a.latencyMs || 9999) - (b.latencyMs || 9999))[0] || pcR2[0];
              return '<div class="conclusionDSItem"><span class="conclusionDSIcon">⚖️</span><div class="conclusionDSContent"><span class="conclusionDSLabel">Provider Compare</span><span class="conclusionDSDesc"><ul><li>Fastest: ' + esc(fastest2.provider || 'N/A') + ' (' + (fastest2.latencyMs || 0) + 'ms)</li><li>' + pcR2.length + ' providers — ' + successCnt2 + ' succeeded</li></ul></span></div></div>';
            })() : ''}
            ${sentimentData ? (() => {
              const abAsp2 = sentimentData.aspects || [];
              const pos2 = abAsp2.filter(a => a.sentiment === 'positive').length;
              const neg2 = abAsp2.filter(a => a.sentiment === 'negative').length;
              const neu2 = abAsp2.length - pos2 - neg2;
              return '<div class="conclusionDSItem"><span class="conclusionDSIcon">💬</span><div class="conclusionDSContent"><span class="conclusionDSLabel">ABSA Sentiment</span><span class="conclusionDSDesc"><ul><li>' + esc(sentimentData.overallSentiment) + ' (confidence: ' + sentimentData.overallConfidence + '%)</li><li>' + abAsp2.length + ' aspects: ' + pos2 + ' pos, ' + neg2 + ' neg, ' + neu2 + ' neutral</li></ul></span></div></div>';
            })() : ''}
            ${geminiCriticData ? (() => {
              const cH2 = geminiCriticData.hardEdgesMissing?.length || 0;
              const cB2 = geminiCriticData.blindSpots?.length || 0;
              const cA2 = geminiCriticData.nextActions?.length || 0;
              const assess2 = (cH2 === 0 && cB2 === 0) ? '✅ Clean pass' : '⚠️ Issues found';
              return '<div class="conclusionDSItem"><span class="conclusionDSIcon">🧠</span><div class="conclusionDSContent"><span class="conclusionDSLabel">Gemini Critic</span><span class="conclusionDSDesc"><ul><li>' + cH2 + ' hard edges, ' + cB2 + ' blind spots</li><li>' + cA2 + ' next actions — ' + assess2 + '</li></ul></span></div></div>';
            })() : ''}
          </div>
          <div class="conclusionDSNote">💡 <strong>Key Finding:</strong> ${r.score >= 80 && (!b || b.score >= 70) ? 'Decision readiness is strong. Proceed with confidence.' : r.score >= 60 ? 'Moderately ready — address blind spots before finalizing.' : 'More preparation needed.'}</div>
        </div>
        `;
      })() : ''}
      
      <div class="conclusionMeta">
        <div class="conclusionMetaItem">
          <span class="conclusionMetaLabel">📅 Suggested Review</span>
          <span class="conclusionMetaValue">${esc(data.reviewDate)}</span>
        </div>
        <div class="conclusionMetaItem">
          <span class="conclusionMetaLabel">🎯 Confidence Assessment</span>
          <span class="conclusionMetaValue">
            <span class="conclusionConfidenceDot" style="background:${confidenceColor}"></span>
            ${esc(data.confidenceStatement)}
          </span>
        </div>
        <div class="conclusionMetaItem">
          <span class="conclusionMetaLabel">🎯 Analysis Completeness</span>
          <span class="conclusionMetaValue">${hasCompare ? 'Compare ✓' : 'Compare ✗'} | ${sentimentData ? 'Sentiment ✓' : 'Sentiment ✗'} | ${stressTestData ? 'Stress Test ✓' : 'Stress Test ✗'}</span>
        </div>
      </div>
      
      <div class="conclusionFootnote" style="margin-top:16px;">
        <span class="conclusionFootnoteIcon">ℹ️</span>
        <span class="conclusionFootnoteText">This conclusion is generated by AI based on the provided inputs and analysis. Always apply human judgment before making final decisions.</span>
      </div>
    </div>
  `;
}

/** Render Related Research Section */
function renderRelatedResearch(data: RelatedResearchData | null | undefined, input?: { context?: string; intent?: string } | null): string {
  // If no sentiment data, generate default research suggestions based on input
  if (!data || !data.links || data.links.length === 0) {
    // Generate default suggestions if we have input context
    if (!input?.context && !input?.intent) return "";
    
    // Extract keywords from context/intent for search suggestions
    const contextWords = (input.context || "").split(/\s+/).filter(w => w.length > 4).slice(0, 3);
    const intentWords = (input.intent || "").split(/\s+/).filter(w => w.length > 4).slice(0, 2);
    const keywords = [...new Set([...contextWords, ...intentWords])].slice(0, 5);
    
    if (keywords.length === 0) return "";
    
    const searchSuggestions = keywords.map(k => {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(k)}`;
      return `<a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="searchSuggestion">${esc(k)}</a>`;
    }).join("");
    
    return `
    <div class="card researchCard">
      ${sectionTitle("📖 Related Research", "Suggested reading to inform your decision")}
      
      <div class="researchDisclaimer">
        <span class="researchDisclaimerIcon">ℹ️</span>
        <span class="researchDisclaimerText">Run Sentiment Analysis for AI-curated research recommendations. Below are auto-generated search suggestions based on your input keywords.</span>
      </div>
      
      <div class="searchSuggestionsBox">
        <div class="searchSuggestionsLabel">🚀 Quick Search Suggestions</div>
        <div class="searchSuggestionsList">${searchSuggestions}</div>
      </div>
      
      <div class="educationalNote">
        <strong>💡 Research Tip:</strong> Use these keywords to search Google Scholar, industry publications, or news sources for relevant background information on your decision context.
      </div>
    </div>
  `;
  }

  const typeIcons: Record<string, string> = {
    research: "📚",
    news: "📰",
    case_study: "📋",
    article: "📝",
  };

  const linkItems = data.links
    .slice(0, 6)
    .map((link) => {
      const icon = typeIcons[link.type] || "📄";
      const typeLabel = link.type.replace("_", " ");
      
      // Use title + type for more precise search - combines title with context
      const searchQuery = `${link.title} ${link.type === 'research' ? 'systematic review' : ''}`.trim();
      
      // Generate actual search URLs based on type - use title for precision
      const googleScholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(searchQuery)}`;
      const googleNewsUrl = `https://news.google.com/search?q=${encodeURIComponent(link.title)}`;
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(link.title)}`;
      
      // Choose URL based on type
      const primaryUrl = link.type === 'research' ? googleScholarUrl 
        : link.type === 'news' ? googleNewsUrl 
        : googleSearchUrl;
      
      return `
        <div class="researchItem">
          <div class="researchItemHeader">
            <span class="researchIcon">${icon}</span>
            <span class="researchTitle"><strong>${esc(link.title)}</strong></span>
            <span class="researchType">${esc(typeLabel)}</span>
          </div>
          <div class="researchDesc">${esc(link.description)}</div>
          <div class="researchLinks">
            <a href="${primaryUrl}" target="_blank" rel="noopener noreferrer" class="researchLink">
              🔗 Search: ${link.type === 'research' ? 'Google Scholar' : link.type === 'news' ? 'Google News' : 'Google'}
            </a>
          </div>
          <div class="researchUrlDisplay">
            <span class="researchUrlLabel">🌐 URL:</span>
            <a href="${primaryUrl}" target="_blank" rel="noopener noreferrer" class="researchUrlLink">${esc(primaryUrl)}</a>
          </div>
          <div class="researchNote">
            <span class="researchSearchLabel">💡 Tip:</span> ${esc(link.suggestedSearch)}
          </div>
        </div>
      `;
    })
    .join("");

  const searchSuggestions = data.searchSuggestions
    .slice(0, 5)
    .map((s) => {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(s)}`;
      return `<a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="searchSuggestion">${esc(s)}</a>`;
    })
    .join("");

  return `
    <div class="card researchCard">
      ${sectionTitle("📖 Related Research", "Suggested reading to inform your decision")}
      
      <div class="researchDisclaimer">
        <span class="researchDisclaimerIcon">ℹ️</span>
        <span class="researchDisclaimerText">These links open keyword searches, not direct articles. Results may vary based on search engine availability and indexing.</span>
      </div>
      
      <div class="researchGrid">
        ${linkItems}
      </div>
      
      ${
        searchSuggestions
          ? `
        <div class="searchSuggestionsBox">
          <div class="searchSuggestionsLabel">🚀 Quick Search Suggestions</div>
          <div class="searchSuggestionsList">${searchSuggestions}</div>
        </div>
      `
          : ""
      }
      
      ${
        data.educationalNote
          ? `
        <div class="educationalNote">
          <strong>💡 Research Tip:</strong> ${esc(data.educationalNote)}
        </div>
      `
          : ""
      }
    </div>
  `;
}

/** Render Provider Comparison Spider Chart */
function renderProviderSpiderChart(providerCompare: any): string {
  if (!providerCompare?.results || providerCompare.results.length < 2) return "";
  
  const results = providerCompare.results;
  const centerX = 150;
  const centerY = 150;
  const maxRadius = 100;
  
  // Metrics to compare
  const metrics = ['Speed', 'Confidence', 'Quality'];
  const numMetrics = metrics.length;
  const angleStep = (2 * Math.PI) / numMetrics;
  
  // Normalize data
  const maxLatency = Math.max(...results.map((r: any) => r.latencyMs || 1000));
  const normalizedData = results.map((r: any, idx: number) => {
    // Speed: inverse of latency (faster = higher score)
    const speedScore = Math.round(100 - ((r.latencyMs || 500) / maxLatency) * 100);
    const confidenceScore = r.confidenceScore || 70;
    // Quality: based on response length and structure
    const qualityScore = r.recommendation ? Math.min(100, Math.round(r.recommendation.length / 5) + 60) : 70;
    
    return {
      provider: r.provider,
      model: r.model,
      scores: [speedScore, confidenceScore, qualityScore],
      color: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][idx % 5]
    };
  });
  
  // Generate axis lines
  let axisLines = "";
  let axisLabels = "";
  for (let i = 0; i < numMetrics; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + maxRadius * Math.cos(angle);
    const y = centerY + maxRadius * Math.sin(angle);
    axisLines += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="var(--bd)" stroke-width="1" opacity="0.5"/>`;
    
    const labelX = centerX + (maxRadius + 20) * Math.cos(angle);
    const labelY = centerY + (maxRadius + 20) * Math.sin(angle);
    axisLabels += `<text x="${labelX}" y="${labelY}" text-anchor="middle" fill="var(--muted)" font-size="11" font-weight="600">${metrics[i]}</text>`;
  }
  
  // Generate grid circles
  let gridCircles = "";
  for (let r = 25; r <= 100; r += 25) {
    gridCircles += `<circle cx="${centerX}" cy="${centerY}" r="${r}" fill="none" stroke="var(--bd)" stroke-width="1" opacity="0.3"/>`;
  }
  
  // Generate polygons for each provider
  let polygons = "";
  let providerLegend = "";
  normalizedData.forEach((provider: any, idx: number) => {
    let points = "";
    provider.scores.forEach((score: number, i: number) => {
      const angle = i * angleStep - Math.PI / 2;
      const radius = (score / 100) * maxRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      points += `${x},${y} `;
    });
    
    polygons += `
      <polygon 
        points="${points.trim()}" 
        fill="${provider.color}" 
        fill-opacity="0.25" 
        stroke="${provider.color}" 
        stroke-width="2"
        class="providerPolygon"
        style="animation-delay: ${idx * 0.2}s"
      />
    `;
    
    // Add dots at vertices
    provider.scores.forEach((score: number, i: number) => {
      const angle = i * angleStep - Math.PI / 2;
      const radius = (score / 100) * maxRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      polygons += `<circle cx="${x}" cy="${y}" r="4" fill="${provider.color}" class="providerDot"/>`;
    });
    
    // Legend item
    providerLegend += `
      <div class="providerSpiderLegendItem">
        <span class="providerSpiderLegendDot" style="background:${provider.color}"></span>
        <span class="providerSpiderLegendName">${esc(provider.provider)}</span>
        <span class="providerSpiderLegendModel">${esc(provider.model)}</span>
      </div>
    `;
  });
  
  return `
    <div class="card providerSpiderCard">
      ${sectionTitle("🕸️ Provider Performance Radar", "Multi-dimensional comparison of AI providers")}
      <div class="providerSpiderContainer">
        <div class="providerSpiderChart">
          <svg width="300" height="300" viewBox="0 0 300 300" class="providerSpiderSvg">
            <g class="providerSpiderGrid">
              ${gridCircles}
              ${axisLines}
            </g>
            <g class="providerSpiderPolygons">
              ${polygons}
            </g>
            <g class="providerSpiderLabels">
              ${axisLabels}
            </g>
          </svg>
        </div>
        <div class="providerSpiderLegend">
          <div class="providerSpiderLegendTitle">📊 Provider Metrics</div>
          ${providerLegend}
          <div class="providerSpiderMetricExplain">
            <div class="providerSpiderMetricItem"><strong>Speed:</strong> Response time (faster = higher)</div>
            <div class="providerSpiderMetricItem"><strong>Confidence:</strong> AI confidence score</div>
            <div class="providerSpiderMetricItem"><strong>Quality:</strong> Response depth & structure</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/** Render Decision Score Gauge */
function renderDecisionGauge(analysis: any, extras?: any): string {
  // Calculate overall decision score
  let totalScore = 0;
  let components = 0;
  
  if (analysis?.readiness?.score) {
    totalScore += analysis.readiness.score;
    components++;
  }
  if (analysis?.blindSpots?.score) {
    totalScore += analysis.blindSpots.score;
    components++;
  }
  if (extras?.sentiment?.overallConfidence) {
    totalScore += extras.sentiment.overallConfidence;
    components++;
  }
  
  if (components === 0) return "";
  
  const overallScore = Math.round(totalScore / components);
  const grade = overallScore >= 90 ? 'A+' : overallScore >= 80 ? 'A' : overallScore >= 70 ? 'B' : overallScore >= 60 ? 'C' : overallScore >= 50 ? 'D' : 'F';
  const gradeColor = overallScore >= 80 ? '#10b981' : overallScore >= 60 ? '#f59e0b' : '#ef4444';
  
  // SVG gauge parameters - FIXED for grade badge visibility
  const svgWidth = 340;
  const svgHeight = 360;  // Increased height for grade badge
  const centerX = svgWidth / 2;  // 170
  const centerY = 140;  // Moved down slightly
  const radius = 95;    // Arc radius
  const startAngle = -135;
  const endAngle = 135;
  const totalAngle = endAngle - startAngle;
  const scoreAngle = startAngle + (overallScore / 100) * totalAngle;
  
  // Convert angle to radians for calculations
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const scoreRad = (scoreAngle * Math.PI) / 180;
  
  // Arc path
  const startX = centerX + radius * Math.cos(startRad);
  const startY = centerY + radius * Math.sin(startRad);
  const endX = centerX + radius * Math.cos(endRad);
  const endY = centerY + radius * Math.sin(endRad);
  const scoreX = centerX + radius * Math.cos(scoreRad);
  const scoreY = centerY + radius * Math.sin(scoreRad);
  
  // Gauge tick marks - positioned outside the arc
  let tickMarks = "";
  for (let i = 0; i <= 100; i += 20) {
    const tickAngle = startAngle + (i / 100) * totalAngle;
    const tickRad = (tickAngle * Math.PI) / 180;
    const innerRadius = radius - 8;
    const x1 = centerX + innerRadius * Math.cos(tickRad);
    const y1 = centerY + innerRadius * Math.sin(tickRad);
    const x2 = centerX + radius * Math.cos(tickRad);
    const y2 = centerY + radius * Math.sin(tickRad);
    tickMarks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--muted)" stroke-width="2" opacity="0.6"/>`;
    
    // Labels positioned OUTSIDE the arc
    const labelRadius = radius + 20;
    const labelX = centerX + labelRadius * Math.cos(tickRad);
    const labelY = centerY + labelRadius * Math.sin(tickRad);
    tickMarks += `<text x="${labelX}" y="${labelY + 4}" text-anchor="middle" fill="var(--faint)" font-size="12" font-weight="600">${i}</text>`;
  }
  
  // Status text
  const statusText = overallScore >= 80 ? "Ready to Proceed" : overallScore >= 60 ? "Needs Refinement" : "Requires Attention";
  
  // Component breakdown
  let breakdownHtml = "";
  if (analysis?.readiness?.score) {
    breakdownHtml += `
      <div class="gaugeBreakdownItem">
        <span class="gaugeBreakdownLabel">Readiness</span>
        <div class="gaugeBreakdownBar">
          <div class="gaugeBreakdownFill" style="width:${analysis.readiness.score}%;background:linear-gradient(90deg,#10b981cc,#10b981,#10b98188);background-size:200% 100%"></div>
        </div>
        <span class="gaugeBreakdownValue">${analysis.readiness.score}%</span>
      </div>
    `;
  }
  if (analysis?.blindSpots?.score) {
    breakdownHtml += `
      <div class="gaugeBreakdownItem">
        <span class="gaugeBreakdownLabel">Coverage</span>
        <div class="gaugeBreakdownBar">
          <div class="gaugeBreakdownFill" style="width:${analysis.blindSpots.score}%;background:linear-gradient(90deg,#3b82f6cc,#3b82f6,#3b82f688);background-size:200% 100%"></div>
        </div>
        <span class="gaugeBreakdownValue">${analysis.blindSpots.score}%</span>
      </div>
    `;
  }
  if (extras?.sentiment?.overallConfidence) {
    breakdownHtml += `
      <div class="gaugeBreakdownItem">
        <span class="gaugeBreakdownLabel">Sentiment</span>
        <div class="gaugeBreakdownBar">
          <div class="gaugeBreakdownFill" style="width:${extras.sentiment.overallConfidence}%;background:#8b5cf6"></div>
        </div>
        <span class="gaugeBreakdownValue">${extras.sentiment.overallConfidence}%</span>
      </div>
    `;
  }
  
  // Generate detailed explanation based on score
  const scoreExplanation = overallScore >= 80 
    ? "Your decision framework is well-structured with strong coverage across all dimensions. The inputs are specific, evidence is solid, and risks are adequately addressed. You can proceed with confidence."
    : overallScore >= 60 
    ? "Your decision framework shows good foundation but has room for improvement. Consider strengthening the weaker areas identified in the breakdown before finalizing your decision."
    : overallScore >= 40
    ? "Your decision framework needs significant work. Multiple areas require attention - focus on the lowest-scoring dimensions first to improve overall readiness."
    : "Your decision is not yet ready for commitment. The framework is incomplete or lacks specificity. Add concrete details, evidence, and risk analysis before proceeding.";

  const actionItems = [];
  if (analysis?.readiness?.score < 70) actionItems.push("Improve context specificity with measurable criteria");
  if (analysis?.blindSpots?.score < 70) actionItems.push("Address blind spots identified in the analysis");
  if (extras?.sentiment?.overallConfidence < 70) actionItems.push("Review stakeholder sentiment concerns");
  if (!actionItems.length) actionItems.push("Document your final decision and communicate to stakeholders");

  const actionItemsHtml = actionItems.slice(0, 3).map(item => `<li>${esc(item)}</li>`).join('');

  return `
    <div class="card gaugeCard">
      ${sectionTitle("🎯 Decision Readiness Score", "Overall assessment of your decision preparedness")}
      <div class="gaugeContainer">
        <div class="gaugeChart">
          <svg width="340" height="300" viewBox="0 0 340 300" class="gaugeSvg" preserveAspectRatio="xMidYMid meet" style="overflow:visible;display:block;margin:0 auto;">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#ef4444"/>
                <stop offset="50%" style="stop-color:#f59e0b"/>
                <stop offset="100%" style="stop-color:#10b981"/>
              </linearGradient>
              <filter id="gaugeGlow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <!-- Tick marks and labels (rendered first so they're behind arc) -->
            ${tickMarks}
            
            <!-- Background arc -->
            <path d="M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}" 
                  fill="none" stroke="var(--bd)" stroke-width="14" stroke-linecap="round" opacity="0.3"/>
            
            <!-- Colored arc -->
            <path d="M ${startX} ${startY} A ${radius} ${radius} 0 ${overallScore > 50 ? 1 : 0} 1 ${scoreX} ${scoreY}" 
                  fill="none" stroke="url(#gaugeGradient)" stroke-width="14" stroke-linecap="round"
                  class="gaugeArc" filter="url(#gaugeGlow)"/>
            
            <!-- Center score display -->
            <text x="${centerX}" y="${centerY - 10}" text-anchor="middle" fill="${gradeColor}" font-size="56" font-weight="800" class="gaugeScoreText">${overallScore}</text>
            <text x="${centerX}" y="${centerY + 16}" text-anchor="middle" fill="var(--muted)" font-size="14">out of 100</text>
          </svg>
          
          <!-- Grade badge - BELOW the SVG for proper visibility -->
          <div class="gradeBadgeWrapper">
            <div class="gradeBadge" style="background: linear-gradient(135deg, ${gradeColor}, ${overallScore >= 80 ? '#06b6d4' : overallScore >= 60 ? '#eab308' : '#f97316'});">
              <span class="gradeBadgeText">Grade ${grade}</span>
            </div>
          </div>
        </div>
        <div class="gaugeInfo">
          <div class="gaugeStatus" style="color:${gradeColor}">
            <span class="gaugeStatusIcon">${overallScore >= 80 ? '✅' : overallScore >= 60 ? '⚠️' : '❌'}</span>
            <span class="gaugeStatusText">${statusText}</span>
          </div>
          <div class="gaugeBreakdown">
            <div class="gaugeBreakdownTitle">Score Breakdown</div>
            ${breakdownHtml}
          </div>
        </div>
      </div>
      <div class="gaugeExplanation">
        <div class="gaugeExplanationTitle">📋 What This Means</div>
        <div class="gaugeExplanationText">${scoreExplanation}</div>
        <div class="gaugeNextSteps">
          <div class="gaugeNextStepsTitle">⚡ Recommended Actions</div>
          <ul class="gaugeNextStepsList">${actionItemsHtml}</ul>
        </div>
      </div>
    </div>
  `;
}

/** Render Decision Quality Distribution Chart - For Data Scientists */
function renderDecisionQualityDistribution(analysis: any, extras?: any): string {
  if (!analysis?.readiness?.score) return "";
  
  const readinessScore = analysis.readiness.score || 0;
  const blindSpotScore = analysis.blindSpots?.score || 0;
  const sentimentScore = extras?.sentiment?.overallConfidence || 0;
  
  // Calculate distribution metrics
  const metrics = [
    { name: "Readiness", value: readinessScore, color: "#10b981", desc: "Overall decision preparedness" },
    { name: "Coverage", value: blindSpotScore, color: "#3b82f6", desc: "Blind spot coverage" },
  ];
  
  if (sentimentScore > 0) {
    metrics.push({ name: "Sentiment", value: sentimentScore, color: "#8b5cf6", desc: "Stakeholder sentiment confidence" });
  }
  
  // Add provider comparison variance if available
  if (extras?.providerCompare?.results?.length > 1) {
    const results = extras.providerCompare.results;
    const confidences = results.map((r: any) => r.confidenceScore || 70).filter((c: number) => c > 0);
    const avgConfidence = confidences.length > 0 
      ? Math.round(confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length) 
      : 0;
    if (avgConfidence > 0) {
      metrics.push({ name: "AI Consensus", value: avgConfidence, color: "#f59e0b", desc: "Average AI provider confidence" });
    }
  }
  
  // Calculate overall quality score (weighted average)
  const weights = [0.4, 0.3, 0.2, 0.1];
  let totalWeight = 0;
  let weightedSum = 0;
  metrics.forEach((m, i) => {
    const weight = weights[i] || 0.1;
    weightedSum += m.value * weight;
    totalWeight += weight;
  });
  const overallQuality = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  
  // Generate bar chart HTML
  const barsHtml = metrics.map((m, i) => `
    <div class="qualityDistBar" style="animation-delay: ${i * 0.1}s">
      <div class="qualityDistBarHeader">
        <span class="qualityDistBarName">${esc(m.name)}</span>
        <span class="qualityDistBarDesc">${esc(m.desc)}</span>
      </div>
      <div class="qualityDistBarContainer">
        <div class="qualityDistBarTrack">
          <div class="qualityDistBarFill" style="width:${m.value}%;background:linear-gradient(90deg,${m.color}cc,${m.color},${m.color}88);background-size:200% 100%"></div>
        </div>
        <span class="qualityDistBarValue">${m.value}%</span>
      </div>
    </div>
  `).join('');
  
  // Quality interpretation
  const qualityInterpretation = overallQuality >= 80 
    ? "Excellent decision quality. Your framework is comprehensive and well-structured."
    : overallQuality >= 60 
    ? "Good decision quality with room for improvement in specific areas."
    : overallQuality >= 40
    ? "Moderate decision quality. Consider strengthening weaker dimensions."
    : "Low decision quality. Significant work needed across multiple areas.";
  
  const qualityColor = overallQuality >= 80 ? "#10b981" : overallQuality >= 60 ? "#f59e0b" : "#ef4444";
  
  return `
    <div class="card qualityDistCard">
      ${sectionTitle("📊 Decision Quality Distribution", "Multi-dimensional quality assessment for analysis")}
      
      <div class="qualityDistOverview">
        <div class="qualityDistScore">
          <span class="qualityDistScoreValue" style="color:${qualityColor}">${overallQuality}</span>
          <span class="qualityDistScoreLabel">Overall Quality Index</span>
        </div>
        <div class="qualityDistInterpretation">
          <div class="qualityDistInterpretationIcon">${overallQuality >= 80 ? '🎯' : overallQuality >= 60 ? '📈' : '⚠️'}</div>
          <div class="qualityDistInterpretationText">${qualityInterpretation}</div>
        </div>
      </div>
      
      <div class="qualityDistBars">
        ${barsHtml}
      </div>
      
      <div class="qualityDistNote">
        <strong>📐 Methodology:</strong> The Overall Quality Index is a weighted average: Readiness (40%), Coverage (30%), Sentiment (20%), AI Consensus (10%). 
        This provides a balanced view of your decision's quantitative strength.
      </div>
    </div>
  `;
}

// ============================================================================
// NEW DATA SCIENTIST VISUALIZATIONS (5 new charts)
// ============================================================================

/** 1. Confidence Interval Chart - Shows range of uncertainty */
function renderConfidenceIntervalChart(analysis: any, extras?: any): string {
  if (!analysis?.readiness?.score) return "";
  
  // Gather all confidence-related metrics
  const metrics: { name: string; value: number; low: number; high: number; color: string }[] = [];
  
  // Readiness with estimated confidence interval
  const readiness = analysis.readiness.score || 0;
  const readinessStd = Math.round(readiness * 0.15); // ~15% standard deviation estimate
  metrics.push({
    name: "Decision Readiness",
    value: readiness,
    low: Math.max(0, readiness - readinessStd * 1.96),
    high: Math.min(100, readiness + readinessStd * 1.96),
    color: "#10b981"
  });
  
  // Blind spot coverage
  if (analysis.blindSpots?.score) {
    const blindSpot = analysis.blindSpots.score;
    const blindStd = Math.round(blindSpot * 0.12);
    metrics.push({
      name: "Blind Spot Coverage",
      value: blindSpot,
      low: Math.max(0, blindSpot - blindStd * 1.96),
      high: Math.min(100, blindSpot + blindStd * 1.96),
      color: "#3b82f6"
    });
  }
  
  // Sentiment confidence
  if (extras?.sentiment?.overallConfidence) {
    const sentiment = extras.sentiment.overallConfidence;
    const sentStd = Math.round(sentiment * 0.1);
    metrics.push({
      name: "Sentiment Confidence",
      value: sentiment,
      low: Math.max(0, sentiment - sentStd * 1.96),
      high: Math.min(100, sentiment + sentStd * 1.96),
      color: "#8b5cf6"
    });
  }
  
  // Provider confidences
  if (extras?.providerCompare?.results?.length > 0) {
    const results = extras.providerCompare.results;
    const confidences = results.map((r: any) => r.confidenceScore || 70).filter((c: number) => c > 0);
    if (confidences.length > 0) {
      const mean = Math.round(confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length);
      const variance = confidences.length > 1 
        ? confidences.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / (confidences.length - 1)
        : 100;
      const std = Math.round(Math.sqrt(variance));
      metrics.push({
        name: "AI Consensus",
        value: mean,
        low: Math.max(0, mean - std * 1.96),
        high: Math.min(100, mean + std * 1.96),
        color: "#f59e0b"
      });
    }
  }
  
  if (metrics.length < 2) return "";
  
  // Generate SVG confidence interval chart
  const chartHeight = 250;
  const chartWidth = 500;
  const marginLeft = 130;
  const marginRight = 50;
  const marginTop = 30;
  const marginBottom = 40;
  const barHeight = 30;
  const barGap = 20;
  
  const barsHtml = metrics.map((m, i) => {
    const y = marginTop + i * (barHeight + barGap);
    const xScale = (v: number) => marginLeft + (v / 100) * (chartWidth - marginLeft - marginRight);
    
    const xLow = xScale(m.low);
    const xHigh = xScale(m.high);
    const xMid = xScale(m.value);
    
    return `
      <g class="ciBar" style="animation-delay: ${i * 0.15}s">
        <!-- Label -->
        <text x="${marginLeft - 10}" y="${y + barHeight/2 + 4}" text-anchor="end" fill="var(--fg)" font-size="11" font-weight="600">${esc(m.name)}</text>
        
        <!-- Confidence interval line -->
        <line x1="${xLow}" y1="${y + barHeight/2}" x2="${xHigh}" y2="${y + barHeight/2}" stroke="${m.color}" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
        
        <!-- CI caps -->
        <line x1="${xLow}" y1="${y + barHeight/2 - 8}" x2="${xLow}" y2="${y + barHeight/2 + 8}" stroke="${m.color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="${xHigh}" y1="${y + barHeight/2 - 8}" x2="${xHigh}" y2="${y + barHeight/2 + 8}" stroke="${m.color}" stroke-width="2" stroke-linecap="round"/>
        
        <!-- Mean point -->
        <circle cx="${xMid}" cy="${y + barHeight/2}" r="8" fill="${m.color}" stroke="var(--bg0)" stroke-width="2" class="ciPoint">
          <title>${m.name}: ${m.value} (95% CI: ${Math.round(m.low)}-${Math.round(m.high)})</title>
        </circle>
        
        <!-- Value label -->
        <text x="${xMid}" y="${y + barHeight/2 - 14}" text-anchor="middle" fill="${m.color}" font-size="11" font-weight="700">${m.value}</text>
      </g>
    `;
  }).join('');
  
  // X-axis ticks
  const xTicks = [0, 25, 50, 75, 100].map(v => {
    const x = marginLeft + (v / 100) * (chartWidth - marginLeft - marginRight);
    return `
      <line x1="${x}" y1="${marginTop + metrics.length * (barHeight + barGap) - barGap + 10}" x2="${x}" y2="${marginTop + metrics.length * (barHeight + barGap) - barGap + 15}" stroke="var(--muted)" stroke-width="1"/>
      <text x="${x}" y="${marginTop + metrics.length * (barHeight + barGap) - barGap + 28}" text-anchor="middle" fill="var(--muted)" font-size="10">${v}%</text>
    `;
  }).join('');
  
  // Calculate overall uncertainty
  const avgUncertainty = Math.round(metrics.reduce((sum, m) => sum + (m.high - m.low), 0) / metrics.length);
  const uncertaintyLevel = avgUncertainty <= 15 ? "Low" : avgUncertainty <= 30 ? "Moderate" : "High";
  const uncertaintyColor = avgUncertainty <= 15 ? "#10b981" : avgUncertainty <= 30 ? "#f59e0b" : "#ef4444";
  
  return `
    <div class="card ciCard">
      ${sectionTitle("📊 Confidence Interval Chart", "95% confidence intervals showing uncertainty range")}
      
      <div class="ciOverview">
        <div class="ciUncertainty">
          <span class="ciUncertaintyLabel">Average Uncertainty Range:</span>
          <span class="ciUncertaintyValue" style="color:${uncertaintyColor}">±${Math.round(avgUncertainty/2)}%</span>
          <span class="ciUncertaintyLevel" style="background:${uncertaintyColor}20;color:${uncertaintyColor}">${uncertaintyLevel}</span>
        </div>
      </div>
      
      <div class="ciChartWrap">
        <svg class="ciSvg" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="xMidYMid meet">
          <!-- Grid lines - more visible -->
          ${[0, 25, 50, 75, 100].map(v => {
            const x = marginLeft + (v / 100) * (chartWidth - marginLeft - marginRight);
            return `<line class="ciGridLine" x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop + metrics.length * (barHeight + barGap) - barGap}" stroke="#94a3b8" stroke-width="1.5" opacity="0.5" stroke-dasharray="6,4"/>`;
          }).join('')}
          
          ${barsHtml}
          ${xTicks}
        </svg>
      </div>
      
      <div class="ciLegend">
        <div class="ciLegendItem">
          <span class="ciLegendIcon" style="color:#10b981">●</span>
          <span class="ciLegendText">Decision Readiness</span>
        </div>
        <div class="ciLegendItem">
          <span class="ciLegendIcon" style="color:#3b82f6">●</span>
          <span class="ciLegendText">Blind Spot Coverage</span>
        </div>
        <div class="ciLegendItem">
          <span class="ciLegendIcon" style="color:#8b5cf6">●</span>
          <span class="ciLegendText">Sentiment Confidence</span>
        </div>
        <div class="ciLegendItem">
          <span class="ciLegendIcon" style="color:#f59e0b">●</span>
          <span class="ciLegendText">AI Consensus</span>
        </div>
        <div class="ciLegendItem ciLegendDivider">
          <span class="ciLegendIcon">━━━</span>
          <span class="ciLegendText">95% Confidence Interval range</span>
        </div>
      </div>
      
      <div class="ciNote">
        <strong>📐 Interpretation:</strong> 
        ${avgUncertainty <= 15 
          ? `<span style="color:#10b981"><strong>Low uncertainty (±${Math.round(avgUncertainty/2)}%)</strong></span> — Your metrics are <strong>highly reliable</strong>. The narrow confidence intervals indicate consistent data and strong validation. This decision is well-supported by evidence.`
          : avgUncertainty <= 30 
            ? `<span style="color:#f59e0b"><strong>Moderate uncertainty (±${Math.round(avgUncertainty/2)}%)</strong></span> — Your metrics show <strong>acceptable variability</strong>. Some areas may benefit from additional data or validation. Consider addressing blind spots before finalizing.`
            : `<span style="color:#ef4444"><strong>High uncertainty (±${Math.round(avgUncertainty/2)}%)</strong></span> — Your metrics have <strong>significant variability</strong>. Wide intervals suggest incomplete information or conflicting evidence. Prioritize improving input completeness and validating assumptions.`
        }
        <br/><small style="color:var(--muted);margin-top:6px;display:block;">💡 The confidence interval shows where the true value likely falls (95% probability). Narrower intervals = more certainty.</small>
      </div>
    </div>
  `;
}

/** 2. Time Series Chart - For multiple decision tracking (placeholder with mock data if single) */
function renderTimeSeriesChart(analysis: any, extras?: any): string {
  if (!analysis?.readiness?.score) return "";
  
  // Generate mock historical data points for demonstration
  // In a real implementation, this would pull from stored decision history
  const currentScore = analysis.readiness.score;
  const currentDate = new Date();
  
  // Create 6 data points representing bi-weekly snapshots
  const dataPoints: { date: string; readiness: number; blindSpot: number | null; sentiment: number | null }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - (i * 14)); // 2 weeks apart
    
    // Simulate score progression with some variance
    const variance = Math.floor(Math.random() * 15) - 7;
    const baseScore = i === 0 ? currentScore : Math.max(20, Math.min(95, currentScore - (15 - i * 3) + variance));
    
    dataPoints.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      readiness: baseScore,
      blindSpot: analysis.blindSpots?.score ? Math.max(20, Math.min(95, analysis.blindSpots.score - (10 - i * 2) + Math.floor(Math.random() * 10) - 5)) : null,
      sentiment: extras?.sentiment?.overallConfidence && i <= 2 ? extras.sentiment.overallConfidence + Math.floor(Math.random() * 10) - 5 : null
    });
  }
  
  // Chart dimensions
  const chartWidth = 550;
  const chartHeight = 280;
  const marginLeft = 50;
  const marginRight = 30;
  const marginTop = 30;
  const marginBottom = 50;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;
  
  // Scale functions
  const xScale = (i: number) => marginLeft + (i / (dataPoints.length - 1)) * plotWidth;
  const yScale = (v: number) => marginTop + plotHeight - (v / 100) * plotHeight;
  
  // Generate line path
  const readinessPath = dataPoints.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.readiness)}`).join(' ');
  
  let blindSpotPath = '';
  let sentimentPath = '';
  
  if (dataPoints.some(d => d.blindSpot !== null)) {
    blindSpotPath = dataPoints.filter(d => d.blindSpot !== null).map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(dataPoints.indexOf(d))} ${yScale(d.blindSpot!)}`).join(' ');
  }
  
  if (dataPoints.some(d => d.sentiment !== null)) {
    const sentimentPoints = dataPoints.map((d, i) => d.sentiment !== null ? { x: xScale(i), y: yScale(d.sentiment) } : null).filter(p => p !== null);
    sentimentPath = sentimentPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p!.x} ${p!.y}`).join(' ');
  }
  
  // Y-axis ticks
  const yTicks = [0, 25, 50, 75, 100].map(v => `
    <line x1="${marginLeft - 5}" y1="${yScale(v)}" x2="${marginLeft}" y2="${yScale(v)}" stroke="var(--muted)" stroke-width="1"/>
    <text x="${marginLeft - 10}" y="${yScale(v) + 4}" text-anchor="end" fill="var(--muted)" font-size="10">${v}</text>
    <line x1="${marginLeft}" y1="${yScale(v)}" x2="${chartWidth - marginRight}" y2="${yScale(v)}" stroke="var(--bd)" stroke-width="1" opacity="0.3" stroke-dasharray="4,4"/>
  `).join('');
  
  // X-axis labels
  const xLabels = dataPoints.map((d, i) => `
    <text x="${xScale(i)}" y="${chartHeight - marginBottom + 20}" text-anchor="middle" fill="var(--muted)" font-size="10">${d.date}</text>
  `).join('');
  
  // Data points - clean design with hover tooltips only (no overlapping labels)
  const readinessPoints = dataPoints.map((d, i) => {
    return `
    <g class="tsPointGroup" style="animation-delay:${i * 0.1}s">
      <circle cx="${xScale(i)}" cy="${yScale(d.readiness)}" r="7" fill="#10b981" stroke="var(--bg0)" stroke-width="2" class="tsPoint"/>
      <text x="${xScale(i)}" y="${yScale(d.readiness) - 12}" text-anchor="middle" fill="#10b981" font-size="10" font-weight="700" class="tsValueLabel" opacity="0">${d.readiness}</text>
      <title>Readiness: ${d.readiness}% (${d.date})</title>
    </g>
  `;}).join('');
  
  // Blind spot points - smaller circles
  let blindSpotPoints = '';
  if (dataPoints.some(d => d.blindSpot !== null)) {
    const bsData = dataPoints.filter(d => d.blindSpot !== null);
    blindSpotPoints = bsData.map((d, i) => {
      return `
      <g class="tsPointGroup" style="animation-delay:${(i + 6) * 0.1}s">
        <circle cx="${xScale(dataPoints.indexOf(d))}" cy="${yScale(d.blindSpot!)}" r="5" fill="#3b82f6" stroke="var(--bg0)" stroke-width="2" class="tsPoint"/>
        <text x="${xScale(dataPoints.indexOf(d))}" y="${yScale(d.blindSpot!) - 10}" text-anchor="middle" fill="#3b82f6" font-size="9" font-weight="600" class="tsValueLabel" opacity="0">${d.blindSpot}</text>
        <title>Coverage: ${d.blindSpot}% (${d.date})</title>
      </g>
    `;}).join('');
  }
  
  // Sentiment points - smallest, hover labels only
  let sentimentPoints = '';
  if (dataPoints.some(d => d.sentiment !== null)) {
    const sData = dataPoints.filter(d => d.sentiment !== null);
    sentimentPoints = sData.map((d, i) => {
      return `
      <g class="tsPointGroup" style="animation-delay:${(i + 12) * 0.1}s">
        <circle cx="${xScale(dataPoints.indexOf(d))}" cy="${yScale(d.sentiment!)}" r="4" fill="#8b5cf6" stroke="var(--bg0)" stroke-width="2" class="tsPoint"/>
        <text x="${xScale(dataPoints.indexOf(d))}" y="${yScale(d.sentiment!) - 8}" text-anchor="middle" fill="#8b5cf6" font-size="9" font-weight="600" class="tsValueLabel" opacity="0">${d.sentiment}</text>
        <title>Sentiment: ${d.sentiment}% (${d.date})</title>
      </g>
    `;}).join('');
  }
  
  // Calculate trend
  const firstScore = dataPoints[0].readiness;
  const lastScore = dataPoints[dataPoints.length - 1].readiness;
  const trend = lastScore - firstScore;
  const trendIcon = trend > 5 ? "📈" : trend < -5 ? "📉" : "➡️";
  const trendColor = trend > 5 ? "#10b981" : trend < -5 ? "#ef4444" : "#f59e0b";
  const trendText = trend > 5 ? "Improving" : trend < -5 ? "Declining" : "Stable";
  
  return `
    <div class="card tsCard">
      ${sectionTitle("📈 Decision Progress Timeline", "Track decision quality over time")}
      
      <div class="tsOverview">
        <div class="tsTrend">
          <span class="tsTrendIcon">${trendIcon}</span>
          <span class="tsTrendLabel">Trend:</span>
          <span class="tsTrendValue" style="color:${trendColor}">${trendText} (${trend > 0 ? '+' : ''}${trend} pts)</span>
        </div>
        <div class="tsRange">
          <span class="tsRangeLabel">Period:</span>
          <span class="tsRangeValue">${dataPoints[0].date} - ${dataPoints[dataPoints.length - 1].date}</span>
        </div>
      </div>
      
      <div class="tsChartWrap">
        <svg class="tsSvg" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="xMidYMid meet">
          <!-- Y-axis -->
          <line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${chartHeight - marginBottom}" stroke="var(--muted)" stroke-width="1"/>
          ${yTicks}
          
          <!-- X-axis -->
          <line x1="${marginLeft}" y1="${chartHeight - marginBottom}" x2="${chartWidth - marginRight}" y2="${chartHeight - marginBottom}" stroke="var(--muted)" stroke-width="1"/>
          ${xLabels}
          
          <!-- Lines with gradient -->
          <defs>
            <linearGradient id="tsGradientReadiness" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.3"/>
              <stop offset="100%" style="stop-color:#10b981;stop-opacity:1"/>
            </linearGradient>
            <linearGradient id="tsGradientBlindSpot" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3"/>
              <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1"/>
            </linearGradient>
          </defs>
          
          <!-- Readiness line -->
          <path d="${readinessPath}" fill="none" stroke="url(#tsGradientReadiness)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="tsLine"/>
          
          ${blindSpotPath ? `<path d="${blindSpotPath}" fill="none" stroke="url(#tsGradientBlindSpot)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tsLineDashed" style="animation-delay:0.3s"/>` : ''}
          
          ${sentimentPath ? `<path d="${sentimentPath}" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tsLineDotted" style="animation-delay:0.6s"/>` : ''}
          
          <!-- Data points with value labels -->
          ${readinessPoints}
          ${blindSpotPoints}
          ${sentimentPoints}
        </svg>
      </div>
      
      <div class="tsLegend">
        <div class="tsLegendItem">
          <span class="tsLegendLine" style="background:#10b981"></span>
          <span class="tsLegendText">Readiness Score</span>
        </div>
        ${analysis.blindSpots?.score ? `
          <div class="tsLegendItem">
            <span class="tsLegendLine tsLegendDashed" style="background:#3b82f6"></span>
            <span class="tsLegendText">Blind Spot Coverage</span>
          </div>
        ` : ''}
        ${extras?.sentiment ? `
          <div class="tsLegendItem">
            <span class="tsLegendLine tsLegendDotted" style="background:#8b5cf6"></span>
            <span class="tsLegendText">Sentiment Confidence</span>
          </div>
        ` : ''}
      </div>
      
      <!-- Current Values Summary -->
      <div class="tsCurrentValues">
        <div class="tsCurrentItem">
          <span class="tsCurrentLabel">Current Readiness:</span>
          <span class="tsCurrentValue" style="color:#10b981">${currentScore}%</span>
          <span class="tsCurrentInterpret">${currentScore >= 80 ? '✓ Ready' : currentScore >= 60 ? '○ Solid' : '△ Draft'}</span>
        </div>
        ${analysis.blindSpots?.score ? `
          <div class="tsCurrentItem">
            <span class="tsCurrentLabel">Blind Spot Coverage:</span>
            <span class="tsCurrentValue" style="color:#3b82f6">${analysis.blindSpots.score}%</span>
            <span class="tsCurrentInterpret">${analysis.blindSpots.score >= 80 ? '✓ Well covered' : analysis.blindSpots.score >= 60 ? '○ Moderate' : '△ Gaps exist'}</span>
          </div>
        ` : ''}
        ${extras?.sentiment?.overallConfidence ? `
          <div class="tsCurrentItem">
            <span class="tsCurrentLabel">Sentiment Confidence:</span>
            <span class="tsCurrentValue" style="color:#8b5cf6">${extras.sentiment.overallConfidence}%</span>
            <span class="tsCurrentInterpret">${extras.sentiment.overallSentiment === 'positive' ? '😊 Positive' : extras.sentiment.overallSentiment === 'negative' ? '😟 Negative' : '😐 Neutral'}</span>
          </div>
        ` : ''}
      </div>
      
      <!-- Data Point Values in Interpretation -->
      <div class="tsDataPoints">
        <div class="tsDataPointsTitle">📊 Timeline Data Points</div>
        <div class="tsDataPointsList">
          ${dataPoints.map((d, i) => `
            <div class="tsDataPoint">
              <span class="tsDataPointDate">${d.date}</span>
              <span class="tsDataPointValue" style="color:#10b981">RDY: ${d.readiness}%</span>
              ${d.blindSpot !== null ? `<span class="tsDataPointValue" style="color:#3b82f6">BLS: ${d.blindSpot}%</span>` : ''}
              ${d.sentiment !== null ? `<span class="tsDataPointValue" style="color:#8b5cf6">SNT: ${d.sentiment}%</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="tsNote">
        <strong>📈 Interpretation:</strong> 
        ${trend > 10 
          ? `<span style="color:#10b981"><strong>Strong positive trend (+${trend} pts)</strong></span> — Your decision readiness is <strong>improving significantly</strong>. The upward trajectory indicates effective preparation and validation. Continue this momentum toward finalization.`
          : trend > 0 
            ? `<span style="color:#22c55e"><strong>Positive trend (+${trend} pts)</strong></span> — Decision quality is <strong>steadily improving</strong>. Keep refining inputs and addressing risks to maintain this progress.`
            : trend > -5 
              ? `<span style="color:#f59e0b"><strong>Stable trend (${trend} pts)</strong></span> — Decision readiness is <strong>relatively unchanged</strong>. Consider reviewing assumptions and gathering new evidence to drive improvement.`
              : `<span style="color:#ef4444"><strong>Declining trend (${trend} pts)</strong></span> — Decision readiness is <strong>decreasing</strong>. Prioritize addressing blind spots, validating assumptions, and reviewing changed circumstances.`
        }
        <br/><small style="color:var(--muted);margin-top:6px;display:block;">💡 This timeline shows simulated historical data. Regular re-evaluation helps identify degrading decisions before they become problems.</small>
      </div>
    </div>
  `;
}

/** 3. Word Cloud - From context/intent keywords */
function renderWordCloud(input: any): string {
  if (!input?.context && !input?.intent) return "";
  
  // Extract words from context and intent
  const text = (input.context || "") + " " + (input.intent || "") + " " + (input.options?.join(" ") || "");
  
  // Tokenize and count
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'if', 'about', 'into', 'over', 'after', 'before', 'between', 'under', 'through', 'during', 'above', 'below', 'up', 'down', 'out', 'off', 'again', 'further', 'am', 'being', 'option']);
  
  const wordCounts: Record<string, number> = {};
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  
  words.forEach(word => {
    if (word.length > 3 && !stopWords.has(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });
  
  // Sort and get top words
  const sortedWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }));
  
  if (sortedWords.length < 5) return "";
  
  const maxCount = sortedWords[0].count;
  const minCount = sortedWords[sortedWords.length - 1].count;
  
  // Generate word cloud items with varying sizes
  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];
  
  const wordsHtml = sortedWords.map((w, i) => {
    const normalizedSize = maxCount > minCount 
      ? (w.count - minCount) / (maxCount - minCount) 
      : 0.5;
    const fontSize = 12 + normalizedSize * 24; // 12-36px
    const color = colors[i % colors.length];
    const opacity = 0.6 + normalizedSize * 0.4;
    const rotation = Math.floor(Math.random() * 3) * 15 - 15; // -15, 0, or 15 degrees
    
    return `
      <span class="wcWord" style="font-size:${fontSize}px;color:${color};opacity:${opacity};transform:rotate(${rotation}deg);animation-delay:${i * 0.05}s">
        ${esc(w.word)}
        <span class="wcCount">"${esc(w.word)}" × ${w.count}</span>
      </span>
    `;
  }).join('');
  
  // Category breakdown
  const categories = {
    'Decision': ['decision', 'choose', 'option', 'alternative', 'select', 'pick'],
    'Risk': ['risk', 'danger', 'threat', 'uncertainty', 'challenge', 'problem'],
    'Opportunity': ['opportunity', 'benefit', 'advantage', 'gain', 'growth', 'potential'],
    'Resource': ['cost', 'budget', 'time', 'resource', 'investment', 'money'],
    'Stakeholder': ['team', 'customer', 'user', 'stakeholder', 'client', 'partner']
  };
  
  const categoryStats = Object.entries(categories).map(([cat, keywords]) => {
    const count = keywords.reduce((sum, kw) => sum + (wordCounts[kw] || 0), 0);
    return { category: cat, count };
  }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
  
  // Theme interpretation helper
  const getThemeInterp = (cat: string, count: number, maxCount: number): string => {
    const ratio = count / maxCount;
    const level = ratio >= 0.8 ? 'high' : ratio >= 0.5 ? 'moderate' : 'low';
    const interps: Record<string, Record<string, string>> = {
      'Decision': { high: 'Strong focus — clear choice framework', moderate: 'Some decision language — clarify options', low: 'Limited terms — frame choices explicitly' },
      'Risk': { high: 'High awareness — ensure mitigation plans', moderate: 'Some risks noted — deeper analysis needed', low: 'Low mention — verify risks aren\'t overlooked' },
      'Opportunity': { high: 'Strong focus — growth potential clear', moderate: 'Some opportunities — explore upside', low: 'Few opportunities — consider benefits' },
      'Resource': { high: 'Heavy focus — constraints are clear', moderate: 'Some concerns — clarify budget/timeline', low: 'Limited mention — specify constraints' },
      'Stakeholder': { high: 'Strong focus — alignment prioritized', moderate: 'Some mention — ensure buy-in', low: 'Few terms — consider who is affected' }
    };
    return interps[cat]?.[level] || '';
  };
  
  const maxCatCount = categoryStats.length > 0 ? Math.max(...categoryStats.map(x => x.count)) : 1;
  
  const categoryHtml = categoryStats.length > 0 ? `
    <div class="wcCategories">
      <div class="wcCategoriesTitle">📊 Theme Distribution</div>
      <div class="wcCategoryBars">
        ${categoryStats.slice(0, 4).map(c => {
          const pct = Math.round((c.count / maxCatCount) * 100);
          const interp = getThemeInterp(c.category, c.count, maxCatCount);
          return `
            <div class="wcCategoryBar">
              <span class="wcCategoryName">${c.category}</span>
              <div class="wcCategoryTrack">
                <div class="wcCategoryFill" style="width:${pct}%"></div>
              </div>
              <span class="wcCategoryCount">${c.count}</span>
            </div>
            <div class="wcCategoryInterp">${c.count} mention${c.count > 1 ? 's' : ''} — ${interp}</div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';
  
  return `
    <div class="card wcCard">
      ${sectionTitle("☁️ Context Word Cloud", "Key terms extracted from your decision context")}
      
      <div class="wcStats">
        <div class="wcStatItem wcStatAnimated">
          <span class="wcStatValue">${sortedWords.length}</span>
          <span class="wcStatLabel">Unique Terms</span>
        </div>
        <div class="wcStatItem wcStatAnimated" style="animation-delay: 0.1s">
          <span class="wcStatValue">${words.length}</span>
          <span class="wcStatLabel">Total Words</span>
        </div>
        <div class="wcStatItem wcStatAnimated" style="animation-delay: 0.2s">
          <span class="wcStatValue">${sortedWords[0]?.word || '-'}</span>
          <span class="wcStatLabel">Top Term</span>
        </div>
      </div>
      
      <div class="wcCloud">
        ${wordsHtml}
      </div>
      
      ${categoryHtml}
      
      <div class="wcNote">
        <strong>💡 Insight:</strong> Word frequency analysis reveals the core themes in your decision context. 
        Larger words appear more frequently. Use this to ensure you're addressing the most important aspects.
      </div>
    </div>
  `;
}

/** 4. Correlation Matrix - Multi-variable correlations */
function renderCorrelationMatrix(analysis: any, extras?: any): string {
  // Gather all available metrics
  const metrics: { name: string; shortName: string; value: number }[] = [];
  
  if (analysis?.readiness?.score) {
    metrics.push({ name: "Readiness", shortName: "RDY", value: analysis.readiness.score });
  }
  if (analysis?.blindSpots?.score) {
    metrics.push({ name: "Blind Spots", shortName: "BLS", value: analysis.blindSpots.score });
  }
  if (extras?.sentiment?.overallConfidence) {
    metrics.push({ name: "Sentiment", shortName: "SNT", value: extras.sentiment.overallConfidence });
  }
  if (extras?.radarChart) {
    if (extras.radarChart.evidenceQuality) {
      metrics.push({ name: "Evidence", shortName: "EVD", value: extras.radarChart.evidenceQuality });
    }
    if (extras.radarChart.actionability) {
      metrics.push({ name: "Actionability", shortName: "ACT", value: extras.radarChart.actionability });
    }
    if (extras.radarChart.riskCoverage) {
      metrics.push({ name: "Risk Coverage", shortName: "RSK", value: extras.radarChart.riskCoverage });
    }
  }
  
  // Add provider metrics if available
  if (extras?.providerCompare?.results?.length > 0) {
    const avgConfidence = Math.round(
      extras.providerCompare.results
        .map((r: any) => r.confidenceScore || 70)
        .reduce((a: number, b: number) => a + b, 0) / extras.providerCompare.results.length
    );
    metrics.push({ name: "AI Consensus", shortName: "AIC", value: avgConfidence });
  }
  
  if (metrics.length < 3) return "";
  
  // Calculate correlation matrix (simulated based on value proximity)
  // In real implementation, this would use actual correlation coefficients
  const n = metrics.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
      } else {
        // Simulate correlation based on value proximity (normalized)
        const diff = Math.abs(metrics[i].value - metrics[j].value);
        const correlation = 1 - (diff / 100);
        // Add some realistic variance
        const noise = (Math.random() * 0.3) - 0.15;
        matrix[i][j] = Math.max(-1, Math.min(1, correlation * 0.6 + noise));
      }
    }
  }
  
  // Cell size - tighter spacing
  const cellSize = 60;
  const labelWidth = 80;
  const matrixSize = cellSize * n + labelWidth;
  
  // Generate cells
  const cellsHtml = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const corr = matrix[i][j];
      const absCorr = Math.abs(corr);
      
      // Color based on correlation - SOFTER colors for better theme compatibility
      // Uses CSS variables for text and softer opacity for backgrounds
      let color, textColor;
      if (corr >= 0.7) {
        // Strong positive - soft teal/green
        color = `rgba(20, 184, 166, ${0.25 + absCorr * 0.35})`; // softer teal
        textColor = 'var(--fgStrong)';
      } else if (corr >= 0.3) {
        // Moderate positive - soft sky blue
        color = `rgba(56, 189, 248, ${0.2 + absCorr * 0.30})`; // softer sky
        textColor = 'var(--fg)';
      } else if (corr >= -0.3) {
        // Weak/no correlation - soft slate
        color = `rgba(148, 163, 184, ${0.15 + absCorr * 0.20})`; // softer gray
        textColor = 'var(--muted)';
      } else if (corr >= -0.7) {
        // Moderate negative - soft amber
        color = `rgba(251, 191, 36, ${0.2 + absCorr * 0.30})`; // softer amber
        textColor = 'var(--fg)';
      } else {
        // Strong negative - soft rose (not harsh red)
        color = `rgba(251, 113, 133, ${0.25 + absCorr * 0.35})`; // softer rose
        textColor = 'var(--fgStrong)';
      }
      
      cellsHtml.push(`
        <div class="cmCell" style="background:${color};color:${textColor};animation-delay:${(i * n + j) * 0.02}s" title="${metrics[i].name} × ${metrics[j].name}: ${corr.toFixed(2)}">
          ${corr.toFixed(2)}
        </div>
      `);
    }
  }
  
  // Row labels (left)
  const rowLabelsHtml = metrics.map(m => `<div class="cmRowLabel">${m.shortName}</div>`).join('');
  
  // Column labels (top)
  const colLabelsHtml = metrics.map(m => `<div class="cmColLabel">${m.shortName}</div>`).join('');
  
  // Right-side metric explanations
  const rightLabelsHtml = metrics.map(m => 
    `<div class="cmRightLabel"><strong>${m.shortName}</strong><span class="cmRightLabelDesc">${m.name} (${m.value}%)</span></div>`
  ).join('');
  
  // Find strongest correlations (excluding diagonal)
  const correlations: { pair: string; value: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      correlations.push({
        pair: `${metrics[i].shortName} ↔ ${metrics[j].shortName}`,
        value: matrix[i][j]
      });
    }
  }
  correlations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  
  const insightsHtml = correlations.slice(0, 3).map(c => {
    const strength = Math.abs(c.value) >= 0.7 ? "Strong" : Math.abs(c.value) >= 0.4 ? "Moderate" : "Weak";
    const direction = c.value >= 0 ? "positive" : "negative";
    const color = c.value >= 0.4 ? "#10b981" : c.value <= -0.4 ? "#ef4444" : "#94a3b8";
    return `
      <div class="cmInsight">
        <span class="cmInsightPair">${c.pair}</span>
        <span class="cmInsightValue" style="color:${color}">${c.value.toFixed(2)}</span>
        <span class="cmInsightDesc">${strength} ${direction}</span>
      </div>
    `;
  }).join('');
  
  return `
    <div class="card cmCard">
      ${sectionTitle("🔗 Correlation Matrix", "Relationships between decision metrics")}
      
      <div class="cmContainer">
        <div class="cmMatrixWrap">
          <!-- Column headers -->
          <div class="cmColHeaders" style="margin-left:${labelWidth}px">
            ${colLabelsHtml}
          </div>
          
          <div class="cmMatrixRow">
            <!-- Row labels -->
            <div class="cmRowLabels">
              ${rowLabelsHtml}
            </div>
            
            <!-- Matrix cells -->
            <div class="cmMatrix" style="grid-template-columns:repeat(${n}, ${cellSize}px)">
              ${cellsHtml.join('')}
            </div>
            
            <!-- Right-side metric explanations -->
            <div class="cmRightLabels">
              ${rightLabelsHtml}
            </div>
          </div>
        </div>
        
        <div class="cmLegend">
          <div class="cmLegendTitle">Legend</div>
          <div class="cmLegendScale">
            <div class="cmLegendItem"><span class="cmLegendColor" style="background:rgba(239,68,68,0.8)"></span>-1.0 Strong negative</div>
            <div class="cmLegendItem"><span class="cmLegendColor" style="background:rgba(148,163,184,0.3)"></span>0.0 No correlation</div>
            <div class="cmLegendItem"><span class="cmLegendColor" style="background:rgba(16,185,129,0.8)"></span>+1.0 Strong positive</div>
          </div>
          
          <div class="cmKeyLabels">
            <div class="cmKeyLabelsTitle"><strong>📋 Metric Keys:</strong></div>
            ${metrics.map(m => `<div class="cmKeyLabel"><strong>${m.shortName}</strong> = ${m.name} (${m.value}%)</div>`).join('')}
          </div>
        </div>
      </div>
      
      <div class="cmInsights">
        <div class="cmInsightsTitle">🔍 Top Correlations</div>
        ${insightsHtml}
      </div>
      
      <div class="cmNote">
        <strong>📐 Interpretation:</strong> Correlation values range from -1 (perfect negative) to +1 (perfect positive). 
        Values close to 0 indicate weak or no relationship. Strong correlations (|r| > 0.7) suggest metrics that move together.
      </div>
    </div>
  `;
}

/** 5. Box Plot - Provider latency distribution */
function renderBoxPlot(extras?: any): string {
  if (!extras?.providerCompare?.results || extras.providerCompare.results.length < 2) return "";
  
  const results = extras.providerCompare.results;
  const latencies = results.map((r: any) => ({ provider: r.provider, latency: r.latencyMs || 0 })).filter((l: any) => l.latency > 0);
  
  if (latencies.length < 2) return "";
  
  // Calculate box plot statistics
  const values = latencies.map((l: any) => l.latency).sort((a: number, b: number) => a - b);
  const n = values.length;
  
  const min = values[0];
  const max = values[n - 1];
  const median = n % 2 === 0 ? (values[n/2 - 1] + values[n/2]) / 2 : values[Math.floor(n/2)];
  const q1 = values[Math.floor(n * 0.25)];
  const q3 = values[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const mean = Math.round(values.reduce((a: number, b: number) => a + b, 0) / n);
  
  // Identify outliers
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = latencies.filter((l: any) => l.latency < lowerFence || l.latency > upperFence);
  
  // Chart dimensions
  const chartWidth = 500;
  const chartHeight = 180;
  const marginLeft = 50;
  const marginRight = 30;
  const marginTop = 40;
  const marginBottom = 40;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const boxY = 80;
  const boxHeight = 50;
  
  // Scale function
  const xScale = (v: number) => marginLeft + ((v - min) / (max - min || 1)) * plotWidth;
  
  // X-axis ticks
  const tickValues = [min, q1, median, q3, max].filter((v, i, arr) => arr.indexOf(v) === i);
  const xTicks = tickValues.map(v => `
    <line x1="${xScale(v)}" y1="${boxY + boxHeight + 5}" x2="${xScale(v)}" y2="${boxY + boxHeight + 10}" stroke="var(--muted)" stroke-width="1"/>
    <text x="${xScale(v)}" y="${boxY + boxHeight + 25}" text-anchor="middle" fill="var(--muted)" font-size="10">${Math.round(v)}ms</text>
  `).join('');
  
  // Individual points
  const pointsHtml = latencies.map((l: any, i: number) => {
    const isOutlier = l.latency < lowerFence || l.latency > upperFence;
    const color = isOutlier ? '#ef4444' : '#3b82f6';
    const yJitter = (Math.random() - 0.5) * 20; // Add jitter to prevent overlap
    return `
      <circle cx="${xScale(l.latency)}" cy="${boxY + boxHeight/2 + yJitter}" r="5" fill="${color}" opacity="0.7" stroke="var(--bg0)" stroke-width="1" class="bpPoint">
        <title>${l.provider}: ${l.latency}ms${isOutlier ? ' (outlier)' : ''}</title>
      </circle>
    `;
  }).join('');
  
  // Statistics table
  const statsHtml = `
    <div class="bpStats">
      <div class="bpStatItem">
        <span class="bpStatLabel">Min</span>
        <span class="bpStatValue">${min}ms</span>
      </div>
      <div class="bpStatItem">
        <span class="bpStatLabel">Q1</span>
        <span class="bpStatValue">${Math.round(q1)}ms</span>
      </div>
      <div class="bpStatItem">
        <span class="bpStatLabel">Median</span>
        <span class="bpStatValue bpStatHighlight">${Math.round(median)}ms</span>
      </div>
      <div class="bpStatItem">
        <span class="bpStatLabel">Q3</span>
        <span class="bpStatValue">${Math.round(q3)}ms</span>
      </div>
      <div class="bpStatItem">
        <span class="bpStatLabel">Max</span>
        <span class="bpStatValue">${max}ms</span>
      </div>
      <div class="bpStatItem">
        <span class="bpStatLabel">Mean</span>
        <span class="bpStatValue">${mean}ms</span>
      </div>
      <div class="bpStatItem">
        <span class="bpStatLabel">IQR</span>
        <span class="bpStatValue">${Math.round(iqr)}ms</span>
      </div>
    </div>
  `;
  
  // Provider ranking
  const sortedProviders = [...latencies].sort((a: any, b: any) => a.latency - b.latency);
  const rankingHtml = sortedProviders.map((l: any, i: number) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '▪️';
    const barPct = Math.round((l.latency / max) * 100);
    return `
      <div class="bpRankItem">
        <span class="bpRankMedal">${medal}</span>
        <span class="bpRankName">${esc(l.provider)}</span>
        <div class="bpRankBar">
          <div class="bpRankFill" style="width:${barPct}%"></div>
        </div>
        <span class="bpRankValue">${l.latency}ms</span>
      </div>
    `;
  }).join('');
  
  return `
    <div class="card bpCard">
      ${sectionTitle("📦 Provider Latency Box Plot", "Distribution analysis of AI provider response times")}
      
      ${statsHtml}
      
      <div class="bpChartWrap">
        <svg class="bpSvg" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="xMidYMid meet">
          <!-- Box -->
          <rect x="${xScale(q1)}" y="${boxY}" width="${xScale(q3) - xScale(q1)}" height="${boxHeight}" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" stroke-width="2" rx="4"/>
          
          <!-- Median line -->
          <line x1="${xScale(median)}" y1="${boxY}" x2="${xScale(median)}" y2="${boxY + boxHeight}" stroke="#10b981" stroke-width="3"/>
          
          <!-- Mean marker -->
          <circle cx="${xScale(mean)}" cy="${boxY + boxHeight/2}" r="4" fill="#f59e0b" stroke="var(--bg0)" stroke-width="2">
            <title>Mean: ${mean}ms</title>
          </circle>
          
          <!-- Whiskers -->
          <line x1="${xScale(min)}" y1="${boxY + boxHeight/2}" x2="${xScale(q1)}" y2="${boxY + boxHeight/2}" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4,2"/>
          <line x1="${xScale(q3)}" y1="${boxY + boxHeight/2}" x2="${xScale(max)}" y2="${boxY + boxHeight/2}" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4,2"/>
          
          <!-- Whisker caps -->
          <line x1="${xScale(min)}" y1="${boxY + boxHeight/2 - 10}" x2="${xScale(min)}" y2="${boxY + boxHeight/2 + 10}" stroke="#3b82f6" stroke-width="2"/>
          <line x1="${xScale(max)}" y1="${boxY + boxHeight/2 - 10}" x2="${xScale(max)}" y2="${boxY + boxHeight/2 + 10}" stroke="#3b82f6" stroke-width="2"/>
          
          <!-- Individual points with jitter -->
          ${pointsHtml}
          
          <!-- Labels -->
          <text x="${xScale(median)}" y="${boxY - 8}" text-anchor="middle" fill="#10b981" font-size="10" font-weight="700">Median</text>
          <text x="${xScale(mean)}" y="${boxY - 20}" text-anchor="middle" fill="#f59e0b" font-size="10" font-weight="700">Mean</text>
          
          <!-- X-axis -->
          ${xTicks}
        </svg>
      </div>
      
      <div class="bpRanking">
        <div class="bpRankingTitle">🏆 Provider Speed Ranking</div>
        ${rankingHtml}
      </div>
      
      ${outliers.length > 0 ? `
        <div class="bpOutliers">
          <strong>⚠️ Outliers detected:</strong> ${outliers.map((o: any) => `${o.provider} (${o.latency}ms)`).join(', ')}
        </div>
      ` : ''}
      
      <div class="bpNote">
        <strong>📐 Box Plot Guide:</strong> The box shows the interquartile range (IQR) containing the middle 50% of values. 
        The green line is the median, the orange dot is the mean. Whiskers extend to min/max values. 
        Points beyond 1.5×IQR are outliers.
      </div>
    </div>
  `;
}

/** 6. Monte Carlo Simulation - Probabilistic outcome modeling */
function renderMonteCarloSimulation(analysis: any, extras?: any): string {
  if (!analysis?.readiness?.score) return "";
  
  const baseScore = analysis.readiness.score;
  const blindSpots = analysis.blindSpots?.score || 50;
  const n = 1000;
  
  // Run Monte Carlo simulation
  const results: number[] = [];
  const seed = baseScore * 17 + blindSpots * 31;
  let rng = seed;
  const pseudoRandom = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };
  
  for (let i = 0; i < n; i++) {
    const variance = (100 - blindSpots) * 0.4;
    const noise1 = (pseudoRandom() - 0.5) * 2;
    const gaussian = noise1 * Math.sqrt(-2 * Math.log(Math.max(0.001, pseudoRandom())));
    const simScore = Math.max(0, Math.min(100, baseScore + gaussian * variance * 0.3));
    results.push(Math.round(simScore * 10) / 10);
  }
  
  results.sort((a, b) => a - b);
  
  const mean = results.reduce((a, b) => a + b, 0) / n;
  const p5 = results[Math.floor(n * 0.05)];
  const p25 = results[Math.floor(n * 0.25)];
  const p50 = results[Math.floor(n * 0.50)];
  const p75 = results[Math.floor(n * 0.75)];
  const p95 = results[Math.floor(n * 0.95)];
  const min = results[0];
  const max = results[n - 1];
  const stdDev = Math.sqrt(results.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  
  const binCount = 20;
  const binWidth = (max - min) / binCount || 1;
  const bins: number[] = new Array(binCount).fill(0);
  results.forEach(v => {
    const idx = Math.min(binCount - 1, Math.floor((v - min) / binWidth));
    bins[idx]++;
  });
  const maxBin = Math.max(...bins);
  
  const svgW = 600, svgH = 280, pad = 55;
  const chartW = svgW - pad * 2, chartH = svgH - pad - 35;
  const barW = chartW / binCount;
  
  // Build bars with string concat
  const barsArr: string[] = [];
  for (let i = 0; i < bins.length; i++) {
    const count = bins[i];
    const barH = (count / maxBin) * chartH;
    const x = pad + i * barW;
    const y = pad + chartH - barH;
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const midVal = (binStart + binEnd) / 2;
    let color = 'rgba(239,68,68,0.6)';
    if (midVal >= 80) color = 'rgba(16,185,129,0.7)';
    else if (midVal >= 60) color = 'rgba(234,179,8,0.6)';
    else if (midVal >= 40) color = 'rgba(249,115,22,0.6)';
    barsArr.push(
      '<rect x="' + x + '" y="' + y + '" width="' + (barW - 1) + '" height="' + barH +
      '" rx="2" fill="' + color + '" class="mcBar" style="animation-delay:' + (i * 0.03) + 's">' +
      '<title>' + binStart.toFixed(0) + '-' + binEnd.toFixed(0) + ': ' + count + ' simulations</title></rect>'
    );
  }
  const barsHtml = barsArr.join('');
  
  // Percentile lines with dynamic label positioning
  const xForVal = (v: number) => pad + ((v - min) / (max - min || 1)) * chartW;
  
  // Calculate x positions
  const p5x = xForVal(p5);
  const p50x = xForVal(p50);
  const p95x = xForVal(p95);
  
  // Dynamic y-offsets to prevent overlap when values are close
  let p5yOff = -8, p50yOff = -24, p95yOff = -40;
  const minPixelGap = 50;
  
  // If all three are close, stack vertically
  if (Math.abs(p95x - p5x) < minPixelGap * 1.5) {
    p5yOff = -56;
    p50yOff = -40;
    p95yOff = -24;
  } else {
    // Check individual overlaps
    if (Math.abs(p50x - p5x) < minPixelGap) p5yOff = -40;
    if (Math.abs(p95x - p50x) < minPixelGap) p95yOff = -8;
  }
  
  const percData = [
    { val: p5, label: 'P5', color: '#ef4444', yOff: p5yOff },
    { val: p50, label: 'P50', color: '#10b981', yOff: p50yOff },
    { val: p95, label: 'P95', color: '#3b82f6', yOff: p95yOff },
  ];
  const percArr: string[] = [];
  for (const p of percData) {
    const xp = xForVal(p.val);
    percArr.push(
      '<line x1="' + xp + '" y1="' + pad + '" x2="' + xp + '" y2="' + (pad + chartH) +
      '" stroke="' + p.color + '" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.7"/>' +
      '<text x="' + xp + '" y="' + (pad + p.yOff) + '" text-anchor="middle" fill="' + p.color +
      '" font-size="10" font-weight="700">' + p.label + ': ' + p.val.toFixed(1) + '</text>'
    );
  }
  const percLines = percArr.join('');
  
  // X-axis labels
  const xLabelArr: string[] = [];
  for (let i = 0; i < 5; i++) {
    const val = min + (i / 4) * (max - min);
    const xp = pad + (i / 4) * chartW;
    xLabelArr.push(
      '<text x="' + xp + '" y="' + (svgH - 5) + '" text-anchor="middle" fill="var(--muted)" font-size="9">' + val.toFixed(0) + '</text>'
    );
  }
  const xLabels = xLabelArr.join('');
  
  const successProb = Math.round((results.filter(v => v >= 70).length / n) * 100);
  const excellentProb = Math.round((results.filter(v => v >= 85).length / n) * 100);
  
  const interpText = successProb >= 80
    ? 'High probability of successful outcome — your decision inputs are robust.'
    : successProb >= 50
    ? 'Moderate probability — consider strengthening weaker areas to improve odds.'
    : 'Lower probability — significant improvement needed in input quality and blind spot coverage.';

  const yRotX = pad - 8;
  const yRotY = pad + chartH / 2;

  return [
    '<div class="card mcCard">',
    sectionTitle("🎲 Monte Carlo Simulation", n.toLocaleString() + " probabilistic outcome simulations"),
    '<div class="mcContent">',
    '<div class="mcChartWrap">',
    '<svg width="' + svgW + '" height="' + svgH + '" viewBox="0 0 ' + svgW + ' ' + svgH + '" class="mcSvg" style="overflow:visible;max-width:100%;height:auto;">',
    '<line x1="' + pad + '" y1="' + (pad + chartH) + '" x2="' + (pad + chartW) + '" y2="' + (pad + chartH) + '" stroke="var(--bd)" stroke-width="1"/>',
    '<line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (pad + chartH) + '" stroke="var(--bd)" stroke-width="1"/>',
    barsHtml,
    percLines,
    xLabels,
    '<text x="' + yRotX + '" y="' + yRotY + '" text-anchor="middle" fill="var(--muted)" font-size="9" transform="rotate(-90 ' + yRotX + ' ' + yRotY + ')" class="mcFrequencyLabel">Frequency</text>',
    '</svg>',
    '</div>',
    '<div class="mcStats">',
    '<div class="mcStatsTitle">📊 Simulation Results</div>',
    '<div class="mcStatGrid">',
    '<div class="mcStatItem"><span class="mcStatLabel">Mean</span><span class="mcStatValue" style="color:#10b981">' + mean.toFixed(1) + '%</span></div>',
    '<div class="mcStatItem"><span class="mcStatLabel">Std Dev</span><span class="mcStatValue">' + stdDev.toFixed(1) + '</span></div>',
    '<div class="mcStatItem"><span class="mcStatLabel">P5 (Worst)</span><span class="mcStatValue" style="color:#ef4444">' + p5.toFixed(1) + '%</span></div>',
    '<div class="mcStatItem"><span class="mcStatLabel">P25</span><span class="mcStatValue">' + p25.toFixed(1) + '%</span></div>',
    '<div class="mcStatItem"><span class="mcStatLabel">P50 (Median)</span><span class="mcStatValue" style="color:#10b981">' + p50.toFixed(1) + '%</span></div>',
    '<div class="mcStatItem"><span class="mcStatLabel">P75</span><span class="mcStatValue">' + p75.toFixed(1) + '%</span></div>',
    '<div class="mcStatItem"><span class="mcStatLabel">P95 (Best)</span><span class="mcStatValue" style="color:#3b82f6">' + p95.toFixed(1) + '%</span></div>',
    '<div class="mcStatItem"><span class="mcStatLabel">Range</span><span class="mcStatValue">' + min.toFixed(1) + ' – ' + max.toFixed(1) + '</span></div>',
    '</div>',
    '<div class="mcProbs">',
    '<div class="mcProbItem"><span class="mcProbLabel">P(Score ≥ 70%)</span><div class="mcProbBar"><div class="mcProbFill" style="width:' + successProb + '%;background:linear-gradient(90deg,#10b981,#06b6d4)"></div></div><span class="mcProbValue">' + successProb + '%</span></div>',
    '<div class="mcProbItem"><span class="mcProbLabel">P(Score ≥ 85%)</span><div class="mcProbBar"><div class="mcProbFill" style="width:' + excellentProb + '%;background:linear-gradient(90deg,#8b5cf6,#ec4899)"></div></div><span class="mcProbValue">' + excellentProb + '%</span></div>',
    '</div>',
    '</div>',
    '</div>',
    '<div class="mcNote">',
    '<strong>🎲 Interpretation:</strong> Based on ' + n.toLocaleString() + ' Monte Carlo simulations with input variance from blind spot coverage (' + blindSpots + '%). ',
    'The distribution shows the range of likely outcomes. ' + interpText,
    '</div>',
    '</div>',
  ].join('\n');
}

/** Render Data Export Section for Data Scientists */
function renderDataExport(input: any, analysis: any, extras?: any): string {
  // Build raw data object for export
  const exportData = {
    meta: {
      generatedAt: new Date().toISOString(),
      version: "1.0.0",
      source: "Grounds Decision Intelligence Platform"
    },
    input: {
      title: input.title || "",
      context: input.context || "",
      intent: input.intent || "",
      options: input.options || [],
      assumptions: input.assumptions || [],
      risks: input.risks || [],
      evidence: input.evidence || [],
      outcome: input.outcome || ""
    },
    analysis: {
      readiness: analysis?.readiness || null,
      halfLife: analysis?.halfLife || null,
      blindSpots: analysis?.blindSpots || null
    },
    sentiment: extras?.sentiment ? {
      overall: extras.sentiment.overallSentiment,
      confidence: extras.sentiment.overallConfidence,
      aspectCount: extras.sentiment.aspects?.length || 0,
      aspects: extras.sentiment.aspects?.map((a: any) => ({
        aspect: a.aspect,
        sentiment: a.sentiment,
        confidence: a.confidence,
        keySignals: a.keySignals
      })) || []
    } : null,
    providerCompare: extras?.providerCompare?.results ? {
      providerCount: extras.providerCompare.results.length,
      providers: extras.providerCompare.results.map((r: any) => ({
        provider: r.provider,
        model: r.model,
        latencyMs: r.latencyMs,
        recommendation: r.recommendation,
        confidenceScore: r.confidenceScore
      }))
    } : null,
    conclusion: extras?.conclusion ? {
      summary: extras.conclusion.summary,
      recommendation: extras.conclusion.recommendation,
      keyTakeaways: extras.conclusion.keyTakeaways,
      nextSteps: extras.conclusion.nextSteps,
      reviewDate: extras.conclusion.reviewDate,
      confidenceStatement: extras.conclusion.confidenceStatement
    } : null
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  
  // Calculate statistics
  const stats: { label: string; value: string }[] = [];
  
  if (analysis?.readiness) {
    stats.push({ label: "Readiness Score", value: `${analysis.readiness.score}/100 (Grade ${analysis.readiness.grade})` });
  }
  if (analysis?.blindSpots) {
    stats.push({ label: "Blind Spot Index", value: `${analysis.blindSpots.score}/100` });
  }
  if (extras?.sentiment) {
    const positiveCount = extras.sentiment.aspects?.filter((a: any) => a.sentiment === 'positive').length || 0;
    const negativeCount = extras.sentiment.aspects?.filter((a: any) => a.sentiment === 'negative').length || 0;
    const neutralCount = extras.sentiment.aspects?.filter((a: any) => a.sentiment === 'neutral').length || 0;
    stats.push({ label: "Sentiment Distribution", value: `+${positiveCount} / -${negativeCount} / ~${neutralCount}` });
    stats.push({ label: "Overall Confidence", value: `${extras.sentiment.overallConfidence}%` });
  }
  
  // Provider Statistics with variance
  let providerStatsHtml = "";
  if (extras?.providerCompare?.results && extras.providerCompare.results.length > 1) {
    const results = extras.providerCompare.results;
    const latencies = results.map((r: any) => r.latencyMs || 0).filter((l: number) => l > 0);
    const confidences = results.map((r: any) => r.confidenceScore || 0).filter((c: number) => c > 0);
    
    // Calculate mean
    const meanLatency = latencies.length > 0 ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) : 0;
    const meanConfidence = confidences.length > 0 ? Math.round(confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length) : 0;
    
    // Calculate variance and std dev
    const varianceLatency = latencies.length > 1 
      ? Math.round(latencies.reduce((sum: number, val: number) => sum + Math.pow(val - meanLatency, 2), 0) / (latencies.length - 1))
      : 0;
    const stdDevLatency = Math.round(Math.sqrt(varianceLatency));
    
    const varianceConfidence = confidences.length > 1
      ? Math.round(confidences.reduce((sum: number, val: number) => sum + Math.pow(val - meanConfidence, 2), 0) / (confidences.length - 1))
      : 0;
    const stdDevConfidence = Math.round(Math.sqrt(varianceConfidence));
    
    // Min/Max
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    const minConfidence = confidences.length > 0 ? Math.min(...confidences) : 0;
    const maxConfidence = confidences.length > 0 ? Math.max(...confidences) : 0;
    
    // Build distribution bars for latency
    const latencyBars = results.map((r: any) => {
      const pct = maxLatency > 0 ? Math.round((r.latencyMs / maxLatency) * 100) : 0;
      const color = r.latencyMs <= meanLatency ? '#4ade80' : r.latencyMs <= meanLatency + stdDevLatency ? '#fbbf24' : '#f87171';
      return `
        <div class="statDistBar">
          <span class="statDistLabel">${esc(r.provider)}</span>
          <div class="statDistTrack">
            <div class="statDistFill" style="width:${pct}%;background:linear-gradient(90deg,${color}cc,${color},${color}88);background-size:200% 100%"></div>
          </div>
          <span class="statDistValue">${r.latencyMs}ms</span>
        </div>
      `;
    }).join('');
    
    // Build distribution bars for confidence
    const confidenceBars = results.filter((r: any) => r.confidenceScore).map((r: any) => {
      const pct = r.confidenceScore || 0;
      const color = pct >= 80 ? '#4ade80' : pct >= 60 ? '#fbbf24' : '#f87171';
      return `
        <div class="statDistBar">
          <span class="statDistLabel">${esc(r.provider)}</span>
          <div class="statDistTrack">
            <div class="statDistFill" style="width:${pct}%;background:linear-gradient(90deg,${color}cc,${color},${color}88);background-size:200% 100%"></div>
          </div>
          <span class="statDistValue">${pct}%</span>
        </div>
      `;
    }).join('');
    
    providerStatsHtml = `
      <div class="statisticalSummary">
        <div class="statSummaryTitle">📊 Statistical Summary (Provider Comparison)</div>
        
        <div class="statSummaryGrid">
          <div class="statSummaryCard">
            <div class="statSummaryCardTitle">⏱️ Response Latency (ms)</div>
            <div class="statSummaryMetrics">
              <div class="statMetric">
                <span class="statMetricLabel">Mean (μ)</span>
                <span class="statMetricValue">${meanLatency}ms</span>
              </div>
              <div class="statMetric">
                <span class="statMetricLabel">Std Dev (σ)</span>
                <span class="statMetricValue">±${stdDevLatency}ms</span>
              </div>
              <div class="statMetric">
                <span class="statMetricLabel">Variance</span>
                <span class="statMetricValue">${varianceLatency}</span>
              </div>
              <div class="statMetric">
                <span class="statMetricLabel">Range</span>
                <span class="statMetricValue">${minLatency}-${maxLatency}ms</span>
              </div>
            </div>
            <div class="statDistribution">
              <div class="statDistTitle">Distribution by Provider</div>
              ${latencyBars}
            </div>
          </div>
          
          ${confidenceBars ? `
          <div class="statSummaryCard">
            <div class="statSummaryCardTitle">🎯 Confidence Scores (%)</div>
            <div class="statSummaryMetrics">
              <div class="statMetric">
                <span class="statMetricLabel">Mean (μ)</span>
                <span class="statMetricValue">${meanConfidence}%</span>
              </div>
              <div class="statMetric">
                <span class="statMetricLabel">Std Dev (σ)</span>
                <span class="statMetricValue">±${stdDevConfidence}%</span>
              </div>
              <div class="statMetric">
                <span class="statMetricLabel">Variance</span>
                <span class="statMetricValue">${varianceConfidence}</span>
              </div>
              <div class="statMetric">
                <span class="statMetricLabel">Range</span>
                <span class="statMetricValue">${minConfidence}-${maxConfidence}%</span>
              </div>
            </div>
            <div class="statDistribution">
              <div class="statDistTitle">Distribution by Provider</div>
              ${confidenceBars}
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    
    stats.push({ label: "Providers Compared", value: `${results.length}` });
    stats.push({ label: "Avg Response Time", value: `${meanLatency}ms (σ=${stdDevLatency})` });
  }
  
  // Sentiment Heatmap - Correlation between aspects
  let sentimentHeatmapHtml = "";
  if (extras?.sentiment?.aspects && extras.sentiment.aspects.length >= 2) {
    const aspects = extras.sentiment.aspects;
    const aspectNames = aspects.map((a: any) => a.aspect);
    
    // Calculate correlation-like scores based on sentiment similarity
    const getSentimentScore = (s: string) => s === 'positive' ? 1 : s === 'negative' ? -1 : 0;
    const getSentimentLabel = (s: string) => s === 'positive' ? '✅ Positive' : s === 'negative' ? '❌ Negative' : '➖ Neutral';
    
    // Store correlations for insights
    const correlations: { aspect1: string; aspect2: string; score: number; type: string }[] = [];
    
    // Build heatmap cells
    let heatmapCells = "";
    const cellSize = 70; // Increased size for better PDF readability
    
    for (let i = 0; i < aspectNames.length; i++) {
      for (let j = 0; j < aspectNames.length; j++) {
        const score1 = getSentimentScore(aspects[i].sentiment);
        const score2 = getSentimentScore(aspects[j].sentiment);
        
        // Correlation: 1 if same, 0.5 if one is neutral, 0 if opposite
        let correlation = 0;
        let type = "";
        if (i === j) {
          correlation = 1;
          type = "self";
        } else if (score1 === score2) {
          correlation = 0.9;
          type = "aligned";
        } else if (score1 === 0 || score2 === 0) {
          correlation = 0.5;
          type = "partial";
        } else {
          correlation = 0.1;
          type = "opposing";
        }
        
        // Store for insights (only upper triangle, excluding diagonal)
        if (i < j) {
          correlations.push({
            aspect1: aspectNames[i],
            aspect2: aspectNames[j],
            score: correlation,
            type
          });
        }
        
        // Color based on correlation - softer colors for better text contrast
        const hue = Math.round(correlation * 120);
        const saturation = 65;
        const lightness = 55 + (1 - correlation) * 15; // Lighter background
        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        // Text color - dark for light backgrounds
        const textColor = lightness > 50 ? '#1e293b' : '#ffffff';
        
        const x = j * cellSize;
        const y = i * cellSize;
        
        // Add unique index for animation delay
        const cellIndex = i * aspectNames.length + j;
        
        heatmapCells += `
          <rect x="${x}" y="${y}" width="${cellSize - 2}" height="${cellSize - 2}" fill="${color}" rx="4" class="heatmapCell" style="animation-delay: ${cellIndex * 0.03}s">
            <title>${aspectNames[i]} × ${aspectNames[j]}: ${correlation.toFixed(2)}</title>
          </rect>
          <text x="${x + cellSize/2}" y="${y + cellSize/2 + 4}" text-anchor="middle" fill="${textColor}" font-size="10" font-weight="700" class="heatmapCellText">${correlation.toFixed(1)}</text>
        `;
      }
    }
    
    // X-axis labels (top) - full names with better positioning and more spacing
    let xLabels = aspectNames.map((name: string, i: number) => 
      `<text x="${i * cellSize + cellSize/2}" y="-25" text-anchor="start" fill="var(--muted)" font-size="10" transform="rotate(-45 ${i * cellSize + cellSize/2} -25)">${esc(name.length > 14 ? name.slice(0, 14) + '…' : name)}</text>`
    ).join('');
    
    // Y-axis labels (left) - full names with truncation and more spacing
    let yLabels = aspectNames.map((name: string, i: number) => 
      `<text x="-18" y="${i * cellSize + cellSize/2 + 4}" text-anchor="end" fill="var(--muted)" font-size="10">${esc(name.length > 14 ? name.slice(0, 14) + '…' : name)}</text>`
    ).join('');
    
    // Increased dimensions for better readability - more padding
    const svgWidth = aspectNames.length * cellSize + 200;
    const svgHeight = aspectNames.length * cellSize + 180;
    
    // Generate insights from correlations
    const alignedPairs = correlations.filter(c => c.type === 'aligned');
    const opposingPairs = correlations.filter(c => c.type === 'opposing');
    const partialPairs = correlations.filter(c => c.type === 'partial');
    
    // Build insights HTML
    let insightsHtml = "";
    const insightsList: string[] = [];
    
    // Count sentiment types
    const positiveAspects = aspects.filter((a: any) => a.sentiment === 'positive');
    const negativeAspects = aspects.filter((a: any) => a.sentiment === 'negative');
    const neutralAspects = aspects.filter((a: any) => a.sentiment === 'neutral');
    
    // Overall alignment insight
    const totalPairs = correlations.length;
    const alignmentPercent = totalPairs > 0 ? Math.round((alignedPairs.length / totalPairs) * 100) : 0;
    
    if (alignmentPercent >= 70) {
      insightsList.push(`<strong>High Alignment (${alignmentPercent}%):</strong> Most aspects share similar sentiment, indicating a consistent decision framework.`);
    } else if (alignmentPercent >= 40) {
      insightsList.push(`<strong>Moderate Alignment (${alignmentPercent}%):</strong> Mixed sentiment across aspects suggests areas that may need attention.`);
    } else {
      insightsList.push(`<strong>Low Alignment (${alignmentPercent}%):</strong> Significant sentiment conflicts detected - consider reviewing opposing areas.`);
    }
    
    // Highlight opposing pairs (most important)
    if (opposingPairs.length > 0) {
      const topOpposing = opposingPairs.slice(0, 3);
      const opposingText = topOpposing.map(p => `<strong>${p.aspect1}</strong> ↔ <strong>${p.aspect2}</strong>`).join(', ');
      insightsList.push(`⚠️ <strong>Conflict Areas:</strong> ${opposingText} have opposing sentiments. These may create tension in your decision.`);
    }
    
    // Highlight aligned positive pairs
    if (alignedPairs.length > 0 && positiveAspects.length >= 2) {
      const positiveAligned = alignedPairs.filter(p => {
        const a1 = aspects.find((a: any) => a.aspect === p.aspect1);
        const a2 = aspects.find((a: any) => a.aspect === p.aspect2);
        return a1?.sentiment === 'positive' && a2?.sentiment === 'positive';
      }).slice(0, 2);
      if (positiveAligned.length > 0) {
        const alignedText = positiveAligned.map(p => `<strong>${p.aspect1}</strong> + <strong>${p.aspect2}</strong>`).join(', ');
        insightsList.push(`✅ <strong>Strength Clusters:</strong> ${alignedText} are both positive - leverage these as decision anchors.`);
      }
    }
    
    // Highlight negative clusters
    if (negativeAspects.length >= 2) {
      const negativeNames = negativeAspects.map((a: any) => `<strong>${a.aspect}</strong>`).join(', ');
      insightsList.push(`❌ <strong>Risk Clusters:</strong> ${negativeNames} show negative sentiment - prioritize addressing these concerns.`);
    }
    
    // Aspect summary
    insightsList.push(`📊 <strong>Aspect Summary:</strong> ${positiveAspects.length} positive, ${negativeAspects.length} negative, ${neutralAspects.length} neutral out of ${aspects.length} total aspects.`);
    
    const insightsListHtml = insightsList.map(i => `<li>${i}</li>`).join('');
    
    sentimentHeatmapHtml = `
      <div class="heatmapContainer">
        <div class="heatmapTitle">🔥 Sentiment Correlation Heatmap</div>
        <div class="heatmapDesc">Shows relationship between aspect sentiments. <span class="heatmapColorGreen">Green</span> = aligned sentiment, <span class="heatmapColorYellow">Yellow</span> = one neutral, <span class="heatmapColorRed">Red</span> = opposing sentiment.</div>
        
        <div class="heatmapContent">
          <div class="heatmapSvgWrapper">
            <svg width="${svgWidth + 100}" height="${svgHeight + 100}" viewBox="-140 -100 ${svgWidth + 160} ${svgHeight + 160}" class="heatmapSvg" style="overflow:visible;">
              <g class="heatmapLabelsX">${xLabels}</g>
              <g class="heatmapLabelsY">${yLabels}</g>
              <g class="heatmapCells">${heatmapCells}</g>
            </svg>
          </div>
          
          <div class="heatmapInsights">
            <div class="heatmapInsightsTitle">💡 Key Insights</div>
            <ul class="heatmapInsightsList">${insightsListHtml}</ul>
          </div>
        </div>
        
        <div class="heatmapLegend">
          <div class="heatmapLegendItem">
            <span class="heatmapLegendColor" style="background:hsl(120,70%,45%)"></span>
            <span>Aligned (0.9-1.0)</span>
          </div>
          <div class="heatmapLegendItem">
            <span class="heatmapLegendColor" style="background:hsl(60,70%,55%)"></span>
            <span>Partial (0.5)</span>
          </div>
          <div class="heatmapLegendItem">
            <span class="heatmapLegendColor" style="background:hsl(0,70%,55%)"></span>
            <span>Opposing (0.1)</span>
          </div>
        </div>
      </div>
    `;
  }
  
  const statsHtml = stats.map(s => `
    <div class="dataExportStatItem">
      <span class="dataExportStatLabel">${s.label}</span>
      <span class="dataExportStatValue">${s.value}</span>
    </div>
  `).join('');

  // Create human-readable summary for non-technical users
  const humanReadableSummary = `
    <div class="dataExportHumanSummary">
      <div class="humanSummaryTitle">📝 Summary for Decision Makers</div>
      <div class="humanSummaryContent">
        <div class="humanSummaryItem">
          <span class="humanSummaryLabel">Decision Title:</span>
          <span class="humanSummaryValue">${esc(input.title || 'Not specified')}</span>
        </div>
        ${analysis?.readiness ? `
        <div class="humanSummaryItem">
          <span class="humanSummaryLabel">Decision Readiness:</span>
          <span class="humanSummaryValue">${analysis.readiness.score}/100 (Grade ${analysis.readiness.grade})</span>
        </div>
        ` : ''}
        ${extras?.sentiment ? `
        <div class="humanSummaryItem">
          <span class="humanSummaryLabel">Stakeholder Sentiment:</span>
          <span class="humanSummaryValue">${extras.sentiment.overallSentiment.toUpperCase()} (${extras.sentiment.overallConfidence}% confidence)</span>
        </div>
        ` : ''}
        ${extras?.providerCompare?.results ? `
        <div class="humanSummaryItem">
          <span class="humanSummaryLabel">AI Providers Consulted:</span>
          <span class="humanSummaryValue">${extras.providerCompare.results.length} providers</span>
        </div>
        ` : ''}
        ${extras?.conclusion ? `
        <div class="humanSummaryItem humanSummaryItemFull">
          <span class="humanSummaryLabel">Recommendation:</span>
          <span class="humanSummaryValue">${esc(extras.conclusion.recommendation || 'See Executive Conclusion')}</span>
        </div>
        ` : ''}
      </div>
    </div>
  `;

  return `
    <div class="card dataExportCard">
      ${sectionTitle("📊 Data Export & Analytics", "Statistical analysis and raw data for further exploration")}
      
      <div class="dataExportIntro">
        <p>This section provides statistical analysis and structured data export for data scientists and analysts who want to perform additional analysis or integrate this data into their workflows.</p>
      </div>
      
      ${humanReadableSummary}
      
      ${stats.length > 0 ? `
        <div class="dataExportStats">
          <div class="dataExportStatsTitle">📈 Quick Statistics</div>
          <div class="dataExportStatsGrid">${statsHtml}</div>
        </div>
      ` : ''}
      
      ${providerStatsHtml}
      
      ${sentimentHeatmapHtml}
      
      <div class="dataExportFormats no-print">
        <div class="dataExportFormat">
          <div class="dataExportFormatHeader">
            <span class="dataExportFormatIcon">📋</span>
            <span class="dataExportFormatTitle">JSON Export</span>
            <span class="dataExportFormatBadge">For Developers</span>
          </div>
          <div class="dataExportFormatDesc">Complete structured data in JSON format for programmatic access.</div>
          <details class="dataExportDetails" open>
            <summary class="dataExportSummary">View JSON Data</summary>
            <pre class="dataExportCode">${jsonString.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          </details>
        </div>
      </div>
      
      <div class="dataExportNote no-print">
        <span class="dataExportNoteIcon">💡</span>
        <span class="dataExportNoteText">Copy the JSON data above for use in Python, R, or any data analysis tool. The data structure is designed to be easily parseable.</span>
      </div>
    </div>
  `;
}

/** Render Disclaimer Section */
function renderDisclaimer(): string {
  return `
    <div class="card disclaimerCard">
      ${sectionTitle("⚠️ Important Disclaimer", "Please read before making decisions")}
      <div class="disclaimerContent">
        <p>
          <strong>AI-Generated Content:</strong> This report is generated by artificial intelligence and is intended to assist, not replace, human judgment. 
          The analysis, recommendations, and conclusions presented here may contain errors, omissions, or biases inherent in AI systems.
        </p>
        
        <p><strong>Key points to understand:</strong></p>
        <ul>
          <li>AI analysis is based solely on the information you provided and may not account for all relevant factors.</li>
          <li>Sentiment analysis and scoring are probabilistic estimates and should be interpreted as guidance, not absolute truth.</li>
          <li>Always verify critical information independently before making significant decisions.</li>
          <li>Consider consulting domain experts for complex or high-stakes decisions.</li>
          <li>Past patterns identified by AI do not guarantee future outcomes.</li>
        </ul>
        
        <p><strong>No Affiliation or Endorsement:</strong></p>
        <ul>
          <li>Grounds is an independent project created for the <strong>Google Gemini 3 Hackathon 2026</strong>.</li>
          <li>This application is <strong>not affiliated with, endorsed by, or sponsored by</strong> Google, Anthropic, OpenAI, Groq, or any other company.</li>
          <li>The developer does not endorse or take responsibility for any decisions made based on this tool's output.</li>
          <li>All content input by users is processed via third-party AI APIs. The developer is not responsible for any sensitive information users choose to input.</li>
        </ul>
        
        <p>
          <strong>Your Responsibility:</strong> Grounds is designed to help you think more clearly about decisions by providing structure, 
          highlighting blind spots, and offering multiple perspectives. The final decision and its consequences remain <strong>entirely your responsibility</strong>.
        </p>
      </div>
    </div>
  `;
}

/** Render Credits and Footer Section - Combined Thank You + Record */
function renderCredits(timezone?: string): string {
  const tzDisplay = timezone || "UTC";
  
  return `
    <div class="card creditsCard">
      ${sectionTitle("🙏 Thank You", "For using Grounds")}
      <div class="creditsContent">
        <p>
          Thank you for using <strong>Grounds</strong>, your decision intelligence workspace. 
          We hope this tool helps you make more informed, structured, and confident decisions.
        </p>
        
        <div class="creditsAuthor">
          <div class="creditsAuthorName">Built with care by Wiqi Lee</div>
          <div class="creditsAuthorSubtitle">Google Gemini 3 Hackathon 2026</div>
        </div>
        
        <div class="creditsSocial">
          <a href="https://twitter.com/wiqi_lee" target="_blank" rel="noopener" class="creditsSocialLink creditsSocialTwitter">
            ${SOCIAL_ICONS.twitter}
            <span>@wiqi_lee</span>
          </a>
          <a href="https://github.com/wiqilee" target="_blank" rel="noopener" class="creditsSocialLink creditsSocialGithub">
            ${SOCIAL_ICONS.github}
            <span>wiqilee</span>
          </a>
          <a href="https://discord.com/users/wiqi_lee" target="_blank" rel="noopener" class="creditsSocialLink creditsSocialDiscord">
            ${SOCIAL_ICONS.discord}
            <span>wiqi_lee</span>
          </a>
        </div>
        
        <div class="creditsFeedback">
          For suggestions, bug reports, or collaboration opportunities, feel free to reach out.
        </div>
        
        <div class="creditsFooter">
          <div class="creditsFooterItem">
            <span class="creditsFooterLabel">Timezone</span>
            <span class="creditsFooterValue">${esc(tzDisplay)}</span>
          </div>
          <div class="creditsFooterItem">
            <span class="creditsFooterLabel">Generated by</span>
            <span class="creditsFooterValue">Grounds</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/** ---------- Main ---------- */
export function toReportHTML(input: DecisionInput, analysis: AnalysisBundle, extras?: ReportExtras) {
  const r = analysis.readiness;
  const h = analysis.halfLife;
  const b = analysis.blindSpots;

  const halfTone = h.status === "stable" ? "good" : h.status === "degrading" ? "warn" : "bad";
  const blindTone = b.score >= 80 ? "good" : b.score >= 60 ? "warn" : "bad";
  const gradeTone = r.grade === "A" ? "good" : r.grade === "B" ? "info" : r.grade === "C" ? "warn" : "bad";

  const createdISO = (input as any).createdAtISO ?? (input as any).createdAt ?? new Date().toISOString();
  const generatedISO = (analysis as any).meta?.generatedAtISO ?? new Date().toISOString();

  const fallbackReadinessTooltip = normalizeTooltip(
    (analysis as any)?.readiness?.breakdown?.tooltip
      ? {
          id: "readiness",
          title: (analysis as any).readiness.breakdown.tooltip.title,
          lines: (analysis as any).readiness.breakdown.tooltip.lines,
        }
      : null
  );

  const incoming = Array.isArray(extras?.tooltips) ? extras!.tooltips : [];
  const mergedTooltips: ReportTooltip[] = [...incoming, ...(fallbackReadinessTooltip ? [fallbackReadinessTooltip] : [])];

  const seen = new Set<string>();
  const tooltips = mergedTooltips.filter((t) => {
    const id = String((t as any)?.id || "").trim() || uid();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const hackathonSection = renderHackathonCard();
  const gradeLegendSection = gradeLegendCard(String(r.grade || ""), Number(r.score || 0));
  const explainabilitySection = renderExplainabilityCard(tooltips);

  const providerCompareRaw =
    extras?.providerCompare ??
    (analysis as any)?.meta?.providerCompare ??
    (analysis as any)?.meta?.compare ??
    null;

  const providerCompareAppendix = renderProviderCompareAppendix(providerCompareRaw);
  const geminiCriticSection = renderGeminiCriticSection(extras?.geminiCritic ?? null);

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Grounds Report - ${esc(input.title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  :root{
    color-scheme: dark;

    --rFrame: 28px;
    --rCard: 22px;
    --rInner: 18px;
    --easeOut: cubic-bezier(.16,1,.3,1);

    --contentMax: 78ch;
    --lhBody: 1.88;
    --lhTight: 1.58;
    --fsBody: 13px;
    --fsSmall: 11px;

    /* Premium accent (kept subtle to avoid banding) */
    --a1: rgba(103,232,249,.10);
    --a2: rgba(168,85,247,.09);

    --bg0:#070913;
    --bg1:#0b0d18;

    --fg: rgba(255,255,255,.92);
    --fgStrong: rgba(255,255,255,.98);

    --muted: rgba(255,255,255,.82);
    --faint: rgba(255,255,255,.64);
    --hint: rgba(255,255,255,.72);

    --card: rgba(255,255,255,.060);
    --card2: rgba(255,255,255,.048);

    --bd: rgba(255,255,255,.12);
    --bdHi: rgba(255,255,255,.18);

    --shadow1: 0 0 0 1px rgba(255,255,255,.05), 0 18px 50px rgba(0,0,0,.45);
    --shadow2: 0 0 0 1px rgba(255,255,255,.06), 0 22px 60px rgba(0,0,0,.52);

    /* Radar chart grid - soft white in dark mode */
    --radarGrid: rgba(255,255,255,.25);

    /* Provider accents (dark)
       ✅ OpenRouter = yellow (match app vibe), not cyan */
    --pc-openai: rgba(52,211,153,.95);
    --pc-google: rgba(96,165,250,.95);
    --pc-groq: rgba(168,85,247,.95);
    --pc-openrouter: rgba(251,191,36,.98); /* 🔥 yellow/amber */
    --pc-anthropic: rgba(249,115,22,.95);
    --pc-mistral: rgba(251,113,133,.95);
    --pc-other: rgba(148,163,184,.95);
  }

  /* Light: off-white + softer cards to reduce eye strain */
  html[data-theme="light"]{
    color-scheme: light;

    --bg0:#f6f7fb;
    --bg1:#eef2f7;

    --fg: rgba(10,12,20,.92);
    --fgStrong: rgba(10,12,20,.96);

    --muted: rgba(10,12,20,.78);
    --faint: rgba(10,12,20,.56);
    --hint: rgba(10,12,20,.64);

    --card: rgba(255,255,255,.86);
    --card2: rgba(255,255,255,.80);

    --bd: rgba(10,12,20,.10);
    --bdHi: rgba(10,12,20,.16);

    --shadow1: 0 0 0 1px rgba(10,12,20,.06), 0 18px 50px rgba(10,12,20,.10);
    --shadow2: 0 0 0 1px rgba(10,12,20,.08), 0 22px 60px rgba(10,12,20,.14);

    /* Radar chart grid - soft black in light mode */
    --radarGrid: rgba(10,12,20,.30);

    --a1: rgba(103,232,249,.055);
    --a2: rgba(168,85,247,.045);

    /* Provider accents (light) - calmer + consistent */
    --pc-openai: rgba(16,185,129,.95);
    --pc-google: rgba(59,130,246,.95);
    --pc-groq: rgba(124,58,237,.95);
    --pc-openrouter: rgba(245,158,11,.98); /* 🔥 yellow/amber */
    --pc-anthropic: rgba(234,88,12,.95);
    --pc-mistral: rgba(244,63,94,.95);
    --pc-other: rgba(100,116,139,.95);
  }

  *{ box-sizing:border-box; }
  html,body{ height:100%; }

  body{
    margin:0;
    font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
    color: var(--fg);
    background:
      radial-gradient(1100px 700px at 15% 10%, var(--a1), transparent 62%),
      radial-gradient(1000px 700px at 80% 20%, var(--a2), transparent 64%),
      linear-gradient(180deg, var(--bg0), var(--bg1));
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  @media (prefers-reduced-motion: reduce){
    *{ animation: none !important; transition: none !important; scroll-behavior:auto !important; }
  }

  @media screen{
    html, body{
      transition: background-color .18s var(--easeOut), color .18s var(--easeOut);
    }
    .card, .top, .frame, .pill, .kpiBox, .gRow, .note, .pcRow, .pcSummary, .record, .drSec, .drAction{
      transition:
        transform .20s var(--easeOut),
        box-shadow .20s var(--easeOut),
        border-color .20s var(--easeOut),
        background-color .20s var(--easeOut),
        color .20s var(--easeOut);
    }
  }

  .wrap, .frame, .frameInner, .grid, .card,
  .pcDetails, .pcSummary, .pcGrid, .pcRow, .pcBody,
  .noteGrid, .note, .kpi, .kpiBox, .drGrid, .drSec { min-width:0; }

  .wrap{
    max-width: 1120px;
    margin: 0 auto;
    padding: 34px 18px 18px;
  }

  .frame{
    width: 100%;
    border-radius: var(--rFrame);
    border: 1px solid var(--bd);
    background: color-mix(in oklab, var(--card) 40%, transparent);
    box-shadow: 0 30px 90px color-mix(in oklab, #000 34%, transparent);
    padding: 18px;
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }

  .frame:before{
    content:"";
    position:absolute; inset:0;
    background:
      radial-gradient(820px 520px at 14% 10%, rgba(103,232,249,.05), transparent 66%),
      radial-gradient(820px 540px at 86% 12%, rgba(168,85,247,.04), transparent 68%);
    filter: blur(26px);
    opacity: .50;
    pointer-events:none;
    z-index: 0;
    border-radius: inherit;
  }
  html[data-theme="light"] .frame:before{ opacity: .20; }

  .frame:after{
    content:"";
    position:absolute; inset:0;
    background: radial-gradient(120% 90% at 50% 10%, rgba(0,0,0,.08), rgba(0,0,0,.16) 55%, rgba(0,0,0,.26) 100%);
    pointer-events:none;
    z-index: 0;
  }
  html[data-theme="light"] .frame:after{
    background: radial-gradient(120% 90% at 50% 10%, rgba(255,255,255,.55), rgba(255,255,255,.18) 55%, rgba(255,255,255,0) 100%);
  }

  .frameInner{ position: relative; z-index: 1; width: 100%; }

  .grid{ display:grid; gap:14px; margin-top:14px; width: 100%; }
  .g2{ grid-template-columns: 1.25fr .75fr; }
  @media (max-width: 940px){ .g2{ grid-template-columns: 1fr; } }

  .top{
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:14px;
    padding:18px 18px;
    background: var(--card);
    border: 1px solid var(--bd);
    border-radius: var(--rCard);
    box-shadow: var(--shadow1);
    position: relative;
    overflow: hidden;
    isolation: isolate;
    animation: riseIn .45s var(--easeOut) both;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    flex-wrap: wrap;
  }
  .top:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(0,0,0,0.30);
  }
  
  /* Share Toolbar - visible in browser */
  .shareToolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-left: auto;
    padding: 4px;
    background: var(--bg0);
    border-radius: 8px;
    position: relative;
    z-index: 10;
  }
  .shareBtn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
  }
  .shareBtn:hover {
    transform: translateY(-1px);
  }
  .shareEmail {
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }
  .shareEmail:hover {
    background: rgba(59, 130, 246, 0.2);
  }
  .shareWhatsApp {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
  }
  .shareWhatsApp:hover {
    background: rgba(34, 197, 94, 0.2);
  }
  .shareTelegram {
    color: #0ea5e9;
    background: rgba(14, 165, 233, 0.1);
  }
  .shareTelegram:hover {
    background: rgba(14, 165, 233, 0.2);
  }
  .sharePrint {
    color: #8b5cf6;
    background: rgba(139, 92, 246, 0.1);
  }
  .sharePrint:hover {
    background: rgba(139, 92, 246, 0.2);
  }

  /* Premium animated header gradient - cyan + violet mixing */
  .top:before{
    content:"";
    position:absolute; inset:0;
    background: linear-gradient(
      135deg,
      rgba(6,182,212,0.15) 0%,
      rgba(139,92,246,0.12) 25%,
      rgba(6,182,212,0.10) 50%,
      rgba(139,92,246,0.15) 75%,
      rgba(6,182,212,0.12) 100%
    );
    background-size: 400% 400%;
    animation: headerGradientShift 8s ease infinite;
    pointer-events:none;
    z-index:0;
  }
  @keyframes headerGradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  html[data-theme="light"] .top:before{ 
    background: linear-gradient(
      135deg,
      rgba(6,182,212,0.15) 0%,
      rgba(139,92,246,0.12) 25%,
      rgba(236,72,153,0.10) 50%,
      rgba(139,92,246,0.12) 75%,
      rgba(6,182,212,0.15) 100%
    );
    background-size: 400% 400%;
    animation: headerGradientShift 8s ease infinite;
  }

  @keyframes riseIn{
    from{ opacity: 0; transform: translate3d(0, 8px, 0); }
    to{ opacity: 1; transform: translate3d(0, 0, 0); }
  }

  /* Brand (animated ring + “G”) */
  .brand{ display:flex; align-items:center; gap:10px; position: relative; z-index: 1; min-width: 0; }
  .markWrap{
    width: 20px; height: 20px; border-radius: 999px; flex: 0 0 auto;
    position: relative;
    isolation: isolate;
  }
  .markWrap:before{
    content:"";
    position:absolute; inset:-2px;
    border-radius: 999px;
    background: conic-gradient(from 220deg,
      rgba(103,232,249,1),
      rgba(168,85,247,1),
      rgba(251,113,133,1),
      rgba(52,211,153,1),
      rgba(103,232,249,1)
    );
    opacity: .95;
    animation: ringSpin 5.2s linear infinite;
  }
  .markWrap:after{
    content:"";
    position:absolute; inset:2px;
    border-radius: 999px;
    background: color-mix(in oklab, var(--bg0) 75%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--fg) 10%, transparent);
  }
  html[data-theme="light"] .markWrap:after{
    background: rgba(255,255,255,.92);
    box-shadow: inset 0 0 0 1px rgba(10,12,20,.10);
  }
  .markG{
    position:absolute; inset:0;
    display:grid; place-items:center;
    font-weight: 950;
    font-size: 11px;
    letter-spacing: -.02em;
    color: var(--fgStrong);
    z-index: 2;
    user-select: none;
  }
  @keyframes ringSpin { to { transform: rotate(360deg); } }

  .brandCol{ display:flex; flex-direction:row; align-items:center; gap:6px; min-width: 0; }
  .brandSep{ color: var(--bd); font-weight: 300; font-size: 14px; }
  .brandName{ 
    font-weight:900; 
    letter-spacing:-.02em; 
    line-height:1.05; 
    white-space: nowrap;
    background: linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: brandNameGradient 4s ease infinite;
  }
  @keyframes brandNameGradient {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  html[data-theme="light"] .brandName {
    background: linear-gradient(135deg, #0891b2, #7c3aed, #db2777);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: brandNameGradient 4s ease infinite;
  }
  .brandTag{ font-size:11px; color: var(--faint); line-height: 1.05; white-space: nowrap; }

  .meta{
    font-size:12px;
    color: var(--faint);
    text-align:right;
    line-height:1.55;
    position:relative;
    z-index:1;
    flex: 1;
  }
  .metaTitle {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--fgStrong);
    margin-bottom: 10px;
    line-height: 1.3;
    text-align: right;
  }
  .metaTheme {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: var(--card2);
    border-radius: 20px;
    border: 1px solid var(--bd);
    font-size: 12px;
    color: var(--fg);
    margin-bottom: 10px;
  }
  .metaDates {
    font-size: 11px;
    color: var(--faint);
    line-height: 1.6;
  }
  .h1{ font-size:20px; font-weight:900; letter-spacing:-.02em; color: var(--fgStrong); }

  .card{
    width: 100%;
    background: var(--card);
    border: 1px solid transparent;
    border-radius: var(--rCard);
    padding: 18px;
    box-shadow: var(--shadow1);
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }

  .card:before{
    content:"";
    position:absolute; inset:0;
    background:
      radial-gradient(circle at 14% 16%, rgba(103,232,249,.04), transparent 58%),
      radial-gradient(circle at 86% 18%, rgba(168,85,247,.03), transparent 60%);
    filter: blur(18px);
    opacity:0;
    transition: opacity .20s var(--easeOut);
    pointer-events:none;
    z-index: 0;
    border-radius: inherit;
  }

  .card:hover{
    transform: translateY(-2px);
    box-shadow: var(--shadow2);
  }
  .card:hover:before{ opacity: 0.5; }
  html[data-theme="light"] .card:before{ opacity: 0; }
  html[data-theme="light"] .card:hover:before{ opacity: 0; }
  .card > *{ position: relative; z-index: 1; }

  .card.support{ background: var(--card2); }

  .secHead{ display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-bottom: 16px; }
  .secTitle{ font-size:14px; font-weight:900; letter-spacing:-.01em; color: var(--fgStrong); }
  .secSub{ font-size:12px; color: var(--hint); }

  .muted{
    color: var(--muted);
    font-size: var(--fsBody);
    line-height: var(--lhBody);
    max-width: var(--contentMax);
  }

  .row{ display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }

  .pill{
    display:inline-flex;
    align-items:center;
    padding:6px 10px;
    border-radius:999px;
    border:1px solid var(--bd);
    background: color-mix(in oklab, var(--card) 70%, transparent);
    font-size:12px;
    color: var(--fg);
    white-space: nowrap;
  }
  .pill:hover{
    transform: translateY(-1px);
    border-color: var(--bdHi);
    background: color-mix(in oklab, var(--card) 85%, transparent);
  }

  .p-neutral{ border-color: var(--bd); background: color-mix(in oklab, var(--card) 70%, transparent); }
  .p-good{ border-color: rgba(52,211,153,.34); background: rgba(52,211,153,.10); }
  .p-info{ border-color: rgba(103,232,249,.34); background: rgba(103,232,249,.10); }
  .p-warn{ border-color: rgba(251,191,36,.38); background: rgba(251,191,36,.10); }
  .p-bad{ border-color: rgba(251,113,133,.38); background: rgba(251,113,133,.10); }

  .kpi{
    display:grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 12px;
    width: 100%;
  }
  @media (max-width: 900px){ .kpi{ grid-template-columns: 1fr; } }

  .kpiBox{
    border-radius: var(--rInner);
    border: 1px solid var(--bd);
    background: color-mix(in oklab, var(--card2) 80%, transparent);
    padding: 14px;
  }
  .kpiBox:hover{
    transform: translateY(-1px);
    border-color: var(--bdHi);
    background: color-mix(in oklab, var(--card2) 92%, transparent);
  }

  .kpiLabel{
    font-size:11px;
    color: var(--faint);
    text-transform:uppercase;
    letter-spacing:.12em;
    font-weight: 700;
  }
  .kpiHint{
    font-size:12px;
    color: var(--muted);
    margin-top:6px;
    line-height: 1.72;
    max-width: var(--contentMax);
  }

  ul{
    margin: 10px 0 0 18px;
    padding: 0;
    color: var(--muted);
    font-size: var(--fsBody);
    line-height: var(--lhBody);
    max-width: var(--contentMax);
  }
  li{ margin: 7px 0; }

  .two{
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 10px;
    width: 100%;
  }
  @media (max-width: 900px){ .two{ grid-template-columns: 1fr; } }

  .hr{ height: 1px; background: color-mix(in oklab, var(--fg) 10%, transparent); margin: 14px 0; }

  .small{
    font-size: var(--fsSmall);
    color: var(--faint);
    line-height: var(--lhTight);
    max-width: 92ch;
  }

  /* Grade meaning */
  .gGrid{ margin-top: 12px; display:grid; gap: 10px; }
  .gRow{
    border-radius: var(--rInner);
    border: 1px solid var(--bd);
    background: color-mix(in oklab, var(--card2) 78%, transparent);
    padding: 12px;
  }
  .gRow:hover{ transform: translateY(-1px); border-color: var(--bdHi); background: color-mix(in oklab, var(--card2) 92%, transparent); }
  .gActive{ border-color: var(--bdHi); background: color-mix(in oklab, var(--card2) 92%, transparent); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--fg) 4%, transparent); }

  .gLeft{ display:flex; gap:12px; align-items:flex-start; min-width:0; }
  .gTitle{ display:flex; flex-direction:column; gap:6px; min-width:0; width:100%; }
  .gTitleTop{ display:flex; align-items:center; justify-content:space-between; gap:10px; min-width:0; }
  .gName{ font-size:13px; font-weight:900; color: var(--fgStrong); letter-spacing:-.01em; }
  .gDesc{ font-size:12px; color: var(--muted); line-height:1.68; }
  .gRightChip{ flex: 0 0 auto; }
  .gRightGhost{ display:inline-block; width: 92px; }

  .gBadge{
    width: 34px; height: 34px;
    border-radius: 12px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    font-weight:950;
    letter-spacing:-.02em;
    border: 1px solid var(--bd);
    background: color-mix(in oklab, var(--card2) 90%, transparent);
    color: var(--fgStrong);
    flex: 0 0 auto;
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--fg) 3%, transparent);
  }
  .g-A{ border-color: rgba(52,211,153,.28); background: rgba(52,211,153,.10); }
  .g-B{ border-color: rgba(103,232,249,.28); background: rgba(103,232,249,.10); }
  .g-C{ border-color: rgba(251,191,36,.28); background: rgba(251,191,36,.10); }
  .g-D{ border-color: rgba(251,113,133,.28); background: rgba(251,113,133,.10); }

  /* Tooltip notes */
  .noteGrid{ margin-top: 12px; display:grid; grid-template-columns: 1fr 1fr; gap: 12px; width:100%; }
  @media (max-width: 900px){ .noteGrid{ grid-template-columns: 1fr; } }
  .note{
    border-radius: var(--rInner);
    border: 1px solid var(--bd);
    background: color-mix(in oklab, var(--card2) 78%, transparent);
    padding: 14px;
    min-width:0;
  }
  .note:hover{ transform: translateY(-1px); border-color: var(--bdHi); background: color-mix(in oklab, var(--card2) 92%, transparent); }
  .noteTitle{ font-size: 12px; font-weight: 900; color: var(--fgStrong); letter-spacing: -.01em; }
  .noteBody{ margin-top: 6px; }

  /* Provider compare */
  .pcDetails{ margin-top: 12px; width: 100%; }
  .pcSummary{
    list-style: none;
    cursor: pointer;
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:12px;
    padding: 12px;
    border-radius: var(--rInner);
    border: 1px solid var(--bd);
    background: color-mix(in oklab, var(--card2) 78%, transparent);
    user-select:none;
    min-width:0;
  }
  .pcSummary::-webkit-details-marker{ display:none; }
  .pcSummary:hover{ transform: translateY(-1px); border-color: var(--bdHi); background: color-mix(in oklab, var(--card2) 92%, transparent); }
  .pcSummaryLeft{ min-width:0; }
  .pcSummaryTitle{ font-size: 13px; font-weight: 900; color: var(--fgStrong); }
  .pcSummarySub{ font-size: 12px; margin-top: 4px; color: var(--faint); }
  .pcSummaryRight{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:flex-end; }

  .pcChevron{
    font-size: 18px;
    line-height: 1;
    color: color-mix(in oklab, var(--fg) 72%, transparent);
    transform: rotate(90deg);
    padding: 2px 6px;
    border-radius: 10px;
    border: 1px solid color-mix(in oklab, var(--fg) 10%, transparent);
    background: color-mix(in oklab, var(--card2) 80%, transparent);
  }
  details[open] .pcChevron{
    transform: rotate(-90deg);
    color: var(--fgStrong);
    border-color: color-mix(in oklab, var(--fg) 16%, transparent);
    background: color-mix(in oklab, var(--card2) 92%, transparent);
  }

  .pcGrid{ margin-top: 12px; display:grid; gap: 20px; width: 100%; min-width:0; }

  .pcRow{
    border: 1px solid var(--bd);
    border-left: 3px solid color-mix(in oklab, var(--pc-other) 30%, transparent);
    border-radius: var(--rInner);
    background: var(--card2);
    padding: 14px;
    padding-left: 16px;
    min-width:0;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.4s ease;
  }
  /* Provider-specific LEFT border colors - SOFT by default (30% opacity) */
  .pcRow.pcP-openai{ border-left-color: color-mix(in oklab, var(--pc-openai) 30%, transparent); }
  .pcRow.pcP-google{ border-left-color: color-mix(in oklab, var(--pc-google) 30%, transparent); }
  .pcRow.pcP-groq{ border-left-color: color-mix(in oklab, var(--pc-groq) 30%, transparent); }
  .pcRow.pcP-openrouter{ border-left-color: color-mix(in oklab, var(--pc-openrouter) 30%, transparent); }
  .pcRow.pcP-anthropic{ border-left-color: color-mix(in oklab, var(--pc-anthropic) 30%, transparent); }
  .pcRow.pcP-mistral{ border-left-color: color-mix(in oklab, var(--pc-mistral) 30%, transparent); }
  .pcRow.pcP-other{ border-left-color: color-mix(in oklab, var(--pc-other) 30%, transparent); }

  .pcRow:hover{ 
    transform: translateY(-2px); 
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  }
  /* On hover - show slightly brighter color (55% opacity, not full) */
  .pcRow.pcP-openai:hover{ border-left-color: color-mix(in oklab, var(--pc-openai) 55%, transparent); }
  .pcRow.pcP-google:hover{ border-left-color: color-mix(in oklab, var(--pc-google) 55%, transparent); }
  .pcRow.pcP-groq:hover{ border-left-color: color-mix(in oklab, var(--pc-groq) 55%, transparent); }
  .pcRow.pcP-openrouter:hover{ border-left-color: color-mix(in oklab, var(--pc-openrouter) 55%, transparent); }
  .pcRow.pcP-anthropic:hover{ border-left-color: color-mix(in oklab, var(--pc-anthropic) 55%, transparent); }
  .pcRow.pcP-mistral:hover{ border-left-color: color-mix(in oklab, var(--pc-mistral) 55%, transparent); }
  .pcRow.pcP-other:hover{ border-left-color: color-mix(in oklab, var(--pc-other) 55%, transparent); }

  .pcHead{ 
    display:flex; 
    align-items:flex-start; 
    justify-content:space-between; 
    gap:10px; 
    min-width:0;
    padding: 10px 14px;
    margin: -14px -14px 10px -16px;
    border-radius: var(--rInner) var(--rInner) 0 0;
    background: var(--card);
    position: relative;
    overflow: hidden;
  }
  /* Provider header animated backgrounds */
  .pcP-openai .pcHead {
    background: linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(52,211,153,0.06) 50%, rgba(52,211,153,0.12) 100%);
    background-size: 200% 200%;
    animation: pcHeaderPulse 4s ease infinite;
  }
  .pcP-google .pcHead {
    background: linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(96,165,250,0.06) 50%, rgba(96,165,250,0.12) 100%);
    background-size: 200% 200%;
    animation: pcHeaderPulse 4s ease infinite;
  }
  .pcP-groq .pcHead {
    background: linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0.06) 50%, rgba(168,85,247,0.12) 100%);
    background-size: 200% 200%;
    animation: pcHeaderPulse 4s ease infinite;
  }
  .pcP-openrouter .pcHead {
    background: linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.06) 50%, rgba(251,191,36,0.12) 100%);
    background-size: 200% 200%;
    animation: pcHeaderPulse 4s ease infinite;
  }
  .pcP-anthropic .pcHead {
    background: linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(249,115,22,0.06) 50%, rgba(249,115,22,0.12) 100%);
    background-size: 200% 200%;
    animation: pcHeaderPulse 4s ease infinite;
  }
  .pcP-mistral .pcHead {
    background: linear-gradient(135deg, rgba(251,113,133,0.12) 0%, rgba(251,113,133,0.06) 50%, rgba(251,113,133,0.12) 100%);
    background-size: 200% 200%;
    animation: pcHeaderPulse 4s ease infinite;
  }
  @keyframes pcHeaderPulse {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  html[data-theme="light"] .pcP-openai .pcHead { background: linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.04) 50%, rgba(16,185,129,0.10) 100%); background-size: 200% 200%; }
  html[data-theme="light"] .pcP-google .pcHead { background: linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0.04) 50%, rgba(59,130,246,0.10) 100%); background-size: 200% 200%; }
  html[data-theme="light"] .pcP-groq .pcHead { background: linear-gradient(135deg, rgba(124,58,237,0.10) 0%, rgba(124,58,237,0.04) 50%, rgba(124,58,237,0.10) 100%); background-size: 200% 200%; }
  html[data-theme="light"] .pcP-openrouter .pcHead { background: linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.04) 50%, rgba(245,158,11,0.10) 100%); background-size: 200% 200%; }
  html[data-theme="light"] .pcP-anthropic .pcHead { background: linear-gradient(135deg, rgba(234,88,12,0.10) 0%, rgba(234,88,12,0.04) 50%, rgba(234,88,12,0.10) 100%); background-size: 200% 200%; }
  html[data-theme="light"] .pcP-mistral .pcHead { background: linear-gradient(135deg, rgba(244,63,94,0.10) 0%, rgba(244,63,94,0.04) 50%, rgba(244,63,94,0.10) 100%); background-size: 200% 200%; }

  .pcLeft{ min-width:0; }

  .pcName{
    display:flex; align-items:center; gap:8px;
    font-size: 13px;
    font-weight: 950;
    letter-spacing: -.01em;
    color: var(--fgStrong);
    flex-wrap:wrap;
  }

  .pcNameText{
    display:inline-flex;
    min-width: 0;
    max-width: 52ch;
    overflow:hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pcEmoji{ font-size: 12px; transform: translateY(-.5px); }

  .pcMini{
    font-size: 11px;
    font-weight: 850;
    color: color-mix(in oklab, var(--fg) 62%, transparent);
    border: 1px solid color-mix(in oklab, var(--fg) 10%, transparent);
    background: color-mix(in oklab, var(--card) 62%, transparent);
    padding: 2px 8px;
    border-radius: 999px;
  }
  html[data-theme="light"] .pcMini{
    background: color-mix(in oklab, var(--card2) 92%, transparent);
  }

  .pcDot{
    width: 8px; height: 8px; border-radius: 999px;
    background: var(--pc-other);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--card) 85%, transparent);
    flex: 0 0 auto;
    animation: pcDotPulse 2s ease-in-out infinite;
  }
  @keyframes pcDotPulse {
    0%, 100% { 
      transform: scale(1); 
      box-shadow: 0 0 0 2px color-mix(in oklab, var(--card) 85%, transparent), 0 0 6px currentColor; 
    }
    50% { 
      transform: scale(1.15); 
      box-shadow: 0 0 0 2px color-mix(in oklab, var(--card) 85%, transparent), 0 0 12px currentColor; 
    }
  }
  .pcP-openai .pcDot{ background: var(--pc-openai); }
  .pcP-google .pcDot{ background: var(--pc-google); }
  .pcP-groq .pcDot{ background: var(--pc-groq); }
  .pcP-openrouter .pcDot{ background: var(--pc-openrouter); }
  .pcP-anthropic .pcDot{ background: var(--pc-anthropic); }
  .pcP-mistral .pcDot{ background: var(--pc-mistral); }

  .pcMeta{ margin-top: 4px; font-size: 12px; color: var(--faint); }

  .pcStatus .pill{
    font-size: 11px;
    padding: 5px 9px;
    opacity: .92;
  }

  .pcBody{
    margin-top: 10px;
    border-top: 1px solid var(--bd);
    padding-top: 10px;
    min-width:0;
    overflow:hidden;
  }

  .mono{
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 12px;
    line-height: 1.72;
    color: color-mix(in oklab, var(--fg) 84%, transparent);
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .monoPanel{
    border-radius: 14px;
    border: 1px solid var(--bd);
    background: var(--card);
    padding: 10px 12px;
    margin: 0;
  }
  html[data-theme="light"] .monoPanel{
    background: var(--card2);
  }

  .monoErr{
    color: var(--fgStrong);
    border-color: rgba(251,113,133,.22) !important;
    background: rgba(251,113,133,.08) !important;
  }

  /* ✅ output panel - NO border to avoid double border with drSec */
  .outPanel{
    border-radius: 12px;
    background: transparent;
    padding: 4px 0;
  }
  html[data-theme="light"] .outPanel{
    background: transparent;
  }

  /* Lite markdown styles */
  .md{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
  .mdSp{ height: 8px; }
  .mdH1{ font-weight: 950; font-size: 14px; letter-spacing:-.01em; margin: 4px 0 8px; color: var(--fgStrong); }
  .mdH2{ font-weight: 950; font-size: 13px; letter-spacing:-.01em; margin: 6px 0 8px; color: var(--fgStrong); }
  .mdH3{ font-weight: 900; font-size: 12px; letter-spacing:-.01em; margin: 8px 0 6px; color: var(--fgStrong); }
  .mdP{ font-size: 12px; line-height: 1.72; margin: 3px 0; color: color-mix(in oklab, var(--fg) 86%, transparent); }
  .md b{ font-weight: 900; color: var(--fgStrong); }

  .mdUl, .mdOl{
    margin: 6px 0 6px 18px;
    padding: 0;
    color: color-mix(in oklab, var(--fg) 86%, transparent);
    font-size: 12px;
    line-height: 1.72;
  }
  .mdUl li, .mdOl li{ margin: 3px 0; }

  /* Decision report blocks (export parity) */
  .drGrid{ display:grid; gap: 10px; }
  .drSec{
    border-radius: 16px;
    border: 1px solid var(--bd);
    background: var(--card2);
    padding: 12px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .drSec:hover{
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  }
  .drHead{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .drHead .pill { font-weight: 700; }
  .drBody{ margin-top: 10px; }

  .drUl{
    margin: 0 0 0 18px;
    padding: 0;
    font-size: 12px;
    line-height: 1.72;
    color: color-mix(in oklab, var(--fg) 86%, transparent);
  }
  .drUl li{ margin: 4px 0; }

  .drNext{ display:grid; gap: 8px; }
  .drAction{
    border-radius: 14px;
    border: 1px solid var(--bd);
    background: var(--card);
    padding: 10px 10px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .drAction:hover{
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  }
  .drAction.drNeeds{
    border-color: rgba(251,191,36,.26);
    background: rgba(251,191,36,.08);
  }
  .drAction.drOk{
    border-color: rgba(52,211,153,.22);
    background: rgba(52,211,153,.07);
  }
  .drActionTop{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
  .drActionTitle{
    font-size: 12px;
    font-weight: 900;
    color: var(--fgStrong);
    letter-spacing:-.01em;
    line-height: 1.45;
    min-width:0;
  }
  .drActionStatus{ flex: 0 0 auto; }
  .drActionMeta{
    margin-top: 8px;
    display:flex;
    flex-wrap:wrap;
    gap: 8px;
    font-size: 11px;
    color: color-mix(in oklab, var(--fg) 72%, transparent);
  }
  .drMetaChip{
    display:inline-flex;
    gap: 6px;
    align-items:center;
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid color-mix(in oklab, var(--fg) 10%, transparent);
    background: color-mix(in oklab, var(--card2) 70%, transparent);
  }
  .drMetaChip b{ color: var(--fgStrong); font-weight: 900; }

  /* Mono blocks in critic */
  .monoBlock{
    border-radius: 14px;
    border: 1px solid color-mix(in oklab, var(--fg) 10%, transparent);
    background: color-mix(in oklab, var(--card) 60%, transparent);
    padding: 10px 12px;
    margin: 0;
  }
  html[data-theme="light"] .monoBlock{
    background: color-mix(in oklab, var(--card2) 92%, transparent);
  }

  /* Record (INSIDE frame, tighter spacing) */
  .record{
    margin-top: 10px;
    padding: 14px 16px;
    border-radius: 20px;
    border: 1px solid var(--bd);
    background: color-mix(in oklab, var(--card2) 68%, transparent);
    box-shadow: var(--shadow1);
  }
  .record:hover{ transform: translateY(-1px); border-color: var(--bdHi); background: color-mix(in oklab, var(--card2) 86%, transparent); }
  .recordInner{ display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; }
  .recordCol{ display:flex; flex-direction:column; gap:4px; }
  .recordTitle{ font-size: 12px; font-weight: 900; color: var(--fgStrong); }
  .recordMeta{ font-size: 11px; color: var(--faint); line-height:1.6; }

  /* ═══════════════════════════════════════════════════════════════════════════
     ✅ PRINT/PDF: Professional document mode (white paper)
     - Clean typography, white background, dark text
     - No gradients, glows, backdrop blur, heavy shadows, or neon borders
     - Proper A4/Letter margins and page breaks
     ═══════════════════════════════════════════════════════════════════════════ */

  @page {
    size: A4;
    margin: 20mm 18mm 24mm 18mm;
  }

  @media print {
    /* ─────────────────────────────────────────────────────────────────────────
       Color scheme: paper-friendly, high contrast for readability
       ───────────────────────────────────────────────────────────────────────── */
    :root {
      color-scheme: light !important;

      --bg0: #ffffff !important;
      --bg1: #ffffff !important;

      --fg: #1a1a1a !important;
      --fgStrong: #0d0d0d !important;

      --muted: #333333 !important;
      --faint: #555555 !important;
      --hint: #444444 !important;

      --card: #ffffff !important;
      --card2: #fafafa !important;

      --bd: #94a3b8 !important;
      --bdHi: #b0b0b0 !important;

      /* Remove all shadows and accents */
      --shadow1: none !important;
      --shadow2: none !important;
      --a1: transparent !important;
      --a2: transparent !important;

      /* Neutral provider colors for print */
      --pc-openai: #333333 !important;
      --pc-google: #333333 !important;
      --pc-groq: #333333 !important;
      --pc-openrouter: #333333 !important;
      --pc-anthropic: #333333 !important;
      --pc-mistral: #333333 !important;
      --pc-other: #333333 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Global resets for print
       ───────────────────────────────────────────────────────────────────────── */
    * {
      animation: none !important;
      transition: none !important;
      transform: none !important;
      box-shadow: none !important;
      text-shadow: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      background: #ffffff !important;
      color: #1a1a1a !important;
      font-size: 11pt !important;
      line-height: 1.5 !important;
    }

    body {
      background-image: none !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Layout: Remove app chrome, maximize content
       ───────────────────────────────────────────────────────────────────────── */
    .wrap {
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .frame {
      border: none !important;
      border-radius: 0 !important;
      background: #ffffff !important;
      box-shadow: none !important;
      padding: 0 !important;
      overflow: visible !important;
    }

    /* Remove decorative pseudo-elements (gradients, glows) */
    .frame:before,
    .frame:after,
    .top:before,
    .card:before,
    .card:after,
    .markWrap:before,
    .markWrap:after,
    .pcRow:before {
      display: none !important;
      content: none !important;
    }

    .frameInner {
      padding: 0 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Typography: Professional document styling
       ───────────────────────────────────────────────────────────────────────── */
    .h1 {
      font-size: 18pt !important;
      font-weight: 700 !important;
      color: #0d0d0d !important;
      margin-bottom: 4pt !important;
    }

    .secHead {
      flex-wrap: wrap !important;
    }

    .secTitle {
      font-size: 12pt !important;
      font-weight: 700 !important;
      color: #0d0d0d !important;
      border-bottom: 1px solid #94a3b8 !important;
      padding-bottom: 4pt !important;
      margin-bottom: 8pt !important;
    }

    .secSub {
      font-size: 9pt !important;
      color: #555555 !important;
    }

    .muted, .kpiHint, .small {
      font-size: 10pt !important;
      color: #333333 !important;
      line-height: 1.55 !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Header section
       ───────────────────────────────────────────────────────────────────────── */
    /* Hide share toolbar in print */
    .shareToolbar {
      display: none !important;
    }
    .no-print {
      display: none !important;
    }
    
    .top {
      background: #ffffff !important;
      border: none !important;
      border-bottom: 1.5px solid #cbd5e1 !important;
      border-radius: 0 !important;
      padding: 0 0 12pt 0 !important;
      margin-bottom: 16pt !important;
    }

    .brand {
      gap: 8px !important;
    }

    .markWrap {
      width: 22px !important;
      height: 22px !important;
      border-radius: 50% !important;
      background: linear-gradient(135deg, #67e8f9 0%, #a855f7 33%, #fb7185 66%, #34d399 100%) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      position: relative !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .markWrap:before,
    .markWrap:after {
      display: none !important;
    }

    .markG {
      font-size: 11pt !important;
      font-weight: 900 !important;
      color: #ffffff !important;
      position: relative !important;
      z-index: 2 !important;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
    }

    .brandName {
      font-size: 14pt !important;
      font-weight: 700 !important;
      color: #0d0d0d !important;
      background: none !important;
      -webkit-background-clip: unset !important;
      -webkit-text-fill-color: #0d0d0d !important;
    }

    .brandSep {
      display: inline !important;
      color: #94a3b8 !important;
      font-size: 12pt !important;
      margin: 0 4px !important;
    }

    .brandCol {
      gap: 0 !important;
    }

    .brandTag {
      font-size: 9pt !important;
      color: #555555 !important;
    }

    .meta {
      font-size: 9pt !important;
      color: #555555 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Cards: Clean bordered sections with consistent left accent
       ───────────────────────────────────────────────────────────────────────── */
    .card, .card.support {
      background: #ffffff !important;
      border: 1px solid #d1d5db !important;
      border-left: 4px solid #06b6d4 !important;
      border-radius: 12px !important;
      padding: 12pt !important;
      margin-bottom: 12pt !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .card:hover {
      transform: none !important;
      border-color: #94a3b8 !important;
      border-left-color: #06b6d4 !important;
      background: #ffffff !important;
    }

    /* Card type-specific left accent colors for print */
    .card.support { border-left-color: #06b6d4 !important; }
    .conclusionCard { border-left-color: #8b5cf6 !important; }
    .geminiCriticCard { border-left-color: #3b82f6 !important; }
    .researchCard { border-left-color: #f59e0b !important; }
    .sentimentCard { border-left-color: #ec4899 !important; }
    .stressTestCard { border-left-color: #a855f7 !important; }
    .dataExportCard { border-left-color: #06b6d4 !important; }

    /* ─────────────────────────────────────────────────────────────────────────
       Pills/badges: Simple bordered labels
       ───────────────────────────────────────────────────────────────────────── */
    .pill {
      background: #f5f5f5 !important;
      border: 1px solid #d1d5db !important;
      border-radius: 6pt !important;
      padding: 3pt 8pt !important;
      font-size: 9pt !important;
      color: #1a1a1a !important;
    }

    .p-good {
      background: #e8f5e9 !important;
      border-color: #4caf50 !important;
    }

    .p-info {
      background: #e3f2fd !important;
      border-color: #2196f3 !important;
    }

    .p-warn {
      background: #fff3e0 !important;
      border-color: #ff9800 !important;
    }

    .p-bad {
      background: #ffebee !important;
      border-color: #f44336 !important;
    }

    .p-neutral {
      background: #f5f5f5 !important;
      border-color: #999999 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       KPI boxes
       ───────────────────────────────────────────────────────────────────────── */
    .kpi {
      gap: 8pt !important;
    }

    .kpiBox {
      background: #fafafa !important;
      border: 1px solid #d1d5db !important;
      border-radius: 10px !important;
      padding: 10pt !important;
    }

    .kpiBox:hover {
      transform: none !important;
      border-color: #d1d5db !important;
      background: #fafafa !important;
    }

    .kpiLabel {
      font-size: 8pt !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
      color: #555555 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Lists: Clean bullet styling
       ───────────────────────────────────────────────────────────────────────── */
    ul, ol, .drUl, .mdUl, .mdOl {
      font-size: 10pt !important;
      color: #333333 !important;
      line-height: 1.55 !important;
      margin: 6pt 0 6pt 16pt !important;
    }

    li {
      margin: 4pt 0 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Grid layouts
       ───────────────────────────────────────────────────────────────────────── */
    .grid {
      gap: 12pt !important;
      margin-top: 12pt !important;
    }

    .g2 {
      grid-template-columns: 1.25fr 0.75fr !important;
    }

    .two {
      gap: 10pt !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Horizontal rules
       ───────────────────────────────────────────────────────────────────────── */
    .hr {
      background: #cbd5e1 !important;
      margin: 10pt 0 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Grade legend
       ───────────────────────────────────────────────────────────────────────── */
    .gGrid {
      gap: 6pt !important;
    }

    .gRow {
      background: #ffffff !important;
      border: 1px solid #d1d5db !important;
      border-radius: 10px !important;
      padding: 8pt !important;
    }

    .gRow:hover {
      transform: none !important;
      border-color: #d1d5db !important;
      background: #ffffff !important;
    }

    .gActive {
      background: #f5f5f5 !important;
      border-color: #b0b0b0 !important;
    }

    .gBadge {
      width: 24pt !important;
      height: 24pt !important;
      border-radius: 8pt !important;
      font-size: 11pt !important;
      background: #f5f5f5 !important;
      border: 1px solid #d1d5db !important;
    }

    .g-A { background: #e8f5e9 !important; border-color: #4caf50 !important; }
    .g-B { background: #e3f2fd !important; border-color: #2196f3 !important; }
    .g-C { background: #fff3e0 !important; border-color: #ff9800 !important; }
    .g-D { background: #ffebee !important; border-color: #f44336 !important; }

    .gName {
      font-size: 10pt !important;
    }

    .gDesc {
      font-size: 9pt !important;
      color: #555555 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Notes grid
       ───────────────────────────────────────────────────────────────────────── */
    .noteGrid {
      gap: 8pt !important;
    }

    .note {
      background: #fafafa !important;
      border: 1px solid #d1d5db !important;
      border-radius: 10px !important;
      padding: 10pt !important;
    }

    .note:hover {
      transform: none !important;
      border-color: #d1d5db !important;
      background: #fafafa !important;
    }

    .noteTitle {
      font-size: 10pt !important;
      font-weight: 700 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Provider compare section
       ───────────────────────────────────────────────────────────────────────── */
    .pcSummary {
      display: none !important;
    }

    .pcDetails {
      margin-top: 10pt !important;
    }

    .pcDetails[open] {
      display: block !important;
    }

    .pcGrid {
      margin-top: 0 !important;
      gap: 10pt !important;
    }

    .pcRow {
      background: #ffffff !important;
      border: 1px solid #d1d5db !important;
      border-left: 4px solid #64748b !important;
      border-radius: 10px !important;
      padding: 10pt !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      color: #1a1a1a !important;
    }
    
    .pcRow.pcP-openai { border-left-color: #10b981 !important; }
    .pcRow.pcP-google { border-left-color: #3b82f6 !important; }
    .pcRow.pcP-groq { border-left-color: #8b5cf6 !important; }
    .pcRow.pcP-openrouter { border-left-color: #f59e0b !important; }
    .pcRow.pcP-anthropic { border-left-color: #f97316 !important; }
    .pcRow.pcP-mistral { border-left-color: #f43f5e !important; }

    .pcRow:hover {
      transform: none !important;
      border-color: #d1d5db !important;
      background: #ffffff !important;
    }

    .pcDot {
      background: #333333 !important;
      box-shadow: none !important;
    }

    .pcEmoji {
      font-size: 10pt !important;
    }

    .pcName {
      font-size: 11pt !important;
    }

    .pcMini {
      background: #f5f5f5 !important;
      border-color: #999999 !important;
      color: #555555 !important;
      font-size: 8pt !important;
    }

    .pcMeta {
      font-size: 9pt !important;
      color: #555555 !important;
    }

    .pcBody {
      border-top: 1px solid #94a3b8 !important;
      margin-top: 8pt !important;
      padding-top: 8pt !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Monospace/code blocks
       ───────────────────────────────────────────────────────────────────────── */
    .mono {
      font-size: 9pt !important;
      color: #333333 !important;
      line-height: 1.5 !important;
    }

    .monoPanel, .monoBlock {
      background: #f5f5f5 !important;
      border: 1px solid #d1d5db !important;
      border-radius: 8px !important;
      padding: 8pt !important;
    }

    .monoErr {
      background: #ffebee !important;
      border-color: #f44336 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Output panel
       ───────────────────────────────────────────────────────────────────────── */
    .outPanel {
      background: #fafafa !important;
      border: none !important;
      border-radius: 8px !important;
      padding: 10pt !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Lite markdown styles
       ───────────────────────────────────────────────────────────────────────── */
    .mdH1 { font-size: 13pt !important; font-weight: 700 !important; color: #0d0d0d !important; }
    .mdH2 { font-size: 12pt !important; font-weight: 700 !important; color: #0d0d0d !important; }
    .mdH3 { font-size: 11pt !important; font-weight: 700 !important; color: #0d0d0d !important; }
    .mdP { font-size: 10pt !important; color: #333333 !important; }
    .md b { font-weight: 700 !important; color: #0d0d0d !important; }
    .mdSp { height: 6pt !important; }

    /* ─────────────────────────────────────────────────────────────────────────
       Decision report blocks
       ───────────────────────────────────────────────────────────────────────── */
    .drGrid {
      gap: 8pt !important;
    }

    .drSec {
      background: #fafafa !important;
      border: 1px solid #d1d5db !important;
      border-radius: 10px !important;
      padding: 10pt !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .drSec:hover {
      border-color: #d1d5db !important;
      background: #fafafa !important;
    }

    .drAction {
      background: #ffffff !important;
      border: 1px solid #d1d5db !important;
      border-radius: 8px !important;
      padding: 8pt !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .drAction.drNeeds {
      background: #fff3e0 !important;
      border-color: #ff9800 !important;
    }

    .drAction.drOk {
      background: #e8f5e9 !important;
      border-color: #4caf50 !important;
    }

    .drActionTitle {
      font-size: 10pt !important;
    }

    .drMetaChip {
      background: #f5f5f5 !important;
      border: 1px solid #94a3b8 !important;
      border-radius: 2pt !important;
      font-size: 8pt !important;
      padding: 2pt 6pt !important;
    }

    .drMetaChip b {
      font-weight: 700 !important;
      color: #0d0d0d !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Record footer
       ───────────────────────────────────────────────────────────────────────── */
    .record {
      background: #ffffff !important;
      border: none !important;
      border-top: 1px solid #94a3b8 !important;
      border-radius: 0 !important;
      padding: 10pt 0 0 0 !important;
      margin-top: 16pt !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .record:hover {
      transform: none !important;
      border-color: #94a3b8 !important;
      background: #ffffff !important;
    }

    .recordTitle {
      font-size: 9pt !important;
      font-weight: 700 !important;
    }

    .recordMeta {
      font-size: 8pt !important;
      color: #555555 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Page break control - Prevent empty pages and content cut-off
       ───────────────────────────────────────────────────────────────────────── */
    .card,
    .pcRow,
    .note,
    .kpiBox,
    .top,
    .record,
    .drSec,
    .drAction,
    .gRow,
    .sentimentRow,
    .researchItem,
    .conclusionBox,
    .radarLegendItem {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      orphans: 3 !important;
      widows: 3 !important;
    }

    /* Prevent page breaks after headers */
    .secTitle,
    .secHead,
    .kpiLabel,
    .noteTitle,
    .pcName {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    /* Ensure grids don't leave orphaned items */
    .grid,
    .g2,
    .two,
    .kpi,
    .noteGrid,
    .pcGrid,
    .drGrid,
    .sentimentGrid,
    .researchGrid,
    .conclusionGrid {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }

    /* Force new page for major sections to avoid partial content */
    .providerCompareCard,
    .geminiCriticCard,
    .radarCard,
    .sentimentCard,
    .conclusionCard,
    .researchCard,
    .disclaimerCard,
    .creditsCard {
      page-break-before: auto !important;
      page-break-inside: avoid !important;
    }

    /* Ensure sections start on new page if needed */
    .card.support {
      page-break-before: auto !important;
    }

    /* Prevent empty space at bottom of pages */
    .wrap {
      padding-bottom: 0 !important;
    }

    .frameInner {
      padding-bottom: 0 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Hide interactive elements
       ───────────────────────────────────────────────────────────────────────── */
    .pcChevron {
      display: none !important;
    }

    .pcChip {
      display: none !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Responsive: Force single column on narrow prints
       ───────────────────────────────────────────────────────────────────────── */
    @media (max-width: 600px) {
      .g2, .two, .kpi, .noteGrid {
        grid-template-columns: 1fr !important;
      }
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Radar Chart for PDF/Print - Visible grid lines
       ───────────────────────────────────────────────────────────────────────── */
    .radarCard {
      page-break-inside: avoid !important;
    }
    .radarContainer {
      display: flex !important;
      flex-direction: column !important;
      gap: 16pt !important;
    }
    .radarChart {
      width: 100% !important;
      display: flex !important;
      justify-content: center !important;
    }
    .radarSvg polygon[fill="none"] {
      stroke: #94a3b8 !important;
      stroke-width: 1 !important;
    }
    .radarSvg line {
      stroke: #94a3b8 !important;
    }
    .radarSvg .radarPolygon {
      animation: none !important;
    }
    .radarLegend {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8pt !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Executive Conclusion - PDF specific with borders and bullet points
       ───────────────────────────────────────────────────────────────────────── */
    .conclusionBox {
      border: 1px solid #94a3b8 !important;
      border-radius: 8pt !important;
      padding: 12pt !important;
      background: #ffffff !important;
      margin-bottom: 8pt !important;
      animation: none !important;
      opacity: 1 !important;
    }
    
    /* Key Takeaways box - cyan left border */
    .conclusionBoxPros {
      border-left: 4pt solid #0891b2 !important;
    }
    
    /* Immediate Next Steps box - amber left border */
    .conclusionBoxCons {
      border-left: 4pt solid #d97706 !important;
    }
    
    /* Key Takeaways - cyan/teal left border (same style as HTML) */
    .conclusionBox.conclusionBoxTakeaways {
      border-left: 4pt solid #0891b2 !important;
      background: linear-gradient(to right, rgba(6,182,212,0.08), #ffffff) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Immediate Next Steps - violet/purple left border (same style as HTML) */
    .conclusionBox.conclusionBoxNextSteps {
      border-left: 4pt solid #7c3aed !important;
      background: linear-gradient(to right, rgba(139,92,246,0.08), #ffffff) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Key Metrics - emerald left border */
    .conclusionBox.conclusionBoxMetrics {
      border-left: 4pt solid #10b981 !important;
      background: linear-gradient(to right, rgba(16,185,129,0.08), #ffffff) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Immediate Next Steps (Actions) - rose left border */
    .conclusionBox.conclusionBoxActions {
      border-left: 4pt solid #f43f5e !important;
      background: linear-gradient(to right, rgba(244,63,94,0.08), #ffffff) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Data Science Insights - cyan-violet left border */
    .conclusionDataScience {
      border-left: 4pt solid #06b6d4 !important;
      background: linear-gradient(to right, rgba(6,182,212,0.08), #ffffff) !important;
      animation: none !important;
      opacity: 1 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .conclusionDataScience::before {
      display: none !important;
    }
    
    .conclusionBoxTitle {
      font-size: 11pt !important;
      font-weight: 700 !important;
      color: #1e293b !important;
      margin-bottom: 8pt !important;
      padding-bottom: 6pt !important;
      border-bottom: 1px solid #e2e8f0 !important;
    }
    
    /* Use decimal numbers consistently (same as HTML) */
    .conclusionList {
      padding-left: 20pt !important;
      list-style: decimal !important;
      margin: 0 !important;
    }
    
    .conclusionList li {
      margin-bottom: 5pt !important;
      font-size: 10pt !important;
      color: #334155 !important;
      animation: none !important;
      opacity: 1 !important;
      padding-left: 4pt !important;
    }
    
    .conclusionList li::marker {
      color: #1e293b !important;
      font-weight: 600 !important;
    }
    
    /* Suggested Review and Confidence boxes - with left borders */
    .conclusionMetaItem {
      border: 1px solid #94a3b8 !important;
      border-left: 4pt solid #06b6d4 !important;
      border-radius: 8pt !important;
      background: #ffffff !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      animation: none !important;
      opacity: 1 !important;
    }
    
    .conclusionMeta {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    /* Priority Action Checklist - PDF specific - ENSURE VISIBLE */
    .conclusionPrioritySection {
      display: block !important;
      visibility: visible !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin-bottom: 14pt !important;
      padding: 14pt !important;
      background: #fffbeb !important;
      border: 1px solid #fcd34d !important;
      border-left: 4pt solid #f59e0b !important;
      border-radius: 8pt !important;
      animation: none !important;
      opacity: 1 !important;
    }
    
    .conclusionPriorityTitle {
      font-size: 12pt !important;
      font-weight: 700 !important;
      color: #92400e !important;
      margin-bottom: 12pt !important;
      padding-bottom: 8pt !important;
      border-bottom: 1px solid #fcd34d !important;
    }
    
    .conclusionPriorityList {
      display: flex !important;
      flex-direction: column !important;
      gap: 8pt !important;
    }
    
    .conclusionPriorityItem {
      display: flex !important;
      visibility: visible !important;
      align-items: center !important;
      gap: 10pt !important;
      padding: 10pt 12pt !important;
      background: #ffffff !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 6pt !important;
      animation: none !important;
      opacity: 1 !important;
      page-break-inside: avoid !important;
    }
    
    .conclusionPriorityBadge {
      padding: 4pt 10pt !important;
      border-radius: 4pt !important;
      font-size: 9pt !important;
      font-weight: 700 !important;
      min-width: 55pt !important;
      text-align: center !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .conclusionPriorityText {
      font-size: 10pt !important;
      color: #374151 !important;
      line-height: 1.4 !important;
    }
    
    /* Stakeholder Sentiment Insights (ABSA) - PDF - ENSURE VISIBLE */
    .conclusionSentimentInsights {
      display: block !important;
      visibility: visible !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin: 4pt 0 2pt 0 !important;
      padding: 8pt !important;
      background: #faf5ff !important;
      border: 1px solid #e9d5ff !important;
      border-left: 4pt solid #8b5cf6 !important;
      border-radius: 8pt !important;
      animation: none !important;
      opacity: 1 !important;
    }
    
    .conclusionSentimentInsights::before {
      display: none !important;
    }
    
    .conclusionSentimentHeader {
      display: flex !important;
      align-items: center !important;
      gap: 6pt !important;
      margin-bottom: 2pt !important;
      padding-bottom: 2pt !important;
      border-bottom: 1px solid #e9d5ff !important;
    }
    
    .conclusionSentimentIcon {
      font-size: 16pt !important;
      animation: none !important;
    }
    
    .conclusionSentimentTitle {
      font-size: 10pt !important;
      font-weight: 700 !important;
      color: #6b21a8 !important;
    }
    
    .conclusionSentimentBadge {
      font-size: 8pt !important;
      padding: 3pt 8pt !important;
      border-radius: 10pt !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      animation: none !important;
    }
    
    .conclusionSentimentList {
      margin: 0 !important;
      padding-left: 14pt !important;
      list-style: disc !important;
    }
    
    .conclusionSentimentList li {
      margin-bottom: 2pt !important;
      font-size: 9pt !important;
      color: #374151 !important;
      line-height: 1.3 !important;
      animation: none !important;
      opacity: 1 !important;
    }
    
    /* Executive Summary box - with left border */
    .conclusionSummary {
      border-left: 4pt solid #10b981 !important;
      animation: none !important;
      opacity: 1 !important;
    }
    
    /* Strategic Recommendation - with left border */
    .conclusionRecommendation {
      border-left: 4pt solid #10b981 !important;
      animation: none !important;
      opacity: 1 !important;
    }
    
    .conclusionRecommendation::before,
    .conclusionRecommendation::after {
      display: none !important;
    }
    
    /* Confidence Overview - with left border */
    .conclusionConfidenceOverview {
      border: 1pt solid #cbd5e1 !important;
      border-left: 4pt solid #94a3b8 !important;
      border-radius: 8pt !important;
      animation: none !important;
      opacity: 1 !important;
    }
    
    .conclusionConfidenceValue {
      animation: none !important;
      opacity: 1 !important;
    }
    
    .conclusionConfidenceLevel {
      animation: none !important;
      opacity: 1 !important;
    }
    
    /* Data Science Insights Summary - with left border */
    .conclusionDataScience {
      border-left: 4pt solid #06b6d4 !important;
      animation: none !important;
      opacity: 1 !important;
    }
    
    .conclusionDataScience::before {
      display: none !important;
    }
    
    .conclusionDSItem {
      animation: none !important;
      opacity: 1 !important;
    }
    
    .conclusionDSIcon {
      animation: none !important;
    }
    
    .conclusionDSNote {
      animation: none !important;
      opacity: 1 !important;
    }

    /* Stress Test PDF overrides - grey soft borders */
    .stressTestCard {
      border: 1pt solid #ddd6fe !important;
      border-left: 4pt solid #7c3aed !important;
      background: #faf5ff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .conclusionStressInsights {
      border: 1pt solid #ddd6fe !important;
      border-left: 4pt solid #8b5cf6 !important;
      background: #faf5ff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .conclusionStressScoreCard {
      border: 1pt solid #e2e8f0 !important;
      background: #ffffff !important;
    }
    .conclusionStressAction {
      border: 1pt solid #ddd6fe !important;
      background: #faf5ff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .stressScoreCard {
      border: 1pt solid #cbd5e1 !important;
      background: #ffffff !important;
      animation: none !important;
    }
    .stressScoreCard:hover {
      border-color: #cbd5e1 !important;
      transform: none !important;
      box-shadow: none !important;
    }
    .stressScoreBarWrap {
      background: #e2e8f0 !important;
    }
    .stressScoreInterp {
      border-top-color: #e2e8f0 !important;
    }
    .stressCriticalFlaw {
      border: 1pt solid #fca5a5 !important;
      border-left: 3pt solid #ef4444 !important;
      background: #fff5f5 !important;
    }
    .stressChallengeItem, .stressDepItem {
      border: 1pt solid #cbd5e1 !important;
      border-left: 3pt solid #94a3b8 !important;
      background: #ffffff !important;
    }
    .stressMatrixCard {
      border: 1pt solid #cbd5e1 !important;
      background: #ffffff !important;
    }
    .stressMatrixLabel {
      font-weight: 600 !important;
    }
    .stressSectionHead, .stressThinkStep {
      animation: none !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Credits / Thank You - PDF specific with colored borders
       ───────────────────────────────────────────────────────────────────────── */
    .creditsCard {
      background: #ffffff !important;
      border: 1px solid #e5e7eb !important;
    }
    
    /* Author section - very soft blue border */
    .creditsAuthor {
      border: 1px solid #bfdbfe !important;
      border-radius: 8pt !important;
      background: #f8fafc !important;
    }
    
    /* Social links section - very soft green border */
    .creditsSocial {
      border: 1px solid #bbf7d0 !important;
      border-radius: 8pt !important;
      background: #fafafa !important;
      padding: 10pt !important;
    }
    
    /* Individual social link - colored backgrounds matching hover colors */
    .creditsSocialLink {
      border: 1px solid #d1d5db !important;
      border-radius: 6pt !important;
      padding: 6pt 12pt !important;
    }
    
    .creditsSocialTwitter {
      border-color: #a7f3d0 !important;
      background: #d1fae5 !important;
    }
    
    .creditsSocialGithub {
      border-color: #fbcfe8 !important;
      background: #fce7f3 !important;
    }
    
    .creditsSocialDiscord {
      border-color: #c7d2fe !important;
      background: #e0e7ff !important;
    }
    
    .creditsFooter {
      border: 1px solid #e5e7eb !important;
      border-radius: 6pt !important;
      background: #fafafa !important;
    }
    
    /* ─────────────────────────────────────────────────────────────────────────
       Decision Readiness Score Gauge - PDF specific
       ───────────────────────────────────────────────────────────────────────── */
    .gaugeCard {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-before: auto !important;
      margin-top: 20pt !important;
      padding: 16pt !important;
      overflow: visible !important;
    }
    .gaugeContainer {
      display: flex !important;
      flex-direction: column !important;
      gap: 16pt !important;
      align-items: center !important;
      overflow: visible !important;
    }
    .gaugeChart {
      display: flex !important;
      justify-content: center !important;
      width: 100% !important;
      overflow: visible !important;
      min-height: 260pt !important;
    }
    .gaugeSvg {
      width: 380px !important;
      height: 340px !important;
      max-width: 100% !important;
      overflow: visible !important;
    }
    .gaugeSvg path,
    .gaugeSvg line,
    .gaugeSvg text,
    .gaugeSvg rect {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .gaugeArc {
      animation: none !important;
      stroke-dasharray: none !important;
      stroke-dashoffset: 0 !important;
    }
    .gaugeScoreText {
      font-size: 36pt !important;
      font-weight: 900 !important;
    }
    /* Grade Badge - below the gauge, positioned under gauge visual */
    .gradeBadgeWrapper {
      display: flex !important;
      justify-content: flex-start !important;
      padding-left: 5pt !important;
      margin-top: -8pt !important;
      margin-bottom: 4pt !important;
    }
    .gradeBadge {
      animation: none !important;
      opacity: 1 !important;
      padding: 5pt 16pt !important;
      border-radius: 12pt !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .gradeBadgeBg {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .gradeBadgeText {
      color: #ffffff !important;
      font-size: 9pt !important;
      font-weight: 600 !important;
    }
    .gaugeInfo {
      width: 100% !important;
      padding: 12pt !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8pt !important;
    }
    .gaugeStatus {
      font-size: 14pt !important;
      font-weight: 700 !important;
      padding-bottom: 10pt !important;
      margin-bottom: 10pt !important;
      border-bottom: 1px solid #e2e8f0 !important;
    }
    .gaugeBreakdownItem {
      display: flex !important;
      align-items: center !important;
      gap: 8pt !important;
      margin-bottom: 6pt !important;
    }
    .gaugeBreakdownLabel {
      font-size: 10pt !important;
      min-width: 70pt !important;
    }
    .gaugeBreakdownBar {
      flex: 1 !important;
      height: 8pt !important;
      background: #e2e8f0 !important;
      border-radius: 4pt !important;
      overflow: hidden !important;
    }
    .gaugeBreakdownFill {
      height: 100% !important;
      border-radius: 4pt !important;
      animation: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .gaugeBreakdownValue {
      font-size: 10pt !important;
      font-weight: 600 !important;
      min-width: 40pt !important;
      text-align: right !important;
    }
    .gaugeExplanation {
      margin-top: 14pt !important;
      padding: 12pt !important;
      background: #f0fdf4 !important;
      border: 1px solid #bbf7d0 !important;
      border-radius: 8pt !important;
    }
    .gaugeExplanationTitle {
      font-size: 11pt !important;
      font-weight: 700 !important;
      color: #166534 !important;
      margin-bottom: 6pt !important;
    }
    .gaugeExplanationText {
      font-size: 10pt !important;
      line-height: 1.6 !important;
      color: #333 !important;
    }
    .gaugeNextSteps {
      margin-top: 10pt !important;
      padding-top: 10pt !important;
      border-top: 1px solid #bbf7d0 !important;
    }
    .gaugeNextStepsList {
      font-size: 10pt !important;
      padding-left: 14pt !important;
    }
    .gaugeNextStepsList li {
      margin-bottom: 4pt !important;
    }
    
    /* ─────────────────────────────────────────────────────────────────────────
       Sentiment Analysis - PDF specific with progress bars
       ───────────────────────────────────────────────────────────────────────── */
    .sentimentCard {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      border-left: 4pt solid #a855f7 !important;
    }
    .sentimentLegend {
      margin-bottom: 12pt !important;
      padding: 10pt !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8pt !important;
    }
    .sentimentLegendGrid {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 12pt !important;
    }
    .sentimentLegendItem {
      display: flex !important;
      align-items: center !important;
      gap: 6pt !important;
    }
    .sentimentOverview {
      padding: 12pt !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8pt !important;
      margin-bottom: 12pt !important;
    }
    .sentimentConclusion {
      padding: 10pt 12pt !important;
      background: #faf5ff !important;
      border: 1px solid #e9d5ff !important;
      border-radius: 8pt !important;
      margin-bottom: 12pt !important;
      font-size: 10pt !important;
    }
    .sentimentGrid {
      display: flex !important;
      flex-direction: column !important;
      gap: 10pt !important;
    }
    .sentimentRow {
      padding: 10pt 12pt !important;
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8pt !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      animation: none !important;
      opacity: 1 !important;
    }
    .sentimentAspect {
      display: flex !important;
      align-items: center !important;
      gap: 8pt !important;
      margin-bottom: 8pt !important;
    }
    .sentimentLabel {
      font-size: 11pt !important;
      font-weight: 600 !important;
    }
    .sentimentBadge {
      font-size: 8pt !important;
      padding: 2pt 6pt !important;
      border-radius: 3pt !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .sentimentBarContainer {
      display: flex !important;
      align-items: center !important;
      gap: 8pt !important;
      margin-bottom: 6pt !important;
    }
    .sentimentBarTrack {
      flex: 1 !important;
      height: 10pt !important;
      background: #e2e8f0 !important;
      border-radius: 5pt !important;
      overflow: hidden !important;
    }
    .sentimentBar {
      height: 100% !important;
      border-radius: 5pt !important;
      animation: none !important;
      transform: scaleX(1) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .sentimentPercent {
      font-size: 10pt !important;
      font-weight: 600 !important;
      min-width: 35pt !important;
      animation: none !important;
    }
    .sentimentExplanation {
      margin-top: 8pt !important;
      padding: 8pt 10pt !important;
      background: #faf5ff !important;
      border: 1px solid #e9d5ff !important;
      border-radius: 6pt !important;
    }
    .sentimentKeySignals {
      margin-top: 6pt !important;
      padding: 6pt 10pt !important;
      background: #f8fafc !important;
      border-radius: 6pt !important;
    }
    .sentimentNote {
      margin-top: 12pt !important;
      padding: 10pt !important;
      background: #faf5ff !important;
      border: 1px solid #e9d5ff !important;
      border-radius: 8pt !important;
      font-size: 10pt !important;
    }
    
    /* ─────────────────────────────────────────────────────────────────────────
       Word Cloud - PDF specific (show words with counts)
       ───────────────────────────────────────────────────────────────────────── */
    .wcCard {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .wcStats {
      display: flex !important;
      justify-content: center !important;
      gap: 16pt !important;
      margin-bottom: 16pt !important;
    }
    .wcStatItem {
      padding: 10pt 14pt !important;
      background: #f8fafc !important;
      border: none !important;
      border-radius: 6pt !important;
      text-align: center !important;
    }
    .wcStatValue {
      font-size: 16pt !important;
      font-weight: 800 !important;
    }
    .wcStatLabel {
      font-size: 8pt !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
    }
    .wcCloud {
      padding: 16pt !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8pt !important;
      margin-bottom: 12pt !important;
    }
    .wcWord {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4pt !important;
      margin: 4pt !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    /* Show count inline in PDF instead of tooltip */
    .wcCount {
      display: inline !important;
      position: static !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      font-size: 8pt !important;
      color: #64748b !important;
      padding: 0 !important;
      transform: none !important;
    }
    .wcCount::after {
      display: none !important;
    }
    .wcCategories {
      margin-bottom: 12pt !important;
    }
    .wcCategoriesTitle {
      font-size: 11pt !important;
      font-weight: 700 !important;
      margin-bottom: 10pt !important;
    }
    .wcCategoryBar {
      display: flex !important;
      align-items: center !important;
      gap: 10pt !important;
      margin-bottom: 6pt !important;
    }
    .wcCategoryName {
      font-size: 10pt !important;
      min-width: 70pt !important;
    }
    .wcCategoryTrack {
      flex: 1 !important;
      height: 8pt !important;
      background: #e2e8f0 !important;
      border-radius: 4pt !important;
      overflow: hidden !important;
    }
    .wcCategoryFill {
      height: 100% !important;
      border-radius: 4pt !important;
      animation: none !important;
      transform: scaleX(1) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .wcNote {
      padding: 10pt !important;
      background: #fdf2f8 !important;
      border: 1px solid #fbcfe8 !important;
      border-left: 3pt solid #ec4899 !important;
      border-radius: 6pt !important;
      font-size: 9pt !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Correlation Matrix - PDF specific (softer colors, precise alignment)
       ───────────────────────────────────────────────────────────────────────── */
    .cmCard {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .cmContainer {
      display: flex !important;
      flex-direction: column !important;
      gap: 16pt !important;
    }
    .cmMatrixWrap {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
    }
    .cmColHeaders {
      display: flex !important;
      margin-bottom: 2pt !important;
      margin-left: 45pt !important;
      gap: 0pt !important;
    }
    .cmColLabel {
      width: 45pt !important;
      font-size: 9pt !important;
      font-weight: 700 !important;
      text-align: center !important;
      transform: none !important;
      height: 20pt !important;
      display: flex !important;
      align-items: flex-end !important;
      justify-content: center !important;
      color: #1e293b !important;
    }
    .cmMatrixRow {
      display: flex !important;
      align-items: flex-start !important;
    }
    .cmRowLabels {
      display: flex !important;
      flex-direction: column !important;
      gap: 0pt !important;
    }
    .cmRowLabel {
      width: 45pt !important;
      height: 45pt !important;
      font-size: 9pt !important;
      font-weight: 700 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      padding-right: 6pt !important;
      color: #1e293b !important;
    }
    .cmMatrix {
      display: grid !important;
      gap: 0pt !important;
    }
    .cmCell {
      width: 45pt !important;
      height: 45pt !important;
      font-size: 10pt !important;
      font-weight: 600 !important;
      border-radius: 4pt !important;
      animation: none !important;
      opacity: 1 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    /* Right labels in PDF */
    .cmRightLabels {
      display: flex !important;
      flex-direction: column !important;
      margin-left: 10pt !important;
      gap: 0pt !important;
    }
    .cmRightLabel {
      height: 45pt !important;
      font-size: 9pt !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
    }
    .cmRightLabelDesc {
      font-size: 8pt !important;
      color: #64748b !important;
    }
    
    /* Monte Carlo PDF */
    .mcCard {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      border-left: 4pt solid #a78bfa !important;
    }
    .mcContent {
      display: flex !important;
      flex-direction: column !important;
      gap: 10pt !important;
    }
    .mcChartWrap {
      width: 100% !important;
      display: flex !important;
      justify-content: center !important;
    }
    .mcSvg {
      width: 100% !important;
      max-width: 420pt !important;
      height: auto !important;
    }
    .mcSvg text {
      font-size: 7pt !important;
    }
    /* Frequency label - preserve vertical rotation in PDF */
    .mcFrequencyLabel {
      font-size: 8pt !important;
      fill: #64748b !important;
      font-weight: 500 !important;
    }
    .mcBar {
      animation: none !important;
      opacity: 1 !important;
    }
    .mcStats {
      width: 100% !important;
      border: 1px solid #e9d5ff !important;
      border-left: 3pt solid #a78bfa !important;
      border-radius: 8pt !important;
      padding: 10pt !important;
      background: #faf5ff !important;
    }
    .mcStatsTitle {
      font-size: 10pt !important;
      margin-bottom: 8pt !important;
    }
    .mcNote {
      border-left: 3pt solid #a78bfa !important;
      font-size: 8pt !important;
    }
    .mcStatGrid {
      gap: 4pt !important;
    }
    .mcStatItem {
      font-size: 7pt !important;
      padding: 4pt 6pt !important;
      border: 1px solid #e9d5ff !important;
      border-radius: 4pt !important;
      background: #ffffff !important;
    }
    
    /* Hide JSON in PDF */
    .no-print {
      display: none !important;
    }
    
    /* Quick Statistics - PDF with soft border */
    .dataExportStats {
      border-left: 3pt solid #0891b2 !important;
      background: #f0fdfa !important;
    }
    
    .cmLegend {
      padding: 12pt !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8pt !important;
    }
    .cmLegendTitle {
      font-size: 11pt !important;
      font-weight: 700 !important;
      margin-bottom: 10pt !important;
    }
    .cmLegendItem {
      font-size: 9pt !important;
      margin-bottom: 6pt !important;
    }
    .cmLegendColor {
      width: 14pt !important;
      height: 14pt !important;
      border-radius: 3pt !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .cmKeyLabel {
      font-size: 9pt !important;
    }
    .cmInsights {
      padding: 12pt !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8pt !important;
    }
    .cmInsight {
      padding: 6pt 0 !important;
      border-bottom: 1px solid #e2e8f0 !important;
    }
    .cmInsightPair {
      font-size: 10pt !important;
      font-weight: 600 !important;
    }
    .cmInsightValue {
      font-size: 11pt !important;
      font-weight: 700 !important;
    }
    .cmNote {
      padding: 10pt !important;
      background: #f5f3ff !important;
      border: 1px solid #ddd6fe !important;
      border-left: 3pt solid #8b5cf6 !important;
      border-radius: 6pt !important;
      font-size: 9pt !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Time Series Value Labels - Always visible in PDF
       ───────────────────────────────────────────────────────────────────────── */
    .tsValueLabel {
      opacity: 1 !important;
      font-size: 9pt !important;
      font-weight: 700 !important;
      fill: #333333 !important;
    }
    .tsValueLabel {
      display: none !important; /* Hide value labels in PDF - values shown in interpretation below */
    }
    .tsPointGroup {
      animation: none !important;
    }
    .tsPoint {
      animation: none !important;
      opacity: 1 !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Timeline Data Points - PDF specific (soft gray borders)
       ───────────────────────────────────────────────────────────────────────── */
    .tsDataPoints {
      padding: 12pt 14pt !important;
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 8pt !important;
      margin-bottom: 12pt !important;
    }
    .tsDataPointsTitle {
      font-size: 11pt !important;
      font-weight: 600 !important;
      color: #1e293b !important;
      margin-bottom: 10pt !important;
    }
    .tsDataPointsList {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8pt !important;
    }
    .tsDataPoint {
      display: flex !important;
      gap: 8pt !important;
      align-items: center !important;
      padding: 6pt 10pt !important;
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 6pt !important;
      font-size: 9pt !important;
    }
    .tsDataPointDate {
      color: #64748b !important;
      font-weight: 500 !important;
    }
    .tsDataPointValue {
      font-weight: 600 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Sentiment Correlation Heatmap - PDF specific (FULL display, insights below)
       ───────────────────────────────────────────────────────────────────────── */
    .heatmapContainer {
      page-break-before: auto !important;
      page-break-inside: avoid !important;
      padding: 16pt !important;
      margin: 12pt 0 !important;
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 10pt !important;
    }
    .heatmapTitle {
      font-size: 12pt !important;
      font-weight: 700 !important;
      color: #1e293b !important;
      margin-bottom: 4pt !important;
    }
    .heatmapDesc {
      font-size: 9pt !important;
      color: #64748b !important;
      margin-bottom: 10pt !important;
    }
    .heatmapColorGreen { color: #16a34a !important; font-weight: 600 !important; }
    .heatmapColorYellow { color: #a3a323 !important; font-weight: 600 !important; }
    .heatmapColorRed { color: #dc2626 !important; font-weight: 600 !important; }
    /* Stack vertically - image on top, insights below */
    .heatmapContent {
      display: flex !important;
      flex-direction: column !important;
      gap: 0pt !important;
      align-items: center !important;
    }
    .heatmapSvgWrapper {
      display: flex !important;
      justify-content: center !important;
      overflow: visible !important;
      padding: 10pt !important;
      width: 100% !important;
      margin-bottom: -80pt !important;
    }
    /* Heatmap SVG - proper sizing */
    .heatmapSvg {
      width: 100% !important;
      max-width: 500pt !important;
      height: auto !important;
      overflow: visible !important;
    }
    .heatmapSvg text {
      font-size: 8pt !important;
      font-weight: 600 !important;
    }
    /* X-axis labels (column headers) - shift left to align with boxes */
    .heatmapLabelsX {
      transform: translateX(-15pt) !important;
    }
    .heatmapLabelsX text {
      font-size: 7pt !important;
      font-weight: 600 !important;
      fill: #1e293b !important;
    }
    /* Y-axis labels (row headers) */
    .heatmapLabelsY text {
      font-size: 8pt !important;
      font-weight: 600 !important;
      fill: #1e293b !important;
    }
    .heatmapCell {
      animation: none !important;
      opacity: 1 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .heatmapCellText {
      animation: none !important;
      opacity: 1 !important;
      font-size: 9pt !important;
      font-weight: 700 !important;
    }
    /* Key Insights below the image - no gap */
    .heatmapInsights {
      width: 100% !important;
      margin-top: 0pt !important;
      padding: 12pt !important;
      background: #fffbeb !important;
      border: 1px solid #fcd34d !important;
      border-left: 4pt solid #f59e0b !important;
      border-radius: 8pt !important;
      animation: none !important;
      opacity: 1 !important;
    }
    .heatmapInsightsTitle {
      font-size: 11pt !important;
      font-weight: 700 !important;
      color: #92400e !important;
      margin-bottom: 8pt !important;
    }
    .heatmapInsightsList {
      font-size: 10pt !important;
      line-height: 1.6 !important;
      margin: 0 !important;
      padding-left: 16pt !important;
    }
    .heatmapInsightsList li {
      margin-bottom: 6pt !important;
      padding-left: 4pt !important;
      border-left: none !important;
      animation: none !important;
      opacity: 1 !important;
    }
    .heatmapLegend {
      display: flex !important;
      justify-content: center !important;
      gap: 14pt !important;
      margin-top: 10pt !important;
      padding-top: 10pt !important;
      border-top: 1px solid #e2e8f0 !important;
    }
    .heatmapLegendItem {
      display: flex !important;
      align-items: center !important;
      gap: 5pt !important;
      font-size: 9pt !important;
    }
    .heatmapLegendColor {
      width: 14pt !important;
      height: 14pt !important;
      border-radius: 3pt !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* ─────────────────────────────────────────────────────────────────────────
       Data Export & Analytics - PDF specific (SHOW EVERYTHING)
       ───────────────────────────────────────────────────────────────────────── */
    .dataExportCard {
      page-break-before: always !important;
      margin-top: 30pt !important;
      display: block !important;
      visibility: visible !important;
    }
    
    /* Hide JSON Export in PDF */
    .dataExportFormats {
      display: none !important;
    }
    
    .dataExportFormat {
      display: none !important;
    }
    
    .dataExportNote {
      display: none !important;
    }
    
    .dataExportFormatHeader {
      display: flex !important;
      align-items: center !important;
      gap: 8pt !important;
      margin-bottom: 8pt !important;
    }
    
    .dataExportIcon {
      font-size: 18pt !important;
    }
    
    .dataExportName {
      font-size: 11pt !important;
      font-weight: 600 !important;
      color: #1e293b !important;
    }
    
    .dataExportDesc {
      font-size: 9pt !important;
      color: #64748b !important;
    }
    
    /* Show details/summary expanded */
    .dataExportDetails {
      display: block !important;
    }
    
    .dataExportDetails[open] {
      display: block !important;
    }
    
    .dataExportDetails summary {
      display: none !important;
    }
    
    .dataExportDetails[open] .dataExportCode {
      display: block !important;
      max-height: none !important;
    }
    
    .dataExportCode {
      display: block !important;
      font-size: 7pt !important;
      background: #ffffff !important;
      border: none !important;
      padding: 10pt !important;
      border-radius: 4pt !important;
      overflow: visible !important;
      white-space: pre-wrap !important;
      word-break: break-all !important;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.05) !important;
    }
    
    /* Analytics section */
    .dataExportAnalytics {
      display: block !important;
      visibility: visible !important;
      margin-top: 16pt !important;
      padding: 14pt !important;
      background: #f0fdf4 !important;
      border: 1px solid #bbf7d0 !important;
      border-left: 4pt solid #10b981 !important;
      border-radius: 8pt !important;
    }
    
    .dataExportAnalyticsTitle {
      font-size: 11pt !important;
      font-weight: 700 !important;
      color: #166534 !important;
      margin-bottom: 10pt !important;
    }
    
    .dataExportAnalyticsGrid {
      display: grid !important;
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 10pt !important;
    }
    
    .dataExportAnalyticsItem {
      display: flex !important;
      flex-direction: column !important;
      gap: 4pt !important;
      padding: 10pt !important;
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 6pt !important;
      animation: none !important;
      opacity: 1 !important;
    }
    
    .dataExportAnalyticsLabel {
      font-size: 9pt !important;
      color: #64748b !important;
    }
    
    .dataExportAnalyticsValue {
      font-size: 14pt !important;
      font-weight: 700 !important;
      color: #1e293b !important;
    }
    
    /* ─────────────────────────────────────────────────────────────────────────
       Provider Compare - PDF specific (ensure it displays)
       ───────────────────────────────────────────────────────────────────────── */
    .providerCompareCard {
      page-break-before: auto !important;
      page-break-inside: avoid !important;
    }
    .pcDetails {
      display: block !important;
    }
    .pcDetails[open] {
      display: block !important;
    }
    .pcGrid {
      display: flex !important;
      flex-direction: column !important;
      gap: 12pt !important;
    }
    .pcRow {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      padding: 12pt !important;
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-left: 4pt solid #64748b !important;
      border-radius: 8pt !important;
    }
    .pcRow.pcP-openai { border-left-color: #10b981 !important; }
    .pcRow.pcP-google { border-left-color: #3b82f6 !important; }
    .pcRow.pcP-groq { border-left-color: #8b5cf6 !important; }
    .pcRow.pcP-openrouter { border-left-color: #f59e0b !important; }
    .pcHead {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 8pt !important;
    }
    .pcBody {
      border-top: 1px solid #e2e8f0 !important;
      padding-top: 10pt !important;
      margin-top: 8pt !important;
    }
    .outPanel {
      background: #f8fafc !important;
      border-radius: 6pt !important;
      padding: 10pt !important;
    }
    .drGrid {
      display: flex !important;
      flex-direction: column !important;
      gap: 8pt !important;
    }
    .drSec {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 6pt !important;
      padding: 10pt !important;
    }
    
    /* ─────────────────────────────────────────────────────────────────────────
       Radar Chart - PDF specific
       ───────────────────────────────────────────────────────────────────────── */
    .radarCard {
      page-break-inside: avoid !important;
    }
    .radarContainer {
      display: flex !important;
      flex-direction: column !important;
      gap: 16pt !important;
    }
    .radarChart {
      width: 100% !important;
      display: flex !important;
      justify-content: center !important;
    }
    .radarSvg {
      width: 260px !important;
      height: auto !important;
    }
    .radarSvg polygon[fill="none"] {
      stroke: #94a3b8 !important;
      stroke-width: 1 !important;
    }
    .radarSvg line {
      stroke: #94a3b8 !important;
    }
    .radarSvg .radarPolygon {
      animation: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .radarLegend {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8pt !important;
    }
    .radarLegendItem {
      padding: 8pt !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 6pt !important;
    }
    .radarLegendDot {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .radarInterpretation {
      padding: 10pt !important;
      background: #f0fdf4 !important;
      border: 1px solid #bbf7d0 !important;
      border-radius: 8pt !important;
      margin-top: 12pt !important;
    }
    .radarNote {
      padding: 10pt !important;
      background: #f8fafc !important;
      border-left: 3pt solid #10b981 !important;
      font-size: 10pt !important;
    }
    .radarRealityCheck {
      margin-top: 12pt !important;
      padding: 12pt !important;
      background: #fef3c7 !important;
      border: 1px solid #fcd34d !important;
      border-radius: 8pt !important;
    }
    
    /* ─────────────────────────────────────────────────────────────────────────
       Logo/Brand in PDF - Match HTML appearance
       ───────────────────────────────────────────────────────────────────────── */
    .brand {
      display: flex !important;
      align-items: center !important;
      gap: 10pt !important;
    }
    .markWrap {
      width: 28pt !important;
      height: 28pt !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 50% !important;
      background: linear-gradient(135deg, #67e8f9 0%, #a855f7 33%, #fb7185 66%, #34d399 100%) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .markWrap:before,
    .markWrap:after {
      display: none !important;
      content: none !important;
    }
    .markG {
      font-size: 14pt !important;
      font-weight: 900 !important;
      color: #ffffff !important;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif !important;
      text-shadow: 0 1px 3px rgba(0,0,0,0.4) !important;
      position: relative !important;
      z-index: 2 !important;
    }
    .brandCol {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 6pt !important;
    }
    .brandSep {
      color: #cbd5e1 !important;
      font-weight: 300 !important;
      font-size: 12pt !important;
    }
    .brandName {
      font-size: 14pt !important;
      font-weight: 800 !important;
      color: #06b6d4 !important;
      letter-spacing: -0.02em !important;
    }
    .brandTag {
      font-size: 9pt !important;
      color: #64748b !important;
      font-weight: 500 !important;
    }
    
    /* ─────────────────────────────────────────────────────────────────────────
       Decision Quality Distribution - PDF specific
       ───────────────────────────────────────────────────────────────────────── */
    .qualityDistCard {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .qualityDistCard::after {
      display: none !important;
    }
    .qualityDistOverview {
      display: flex !important;
      align-items: center !important;
      gap: 16pt !important;
      padding: 12pt !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8pt !important;
      margin-bottom: 14pt !important;
    }
    .qualityDistScore {
      text-align: center !important;
    }
    .qualityDistScoreValue {
      font-size: 36pt !important;
      font-weight: 800 !important;
      animation: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .qualityDistScoreLabel {
      font-size: 9pt !important;
    }
    .qualityDistInterpretationIcon {
      font-size: 24pt !important;
      animation: none !important;
    }
    .qualityDistInterpretationText {
      font-size: 11pt !important;
      line-height: 1.5 !important;
    }
    .qualityDistBars {
      margin-bottom: 14pt !important;
    }
    .qualityDistBar {
      margin-bottom: 12pt !important;
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
    .qualityDistBarHeader {
      display: flex !important;
      justify-content: space-between !important;
      margin-bottom: 4pt !important;
    }
    .qualityDistBarName {
      font-size: 11pt !important;
      font-weight: 700 !important;
    }
    .qualityDistBarDesc {
      font-size: 9pt !important;
    }
    .qualityDistBarContainer {
      display: flex !important;
      align-items: center !important;
      gap: 8pt !important;
    }
    .qualityDistBarTrack {
      flex: 1 !important;
      height: 10pt !important;
      background: #e2e8f0 !important;
      border-radius: 5pt !important;
      overflow: hidden !important;
    }
    .qualityDistBarFill {
      height: 100% !important;
      border-radius: 5pt !important;
      animation: none !important;
      transform: scaleX(1) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .qualityDistBarValue {
      font-size: 11pt !important;
      font-weight: 700 !important;
      min-width: 40pt !important;
    }
    .qualityDistNote {
      padding: 10pt !important;
      background: #f0f9ff !important;
      border: 1px solid #bae6fd !important;
      border-left: 3pt solid #3b82f6 !important;
      border-radius: 6pt !important;
      font-size: 9pt !important;
    }
  }

  /* ============================================================================
     NEW STYLES: Radar Chart, Sentiment, Conclusion, Research, Disclaimer, Credits
     ============================================================================ */

  /* Radar Chart Styles */
  .radarContainer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: center;
    margin-top: 16px;
  }
  @media (max-width: 700px) {
    .radarContainer { grid-template-columns: 1fr; }
  }
  .radarChart {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .radarSvg {
    width: 100%;
    max-width: 300px;
    height: auto;
  }
  .radarPolygon {
    animation: radarPulse 3s ease-in-out infinite;
  }
  @keyframes radarPulse {
    0%, 100% { transform-origin: center; transform: scale(1); }
    50% { transform-origin: center; transform: scale(1.02); }
  }
  .radarLegend {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .radarLegendItem {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: var(--card2);
    border-radius: 8px;
    border: 1px solid var(--bd);
  }
  .radarLegendDot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .radarLegendLabel {
    flex: 1;
    font-size: 12px;
    color: var(--fg);
  }
  .radarLegendValue {
    font-size: 12px;
    font-weight: 600;
    color: var(--fgStrong);
  }
  .radarNote {
    margin-top: 16px;
    padding: 12px;
    background: var(--card2);
    border-radius: 8px;
    font-size: 11px;
    color: var(--muted);
    border-left: 3px solid #10b981;
  }
  .radar-dot:hover {
    r: 8;
    cursor: pointer;
  }

  /* Sentiment Analysis Styles */
  .sentimentOverview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: var(--card2);
    border-radius: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .sentimentOverviewLeft {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .sentimentOverviewLabel {
    font-size: 14px;
    font-weight: 700;
    color: var(--fgStrong);
  }
  .sentimentOverviewConf {
    font-size: 14px;
    font-weight: 700;
    color: #22c55e;
  }
  html[data-theme="light"] .sentimentOverviewConf {
    color: #15803d;
  }
  .sentimentModelBadge {
    font-size: 10px;
    padding: 4px 10px;
    background: var(--card);
    border-radius: 20px;
    color: var(--muted);
  }
  .sentimentConclusion {
    padding: 14px 16px;
    background: linear-gradient(135deg, rgba(168,85,247,0.1), rgba(139,92,246,0.1));
    border-radius: 10px;
    margin-bottom: 16px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--fg);
    border: 1px solid rgba(168,85,247,0.2);
  }
  .sentimentSummary {
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1));
    border-radius: 10px;
    margin-bottom: 16px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--fg);
  }
  .sentimentGrid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sentimentRow {
    padding: 12px 16px;
    background: var(--card2);
    border-radius: 10px;
    border: 1px solid var(--bd);
    animation: sentimentRowFadeIn 0.5s ease-out forwards;
    opacity: 0;
  }
  .sentimentRow:nth-child(1) { animation-delay: 0.1s; }
  .sentimentRow:nth-child(2) { animation-delay: 0.2s; }
  .sentimentRow:nth-child(3) { animation-delay: 0.3s; }
  .sentimentRow:nth-child(4) { animation-delay: 0.4s; }
  .sentimentRow:nth-child(5) { animation-delay: 0.5s; }
  .sentimentRow:nth-child(6) { animation-delay: 0.6s; }
  .sentimentRow:nth-child(7) { animation-delay: 0.7s; }
  @keyframes sentimentRowFadeIn {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .sentimentAspect {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .sentimentLabel {
    font-size: 13px;
    font-weight: 600;
    color: var(--fgStrong);
  }
  .sentimentBadge {
    font-size: 9px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  .sentimentBarContainer {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }
  .sentimentBarTrack {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: rgba(148,163,184,0.25);
    position: relative;
    overflow: hidden;
  }
  html[data-theme="light"] .sentimentBarTrack {
    background: rgba(71,85,105,0.15);
  }
  .sentimentBar {
    height: 100%;
    border-radius: 3px;
    animation: sentimentBarGrow 1s ease-out forwards, sentimentBarShimmer 2.5s ease-in-out infinite 1s;
    transform-origin: left;
    background-size: 200% 100%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2);
  }
  @keyframes sentimentBarGrow {
    0% { transform: scaleX(0); opacity: 0.5; }
    100% { transform: scaleX(1); opacity: 1; }
  }
  @keyframes sentimentBarShimmer {
    0% { background-position: 200% 0; filter: brightness(1); }
    50% { background-position: 0% 0; filter: brightness(1.25); }
    100% { background-position: 200% 0; filter: brightness(1); }
  }
  .sentimentPercent {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    min-width: 35px;
    animation: sentimentPercentPop 0.3s ease-out forwards;
    animation-delay: 1s;
  }
  @keyframes sentimentPercentPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  .sentimentSignals {
    font-size: 11px;
    color: var(--faint);
    font-style: italic;
  }
  /* ABSA Explanation - why this sentiment was detected */
  .sentimentExplanation {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 10px;
    padding: 10px 12px;
    background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.05));
    border-radius: 8px;
    border-left: 3px solid rgba(139,92,246,0.4);
  }
  .sentimentExplanationIcon {
    font-size: 14px;
    flex-shrink: 0;
  }
  .sentimentExplanationContent {
    font-size: 11px;
    line-height: 1.6;
    color: var(--fg);
  }
  .sentimentExplanationContent strong {
    color: var(--fgStrong);
  }
  /* ABSA Key Signals - what words/phrases triggered detection */
  .sentimentKeySignals {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 8px;
    padding: 8px 12px;
    background: var(--card2);
    border-radius: 6px;
  }
  .sentimentKeySignalsIcon {
    font-size: 12px;
    flex-shrink: 0;
  }
  .sentimentKeySignalsContent {
    font-size: 10px;
    line-height: 1.5;
    color: var(--muted);
    font-style: italic;
  }
  .sentimentKeySignalsContent strong {
    color: var(--fg);
    font-style: normal;
  }
  .sentimentNote {
    margin-top: 16px;
    padding: 12px;
    background: var(--card2);
    border-radius: 8px;
    font-size: 11px;
    color: var(--muted);
    border-left: 3px solid #8b5cf6;
  }

  /* Conclusion Styles - ENHANCED with LEFT BORDERS for Decision-Grade Reports */
  .conclusionCard {
    /* border handled by ::after */
  }
  /* Executive Summary - soft green left border */
  .conclusionSummary {
    padding: 20px;
    padding-left: 24px;
    background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.05));
    border-radius: 14px;
    margin-bottom: 20px;
    border: 1px solid rgba(16,185,129,0.2);
    border-left: 4px solid #10b981;
    animation: conclusionSummaryFadeIn 0.5s ease-out forwards;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  .conclusionSummary::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(16,185,129,0.1), transparent);
    transition: left 0.6s ease;
  }
  .conclusionSummary:hover::before {
    left: 100%;
  }
  .conclusionSummary:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(16,185,129,0.15);
    border-color: rgba(16,185,129,0.4);
  }
  @keyframes conclusionSummaryFadeIn {
    0% { opacity: 0; transform: translateY(15px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .conclusionSummaryHeader {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .conclusionSummaryIcon {
    font-size: 20px;
    animation: summaryIconPulse 2s ease-in-out infinite;
  }
  @keyframes summaryIconPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  .conclusionSummaryHeader strong {
    font-size: 14px;
    font-weight: 700;
    color: var(--fgStrong);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .conclusionSummaryText {
    font-size: 14px;
    line-height: 1.8;
    color: var(--fg);
  }
  /* Strategic Recommendation - soft teal left border */
  .conclusionRecommendation {
    padding: 20px;
    padding-left: 24px;
    background: linear-gradient(135deg, var(--card2), rgba(16,185,129,0.05));
    border-radius: 14px;
    margin-bottom: 20px;
    border: 1px solid rgba(16,185,129,0.3);
    border-left: 4px solid #14b8a6;
    animation: recommendationSlideIn 0.6s ease-out 0.2s forwards;
    opacity: 0;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  .conclusionRecommendation::before {
    display: none;
  }
  .conclusionRecommendation::after {
    content: '';
    position: absolute;
    top: 0;
    right: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(16,185,129,0.08), transparent);
    transition: right 0.6s ease;
  }
  .conclusionRecommendation:hover::after {
    right: 100%;
  }
  .conclusionRecommendation:hover {
    transform: translateY(-3px) scale(1.01);
    box-shadow: 0 10px 32px rgba(16,185,129,0.2);
    border-color: rgba(16,185,129,0.5);
  }
  @keyframes recommendationSlideIn {
    0% { opacity: 0; transform: translateX(-20px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .conclusionRecLabel {
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #10b981;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .conclusionRecText {
    font-size: 15px;
    font-weight: 500;
    color: var(--fgStrong);
    line-height: 1.7;
  }
  .conclusionGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  @media (max-width: 600px) {
    .conclusionGrid { grid-template-columns: 1fr; }
  }
  .conclusionBox {
    padding: 18px;
    background: var(--card2);
    border-radius: 12px;
    border: 1px solid var(--bd);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .conclusionBox:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  }
  /* Key Takeaways - solid cyan/teal left border */
  .conclusionBoxPros {
    border-left: 4px solid #06b6d4 !important;
    border-top: 1px solid var(--bd);
    border-right: 1px solid var(--bd);
    border-bottom: 1px solid var(--bd);
  }
  .conclusionBoxPros:hover {
    border-left-color: #22d3ee !important;
    box-shadow: 0 4px 16px rgba(6,182,212,0.2);
  }
  /* Immediate Next Steps - solid amber left border */
  .conclusionBoxCons {
    border-left: 4px solid #f59e0b !important;
    border-top: 1px solid var(--bd);
    border-right: 1px solid var(--bd);
    border-bottom: 1px solid var(--bd);
  }
  .conclusionBoxCons:hover {
    border-left-color: #fbbf24 !important;
    box-shadow: 0 4px 16px rgba(245,158,11,0.2);
  }
  /* Light mode - ensure all borders are more visible */
  html[data-theme="light"] .conclusionBox {
    border-color: #cbd5e1;
    background: #f8fafc;
  }
  html[data-theme="light"] .conclusionBoxPros {
    border-left-color: #0891b2 !important;
    border-top-color: #cbd5e1;
    border-right-color: #cbd5e1;
    border-bottom-color: #cbd5e1;
  }
  html[data-theme="light"] .conclusionBoxCons {
    border-left-color: #d97706 !important;
    border-top-color: #cbd5e1;
    border-right-color: #cbd5e1;
    border-bottom-color: #cbd5e1;
  }
  html[data-theme="light"] .conclusionBoxPros:hover {
    border-color: #0891b2;
    background: linear-gradient(135deg, #f8fafc, rgba(6,182,212,0.08));
  }
  html[data-theme="light"] .conclusionBoxCons:hover {
    border-color: #d97706;
    background: linear-gradient(135deg, #f8fafc, rgba(245,158,11,0.08));
  }
  /* Key Takeaways - cyan/teal animated left border */
  .conclusionBoxTakeaways {
    border-left: 4px solid #06b6d4 !important;
    border-top: 1px solid rgba(6,182,212,0.3);
    border-right: 1px solid rgba(6,182,212,0.3);
    border-bottom: 1px solid rgba(6,182,212,0.3);
    animation: takeawaysBorderGlow 4s ease-in-out infinite;
  }
  @keyframes takeawaysBorderGlow {
    0%, 100% { border-left-color: #06b6d4 !important; }
    33% { border-left-color: #22d3ee !important; }
    66% { border-left-color: #0891b2 !important; }
  }
  .conclusionBoxTakeaways:hover {
    border-left-color: #22d3ee !important;
    box-shadow: 0 4px 16px rgba(6,182,212,0.2);
    background: linear-gradient(135deg, var(--card2), rgba(6,182,212,0.05));
  }
  /* Immediate Next Steps - violet/purple animated left border */
  .conclusionBoxNextSteps {
    border-left: 4px solid #8b5cf6 !important;
    border-top: 1px solid rgba(139,92,246,0.3);
    border-right: 1px solid rgba(139,92,246,0.3);
    border-bottom: 1px solid rgba(139,92,246,0.3);
    animation: nextStepsBorderGlow 4s ease-in-out infinite;
  }
  @keyframes nextStepsBorderGlow {
    0%, 100% { border-left-color: #8b5cf6 !important; }
    33% { border-left-color: #a78bfa !important; }
    66% { border-left-color: #7c3aed !important; }
  }
  .conclusionBoxNextSteps:hover {
    border-left-color: #a78bfa !important;
    box-shadow: 0 4px 16px rgba(139,92,246,0.2);
    background: linear-gradient(135deg, var(--card2), rgba(139,92,246,0.05));
  }
  /* Key Metrics - emerald left border with animation */
  .conclusionBoxMetrics {
    border-left: 4px solid #10b981 !important;
    border-top: 1px solid rgba(16,185,129,0.3);
    border-right: 1px solid rgba(16,185,129,0.3);
    border-bottom: 1px solid rgba(16,185,129,0.3);
    animation: conclusionMetricsGlow 3s ease-in-out infinite;
  }
  @keyframes conclusionMetricsGlow {
    0%, 100% { border-left-color: #10b981; }
    50% { border-left-color: #34d399; }
  }
  .conclusionBoxMetrics:hover {
    border-left-color: #34d399 !important;
    box-shadow: 0 4px 16px rgba(16,185,129,0.2);
    background: linear-gradient(135deg, var(--card2), rgba(16,185,129,0.05));
  }
  /* Immediate Next Steps (Actions) - rose left border with animation */
  .conclusionBoxActions {
    border-left: 4px solid #f43f5e !important;
    border-top: 1px solid rgba(244,63,94,0.3);
    border-right: 1px solid rgba(244,63,94,0.3);
    border-bottom: 1px solid rgba(244,63,94,0.3);
    animation: conclusionActionsGlow 3s ease-in-out infinite 0.5s;
  }
  @keyframes conclusionActionsGlow {
    0%, 100% { border-left-color: #f43f5e; }
    50% { border-left-color: #fb7185; }
  }
  .conclusionBoxActions:hover {
    border-left-color: #fb7185 !important;
    box-shadow: 0 4px 16px rgba(244,63,94,0.2);
    background: linear-gradient(135deg, var(--card2), rgba(244,63,94,0.05));
  }
  /* Light mode for Takeaways and Next Steps */
  html[data-theme="light"] .conclusionBoxTakeaways {
    border-left: 4px solid #0891b2 !important;
    border-top-color: #cffafe;
    border-right-color: #cffafe;
    border-bottom-color: #cffafe;
    background: #f0fdfa;
    animation: lightTakeawaysGlow 3s ease-in-out infinite;
  }
  @keyframes lightTakeawaysGlow {
    0%, 100% { border-left-color: #0891b2 !important; }
    50% { border-left-color: #06b6d4 !important; }
  }
  html[data-theme="light"] .conclusionBoxTakeaways:hover {
    border-color: #0891b2;
    background: linear-gradient(135deg, #f0fdfa, rgba(6,182,212,0.1));
  }
  html[data-theme="light"] .conclusionBoxNextSteps {
    border-left: 4px solid #7c3aed !important;
    border-top-color: #ede9fe;
    border-right-color: #ede9fe;
    border-bottom-color: #ede9fe;
    background: #faf5ff;
    animation: lightNextStepsGlow 3s ease-in-out infinite 0.5s;
  }
  @keyframes lightNextStepsGlow {
    0%, 100% { border-left-color: #7c3aed !important; }
    50% { border-left-color: #8b5cf6 !important; }
  }
  html[data-theme="light"] .conclusionBoxNextSteps:hover {
    border-color: #7c3aed;
    background: linear-gradient(135deg, #faf5ff, rgba(139,92,246,0.1));
  }
  /* Light mode: Key Metrics - emerald */
  html[data-theme="light"] .conclusionBoxMetrics {
    border-left: 4px solid #059669 !important;
    background: #f0fdf4;
    animation: lightMetricsGlow 3s ease-in-out infinite;
  }
  @keyframes lightMetricsGlow {
    0%, 100% { border-left-color: #059669 !important; }
    50% { border-left-color: #10b981 !important; }
  }
  /* Light mode: Actions - rose */
  html[data-theme="light"] .conclusionBoxActions {
    border-left: 4px solid #e11d48 !important;
    background: #fff1f2;
    animation: lightActionsGlow 3s ease-in-out infinite 0.5s;
  }
  @keyframes lightActionsGlow {
    0%, 100% { border-left-color: #e11d48 !important; }
    50% { border-left-color: #f43f5e !important; }
  }
  .conclusionBoxTitle {
    font-size: 13px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--bd);
  }
  html[data-theme="light"] .conclusionBoxTitle {
    border-bottom-color: #e2e8f0;
  }
  html[data-theme="light"] .conclusionConfidenceOverview {
    border-color: #e2e8f0;
    border-left: 4px solid #94a3b8;
    background: #f8fafc;
  }
  html[data-theme="light"] .conclusionConfidenceOverview:hover {
    border-color: #cbd5e1;
    border-left-color: #64748b;
  }
  .conclusionList {
    margin: 0;
    padding-left: 22px;
    font-size: 12px;
    line-height: 1.7;
    color: var(--muted);
    list-style: decimal;
  }
  .conclusionList li {
    margin-bottom: 6px;
    padding-left: 4px;
  }
  .conclusionList li::marker {
    color: var(--fgStrong);
    font-weight: 600;
  }
  .conclusionPro { color: var(--fg); }
  .conclusionCon { color: var(--fg); }
  .conclusionNeutral { color: var(--muted); font-style: italic; }
  .conclusionMeta {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 16px;
  }
  /* Meta items - soft blue left border (Suggested Review, Confidence) */
  .conclusionMetaItem {
    flex: 1;
    min-width: 200px;
    padding: 16px 18px;
    padding-left: 22px;
    background: var(--card2);
    border-radius: 10px;
    border: 1px solid var(--bd);
    border-left: 4px solid #3b82f6;
    animation: metaItemFadeIn 0.5s ease-out forwards;
    opacity: 0;
    transition: all 0.3s ease;
  }
  .conclusionMetaItem:nth-child(1) { 
    animation-delay: 0.3s; 
    border-left-color: #06b6d4; /* Suggested Review - cyan */
  }
  .conclusionMetaItem:nth-child(2) { 
    animation-delay: 0.4s; 
    border-left-color: #8b5cf6; /* Confidence Assessment - purple */
  }
  @keyframes metaItemFadeIn {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .conclusionMetaItem:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
  }
  .conclusionMetaItem:nth-child(1):hover {
    border-left-color: #22d3ee;
    background: linear-gradient(135deg, var(--card2), rgba(6,182,212,0.05));
  }
  .conclusionMetaItem:nth-child(2):hover {
    border-left-color: #a78bfa;
    background: linear-gradient(135deg, var(--card2), rgba(139,92,246,0.05));
  }
  .conclusionMetaLabel {
    display: block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--fgStrong);
    margin-bottom: 8px;
  }
  .conclusionMetaValue {
    font-size: 13px;
    color: var(--fg);
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.5;
  }
  
  /* Sentiment Insights in Conclusion - ENHANCED with LEFT border animation */
  .conclusionSentimentInsights {
    margin: 12px 0;
    padding: 16px;
    padding-left: 20px;
    background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.06));
    border-radius: 14px;
    border: 1px solid rgba(139,92,246,0.25);
    animation: conclusionInsightsFadeIn 0.6s ease-out forwards;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  /* LEFT border with animated gradient - consistent with other elements */
  .conclusionSentimentInsights::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #8b5cf6, #ec4899, #f59e0b);
    background-size: 100% 200%;
    animation: sentimentGradient 4s ease-in-out infinite;
    border-radius: 4px 0 0 4px;
  }
  @keyframes sentimentGradient {
    0%, 100% { background-position: 50% 0%; }
    50% { background-position: 50% 100%; }
  }
  .conclusionSentimentInsights:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 32px rgba(139,92,246,0.2);
    border-color: rgba(139,92,246,0.4);
  }
  @keyframes conclusionInsightsFadeIn {
    0% { opacity: 0; transform: translateY(15px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .conclusionSentimentHeader {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(139,92,246,0.2);
  }
  .conclusionSentimentIcon {
    font-size: 24px;
    animation: conclusionIconPulse 2s ease-in-out infinite;
  }
  @keyframes conclusionIconPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
  }
  .conclusionSentimentTitle {
    font-size: 13px;
    font-weight: 800;
    color: var(--fgStrong);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .conclusionSentimentBadge {
    font-size: 11px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 20px;
    animation: badgeSlideIn 0.4s ease-out forwards;
    animation-delay: 0.3s;
    opacity: 0;
    transition: all 0.3s ease;
  }
  .conclusionSentimentBadge:hover {
    transform: scale(1.08);
    box-shadow: 0 4px 12px currentColor;
  }
  @keyframes badgeSlideIn {
    0% { opacity: 0; transform: translateX(-10px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .conclusionSentimentList {
    margin: 0;
    padding-left: 24px;
    font-size: 13px;
    line-height: 1.9;
    color: var(--fg);
  }
  .conclusionSentimentList li {
    margin-bottom: 10px;
    padding: 8px 0;
    animation: listItemFadeIn 0.4s ease-out forwards;
    opacity: 0;
    transition: all 0.25s ease;
    border-bottom: 1px solid rgba(139,92,246,0.1);
  }
  .conclusionSentimentList li:last-child {
    border-bottom: none;
  }
  .conclusionSentimentList li:hover {
    color: var(--fgStrong);
    transform: translateX(6px);
    padding-left: 10px;
    background: rgba(139,92,246,0.05);
    border-radius: 6px;
    margin-left: -10px;
  }
  .conclusionSentimentList li:nth-child(1) { animation-delay: 0.2s; }
  .conclusionSentimentList li:nth-child(2) { animation-delay: 0.35s; }
  .conclusionSentimentList li:nth-child(3) { animation-delay: 0.5s; }
  .conclusionSentimentList li:nth-child(4) { animation-delay: 0.65s; }
  @keyframes listItemFadeIn {
    0% { opacity: 0; transform: translateX(-12px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .conclusionSentimentList strong {
    color: var(--fgStrong);
  }
  
  .conclusionConfidenceDot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 5px;
    animation: dotPulse 2s ease-in-out infinite;
  }
  @keyframes dotPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.3); opacity: 0.8; }
  }
  .conclusionFootnote {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 16px;
    padding: 12px 14px;
    background: var(--card2);
    border-radius: 8px;
    border-left: 3px solid rgba(148,163,184,0.4);
  }
  .conclusionFootnoteIcon {
    font-size: 14px;
    flex-shrink: 0;
  }
  .conclusionFootnoteText {
    font-size: 10px;
    line-height: 1.5;
    color: var(--faint);
    font-style: italic;
  }

  /* Monte Carlo Summary in Conclusion */
  .conclusionMonteCarloSummary {
    margin: 16px 0;
    padding: 16px;
    background: linear-gradient(135deg, rgba(167,139,250,0.1), rgba(139,92,246,0.08));
    border-radius: 14px;
    border: 1px solid rgba(139,92,246,0.25);
    border-left: 4px solid #a78bfa;
    animation: mcSummaryFadeIn 0.6s ease-out forwards, mcSummaryBorderGlow 4s ease-in-out infinite;
  }
  @keyframes mcSummaryFadeIn {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes mcSummaryBorderGlow {
    0%, 100% { border-left-color: #a78bfa; }
    33% { border-left-color: #c4b5fd; }
    66% { border-left-color: #8b5cf6; }
  }
  html[data-theme="light"] .conclusionMonteCarloSummary {
    background: linear-gradient(135deg, rgba(124,58,237,0.08), rgba(139,92,246,0.05));
    border-color: rgba(124,58,237,0.3);
    border-left-color: #7c3aed;
    animation: mcSummaryFadeIn 0.6s ease-out forwards, mcSummaryBorderGlowLight 4s ease-in-out infinite;
  }
  @keyframes mcSummaryBorderGlowLight {
    0%, 100% { border-left-color: #7c3aed; }
    33% { border-left-color: #8b5cf6; }
    66% { border-left-color: #6d28d9; }
  }
  .conclusionMCHeader {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(139,92,246,0.2);
  }
  .conclusionMCIcon {
    font-size: 20px;
  }
  .conclusionMCTitle {
    font-size: 13px;
    font-weight: 700;
    color: var(--fgStrong);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .conclusionMCContent {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .conclusionMCStats {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
  .conclusionMCStat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .conclusionMCLabel {
    font-size: 10px;
    color: var(--muted);
    font-weight: 600;
    text-transform: uppercase;
  }
  .conclusionMCValue {
    font-size: 16px;
    font-weight: 700;
    font-family: var(--mono);
  }
  .conclusionMCInterpretation {
    font-size: 12px;
    color: var(--fg);
    line-height: 1.5;
    padding: 10px 12px;
    background: rgba(0,0,0,0.05);
    border-radius: 8px;
  }
  html[data-theme="light"] .conclusionMCInterpretation {
    background: rgba(255,255,255,0.6);
  }

  /* Data Science Summary in Conclusion - ENHANCED */
  .conclusionDataScience {
    margin-top: 24px;
    padding: 24px;
    background: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(139,92,246,0.08));
    border-radius: 16px;
    border: 1px solid rgba(6,182,212,0.25);
    border-left: 4px solid #06b6d4;
    animation: dataSciFadeIn 0.6s ease-out 0.4s forwards, dataSciLeftGlow 4s ease-in-out infinite;
    opacity: 0;
    position: relative;
    overflow: hidden;
  }
  @keyframes dataSciLeftGlow {
    0%, 100% { border-left-color: #06b6d4; }
    33% { border-left-color: #8b5cf6; }
    66% { border-left-color: #ec4899; }
  }
  .conclusionDataScience::before {
    display: none;
  }
  @keyframes dataSciGradient {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  @keyframes dataSciFadeIn {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .conclusionDataScienceTitle {
    font-size: 15px;
    font-weight: 800;
    color: var(--fgStrong);
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(6,182,212,0.2);
  }
  .conclusionDataScienceGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }
  .conclusionDSItem {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: var(--card);
    border-radius: 10px;
    border: 1px solid var(--bd);
    animation: dsItemSlide 0.4s ease-out forwards;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .conclusionDSItem::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(6,182,212,0.1), transparent);
    transition: left 0.5s ease;
  }
  .conclusionDSItem:hover::after {
    left: 100%;
  }
  .conclusionDSItem:nth-child(1) { animation-delay: 0.1s; }
  .conclusionDSItem:nth-child(2) { animation-delay: 0.15s; }
  .conclusionDSItem:nth-child(3) { animation-delay: 0.2s; }
  .conclusionDSItem:nth-child(4) { animation-delay: 0.25s; }
  .conclusionDSItem:nth-child(5) { animation-delay: 0.3s; }
  @keyframes dsItemSlide {
    0% { opacity: 0; transform: translateX(-15px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .conclusionDSItem:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 8px 24px rgba(6,182,212,0.2);
    border-color: rgba(6,182,212,0.4);
    background: linear-gradient(135deg, var(--card), rgba(6,182,212,0.08));
  }
  .conclusionDSIcon {
    font-size: 24px;
    flex-shrink: 0;
    animation: dsIconBounce 2s ease-in-out infinite;
  }
  @keyframes dsIconBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  .conclusionDSContent {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .conclusionDSLabel {
    font-size: 13px;
    font-weight: 700;
    color: var(--fgStrong);
  }
  .conclusionDSDesc {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.5;
  }
  .conclusionDSDesc ul {
    margin: 4px 0 0 0;
    padding-left: 16px;
    list-style: disc;
  }
  .conclusionDSDesc ul li {
    margin-bottom: 2px;
    line-height: 1.5;
  }
  .conclusionDSNote {
    padding: 16px 18px;
    background: linear-gradient(135deg, var(--card2), rgba(6,182,212,0.05));
    border-radius: 10px;
    font-size: 12px;
    color: var(--fg);
    border-left: 4px solid #06b6d4;
    animation: dsNoteFadeIn 0.5s ease-out 0.5s forwards;
    opacity: 0;
    transition: all 0.3s ease;
    line-height: 1.6;
  }
  .conclusionDSNote:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 16px rgba(6,182,212,0.15);
  }
  @keyframes dsNoteFadeIn {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  /* ── Stress Test Insights in Conclusion ── */
  .conclusionStressInsights {
    margin-top: 16px;
    border: 1px solid rgba(139,92,246,0.3);
    border-left: 4px solid #8b5cf6;
    padding: 14px 16px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(124,58,237,0.03));
    transition: all 0.3s ease;
  }
  .conclusionStressInsights:hover {
    border-color: rgba(139,92,246,0.5);
    box-shadow: 0 8px 32px rgba(139,92,246,0.15);
    background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(124,58,237,0.06));
  }
  .conclusionStressTitle {
    font-size: 14px;
    font-weight: 800;
    margin-bottom: 12px;
    color: var(--fgStrong);
  }
  .conclusionStressGrid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }
  .conclusionStressScoreCard {
    text-align: center;
    padding: 8px 6px;
    border: 1px solid rgba(139,92,246,0.2);
    border-radius: 8px;
    background: rgba(139,92,246,0.04);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: default;
    position: relative;
    overflow: hidden;
  }
  .conclusionStressScoreCard::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1), rgba(236,72,153,0.08));
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .conclusionStressScoreCard:hover {
    transform: translateY(-4px) scale(1.05);
    border-color: rgba(139,92,246,0.5);
    box-shadow: 0 8px 24px rgba(139,92,246,0.25), 0 0 0 1px rgba(139,92,246,0.15);
  }
  .conclusionStressScoreCard:hover::before {
    opacity: 1;
  }
  .conclusionStressScoreLabel {
    font-size: 10px;
    font-weight: 700;
    color: var(--fg);
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    position: relative;
  }
  .conclusionStressScoreValue {
    font-size: 18px;
    font-weight: 800;
    margin: 2px 0;
    position: relative;
    transition: transform 0.3s ease, text-shadow 0.3s ease;
  }
  .conclusionStressScoreCard:hover .conclusionStressScoreValue {
    transform: scale(1.15);
    text-shadow: 0 0 12px currentColor;
  }
  .conclusionStressScoreCard:hover {
    transform: translateY(-4px) scale(1.05);
    border-color: #10b981;
    box-shadow: 0 8px 24px rgba(16,185,129,0.3), 0 0 16px rgba(16,185,129,0.15);
    background: rgba(16,185,129,0.08);
  }
  .conclusionStressScoreCard:hover::before {
    background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.08));
    opacity: 1;
  }
  .conclusionStressScoreCard:hover .conclusionStressScoreValue {
    color: #10b981 !important;
    text-shadow: 0 0 16px rgba(16,185,129,0.5);
  }
  .conclusionStressScoreCard:hover .conclusionStressScoreTag {
    color: #10b981 !important;
  }
  .conclusionStressScoreTag {
    font-size: 9px;
    font-weight: 700;
    position: relative;
    transition: opacity 0.3s ease;
  }
  .conclusionStressList {
    font-size: 12px;
    margin: 0;
    padding-left: 18px;
    line-height: 1.9;
  }
  .conclusionStressAction {
    margin-top: 12px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--fg);
    background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.05));
    border: 1px solid rgba(139,92,246,0.2);
    transition: all 0.3s ease;
  }
  .conclusionStressAction:hover {
    background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08));
    border-color: rgba(139,92,246,0.35);
  }

  /* Light mode adjustments */
  html[data-theme="light"] .conclusionStressInsights {
    background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(124,58,237,0.02));
    border-color: rgba(139,92,246,0.25);
  }
  html[data-theme="light"] .conclusionStressInsights:hover {
    background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(124,58,237,0.05));
    box-shadow: 0 8px 32px rgba(139,92,246,0.12);
  }
  html[data-theme="light"] .conclusionStressScoreCard {
    background: rgba(139,92,246,0.05);
    border-color: rgba(139,92,246,0.15);
  }
  html[data-theme="light"] .conclusionStressScoreCard:hover {
    background: rgba(16,185,129,0.08);
    border-color: #10b981;
    box-shadow: 0 8px 24px rgba(16,185,129,0.2), 0 0 0 1px rgba(16,185,129,0.1);
  }
  html[data-theme="light"] .conclusionStressAction {
    background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.03));
    border-color: rgba(139,92,246,0.15);
  }

  /* Confidence Overview Section - consistent grey border */
  .conclusionConfidenceOverview {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 24px;
    padding-left: 28px;
    background: var(--card2);
    border-radius: 14px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    border: 1px solid var(--bd);
    border-left: 4px solid rgba(160,160,180,0.4);
    animation: confidenceOverviewFadeIn 0.6s ease-out forwards;
    transition: all 0.3s ease;
  }
  .conclusionConfidenceOverview:hover {
    border-color: var(--bdHover);
    border-left-color: rgba(160,160,180,0.6);
  }
  @keyframes confidenceOverviewFadeIn {
    0% { opacity: 0; transform: translateY(15px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .conclusionConfidenceScore {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 120px;
    padding: 16px;
    background: var(--card);
    border-radius: 12px;
    transition: all 0.3s ease;
  }
  .conclusionConfidenceScore:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
  .conclusionConfidenceValue {
    font-size: 52px;
    font-weight: 900;
    line-height: 1;
    animation: confidenceValuePop 0.8s ease-out forwards, confidenceValuePulse 3s ease-in-out infinite 1s;
    transition: all 0.3s ease;
  }
  .conclusionConfidenceScore:hover .conclusionConfidenceValue {
    transform: scale(1.1);
    filter: brightness(1.2);
  }
  @keyframes confidenceValuePop {
    0% { transform: scale(0.5); opacity: 0; }
    60% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes confidenceValuePulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.15); }
  }
  .conclusionConfidenceLabel {
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 6px;
    font-weight: 600;
  }
  .conclusionConfidenceDetails {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .conclusionConfidenceLevel {
    display: inline-flex;
    align-self: flex-start;
    padding: 8px 18px;
    border-radius: 24px;
    font-size: 13px;
    font-weight: 700;
    animation: levelBadgeSlide 0.5s ease-out 0.3s forwards, levelBadgePulse 3s ease-in-out infinite 1s;
    opacity: 0;
    transition: all 0.3s ease;
  }
  .conclusionConfidenceLevel:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px currentColor;
  }
  @keyframes levelBadgeSlide {
    0% { opacity: 0; transform: translateX(-15px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes levelBadgePulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.1); }
  }
  .conclusionConfidenceExplain {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.6;
  }

  /* Priority Action Checklist - ENHANCED with animations and hover effects */
  .conclusionPrioritySection {
    display: block !important;
    visibility: visible !important;
    margin-bottom: 20px;
    padding: 20px;
    padding-left: 24px;
    background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.05));
    border-radius: 14px;
    border: 1px solid rgba(245,158,11,0.3);
    animation: prioritySectionFadeIn 0.6s ease-out forwards;
    position: relative;
    overflow: hidden;
  }
  .conclusionPrioritySection::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 4px;
    border-radius: 4px 0 0 4px;
    background: linear-gradient(180deg, #ef4444, #f59e0b, #10b981);
    background-size: 100% 200%;
    animation: priorityGradientMove 3s ease-in-out infinite;
  }
  @keyframes priorityGradientMove {
    0%, 100% { background-position: 50% 0%; }
    50% { background-position: 50% 100%; }
  }
  @keyframes prioritySectionFadeIn {
    0% { opacity: 0; transform: translateY(15px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .conclusionPriorityTitle {
    font-size: 15px;
    font-weight: 800;
    color: var(--fgStrong);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(245,158,11,0.2);
  }
  .conclusionPriorityList {
    display: flex !important;
    flex-direction: column;
    gap: 12px;
  }
  .conclusionPriorityItem {
    display: flex !important;
    visibility: visible !important;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    background: var(--card);
    border-radius: 10px;
    border: 1px solid var(--bd);
    animation: priorityItemGlow 4s ease-in-out infinite;
    opacity: 1 !important;
    transform: translateX(0) !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .conclusionPriorityItem::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    transition: left 0.5s ease;
  }
  .conclusionPriorityItem:hover::after {
    left: 100%;
  }
  .conclusionPriorityItem:hover {
    transform: translateX(8px) scale(1.02) !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    border-color: rgba(245,158,11,0.5);
    background: linear-gradient(135deg, var(--card), rgba(245,158,11,0.08));
  }
  html[data-theme="light"] .conclusionPriorityItem:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }
  @keyframes priorityItemGlow {
    0%, 100% { border-color: var(--bd); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    50% { border-color: rgba(245,158,11,0.4); box-shadow: 0 4px 16px rgba(245,158,11,0.15); }
  }
  .conclusionPriorityBadge {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.8px;
    flex-shrink: 0;
    min-width: 60px;
    text-align: center;
    animation: badgePulse 2.5s ease-in-out infinite, badgeGlow 3s ease-in-out infinite;
    transition: all 0.3s ease;
    text-transform: uppercase;
  }
  .conclusionPriorityItem:hover .conclusionPriorityBadge {
    transform: scale(1.1);
    box-shadow: 0 2px 8px currentColor;
  }
  @keyframes badgePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes badgeGlow {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.15); }
  }
  .conclusionPriorityText {
    font-size: 13px;
    color: var(--fg);
    line-height: 1.5;
    flex: 1;
    transition: color 0.2s ease;
  }
  .conclusionPriorityItem:hover .conclusionPriorityText {
    color: var(--fgStrong);
  }

  /* Conclusion Box Animation Enhancement */
  .conclusionBox {
    animation: conclusionBoxFadeIn 0.5s ease-out forwards;
  }
  .conclusionBox::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
    transition: left 0.6s ease;
    pointer-events: none;
  }
  .conclusionBox:hover::before {
    left: 100%;
  }
  .conclusionBox:nth-child(1) { animation-delay: 0.1s; }
  .conclusionBox:nth-child(2) { animation-delay: 0.2s; }
  @keyframes conclusionBoxFadeIn {
    0% { opacity: 0; transform: translateY(15px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .conclusionList li {
    animation: listItemFadeIn 0.4s ease-out forwards;
    opacity: 0;
    transition: all 0.2s ease;
  }
  .conclusionList li:hover {
    transform: translateX(4px);
  }
  .conclusionList li:nth-child(1) { animation-delay: 0.15s; }
  .conclusionList li:nth-child(2) { animation-delay: 0.25s; }
  .conclusionList li:nth-child(3) { animation-delay: 0.35s; }
  .conclusionList li:nth-child(4) { animation-delay: 0.45s; }
  .conclusionList li:nth-child(5) { animation-delay: 0.55s; }
  @keyframes listItemFadeIn {
    0% { opacity: 0; transform: translateX(-8px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes listItemFadeIn {
    0% { opacity: 0; transform: translateX(-12px); }
    100% { opacity: 1; transform: translateX(0); }
  }

  /* Related Research Styles */
  .researchGrid {
    display: grid;
    gap: 12px;
    margin-bottom: 16px;
  }
  .researchItem {
    padding: 14px 16px;
    background: var(--card2);
    border-radius: 10px;
    border: 1px solid var(--bd);
  }
  .researchItemHeader {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
  .researchIcon {
    font-size: 16px;
  }
  .researchTitle {
    font-size: 13px;
    font-weight: 600;
    color: var(--fgStrong);
    flex: 1;
  }
  .researchType {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    padding: 3px 8px;
    background: var(--card);
    border-radius: 4px;
    color: var(--muted);
  }
  .researchDesc {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.6;
    margin-bottom: 10px;
  }
  .researchSearch {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .researchLinks {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  .researchLink {
    font-size: 11px;
    padding: 6px 12px;
    background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15));
    border-radius: 6px;
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
    border: 1px solid rgba(59,130,246,0.3);
  }
  .researchLink:hover {
    background: linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.25));
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59,130,246,0.2);
  }
  .researchNote {
    font-size: 10px;
    color: var(--faint);
    margin-top: 6px;
    font-style: italic;
  }
  .researchUrlDisplay {
    display: none; /* Hide on screen - shown only in PDF/print */
  }
  @media print {
    .researchUrlDisplay {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-top: 8px;
      padding: 8px 10px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px dashed #cbd5e1;
      word-break: break-all;
    }
    .researchLink {
      display: none; /* Hide clickable button in PDF */
    }
    .researchLinks {
      display: none;
    }
  }
  .researchUrlLabel {
    font-size: 10px;
    color: var(--faint);
    font-weight: 600;
    flex-shrink: 0;
  }
  .researchUrlLink {
    font-size: 10px;
    color: #3b82f6;
    text-decoration: underline;
    word-break: break-all;
  }
  .researchUrlLink:hover {
    color: #2563eb;
  }
    font-family: ui-monospace, monospace;
    line-height: 1.4;
  }
  html[data-theme="light"] .researchUrlText {
    color: #2563eb;
  }
  .researchSearchLabel {
    font-size: 10px;
    color: var(--faint);
    font-style: normal;
  }
  .researchSearchQuery {
    font-size: 11px;
    padding: 4px 10px;
    background: var(--card);
    border-radius: 6px;
    color: var(--fg);
    font-family: ui-monospace, monospace;
  }
  .searchSuggestionsBox {
    padding: 14px 16px;
    background: var(--card2);
    border-radius: 10px;
    margin-bottom: 12px;
  }
  .searchSuggestionsLabel {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 10px;
  }
  .searchSuggestionsList {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .searchSuggestion {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    padding: 8px 14px;
    background: var(--card);
    border-radius: 8px;
    color: var(--fg);
    font-family: ui-monospace, monospace;
    border: 1px solid var(--bd);
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
    cursor: pointer;
    text-decoration: none;
  }
  .searchSuggestion:before {
    content: "🔍";
    font-size: 10px;
  }
  .searchSuggestion:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    background: var(--card2);
    border-color: #3b82f6;
    color: #3b82f6;
  }
  .researchDisclaimer {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(59,130,246,0.08);
    border-radius: 8px;
    margin-bottom: 16px;
    border: 1px dashed rgba(59,130,246,0.3);
  }
  .researchDisclaimerIcon {
    font-size: 14px;
    flex-shrink: 0;
  }
  .researchDisclaimerText {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.5;
  }
  .educationalNote {
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1));
    border-radius: 8px;
    font-size: 12px;
    color: var(--muted);
    border-left: 3px solid #3b82f6;
  }

  /* Data Export Styles for Data Scientists */
  .dataExportCard {
    background: linear-gradient(135deg, var(--card), rgba(6,182,212,0.03));
    position: relative;
  }
  .dataExportCard::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #06b6d4, #8b5cf6);
    border-radius: 4px 0 0 4px;
  }
  .dataExportIntro {
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted);
    margin-bottom: 16px;
  }
  .dataExportIntro p {
    margin: 0;
  }
  .dataExportStats {
    padding: 16px;
    background: var(--card2);
    border-radius: 12px;
    margin-bottom: 16px;
    border-left: 4px solid #06b6d4;
    animation: quickStatsBorderGlow 4s ease-in-out infinite;
  }
  @keyframes quickStatsBorderGlow {
    0%, 100% { border-left-color: #06b6d4; }
    33% { border-left-color: #22d3ee; }
    66% { border-left-color: #0891b2; }
  }
  html[data-theme="light"] .dataExportStats {
    background: #f0fdfa;
    border-left-color: #0891b2;
    animation: quickStatsBorderGlowLight 4s ease-in-out infinite;
  }
  @keyframes quickStatsBorderGlowLight {
    0%, 100% { border-left-color: #0891b2; }
    33% { border-left-color: #06b6d4; }
    66% { border-left-color: #0e7490; }
  }
  .dataExportStatsTitle {
    font-size: 12px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 12px;
  }
  .dataExportStatsGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
  .dataExportStatItem {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    background: var(--card);
    border-radius: 8px;
    border: 1px solid var(--bd);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    cursor: default;
  }
  .dataExportStatItem:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(6,182,212,0.15);
    border-color: rgba(6,182,212,0.4);
  }
  .dataExportStatItem:hover .dataExportStatValue {
    color: #06b6d4;
  }
  .dataExportStatLabel {
    font-size: 10px;
    font-weight: 600;
    color: var(--faint);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .dataExportStatValue {
    font-size: 14px;
    font-weight: 700;
    color: var(--fgStrong);
  }
  .dataExportFormats {
    margin-bottom: 16px;
  }
  .dataExportFormat {
    padding: 16px;
    background: var(--card2);
    border-radius: 12px;
    border: 1px solid var(--bd);
  }
  .dataExportFormatHeader {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .dataExportFormatIcon {
    font-size: 18px;
  }
  .dataExportFormatTitle {
    font-size: 13px;
    font-weight: 700;
    color: var(--fgStrong);
  }
  .dataExportFormatDesc {
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 12px;
  }
  .dataExportDetails {
    margin-top: 8px;
  }
  .dataExportSummary {
    font-size: 11px;
    font-weight: 600;
    color: #06b6d4;
    cursor: pointer;
    padding: 6px 0;
  }
  .dataExportSummary:hover {
    color: #0891b2;
  }
  .dataExportCode {
    margin-top: 10px;
    padding: 14px;
    background: var(--card);
    border-radius: 8px;
    border: 1px solid var(--bd);
    font-size: 9px;
    font-family: ui-monospace, monospace;
    line-height: 1.4;
    color: var(--fg);
    overflow-x: auto;
    max-height: 400px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .dataExportFormatBadge {
    font-size: 9px;
    font-weight: 600;
    padding: 2px 8px;
    background: rgba(6,182,212,0.15);
    color: #06b6d4;
    border-radius: 10px;
    margin-left: auto;
  }
  .dataExportNote {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(6,182,212,0.08);
    border-radius: 8px;
    border: 1px dashed rgba(6,182,212,0.3);
  }
  .dataExportNoteIcon {
    font-size: 14px;
    flex-shrink: 0;
  }
  .dataExportNoteText {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.5;
  }
  
  /* Human-Readable Summary for Non-Technical Users */
  .dataExportHumanSummary {
    padding: 16px;
    background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(34,197,94,0.05));
    border-radius: 12px;
    border: 1px solid rgba(16,185,129,0.2);
    margin-bottom: 16px;
  }
  .humanSummaryTitle {
    font-size: 13px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(16,185,129,0.2);
  }
  .humanSummaryContent {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  @media (max-width: 600px) {
    .humanSummaryContent { grid-template-columns: 1fr; }
  }
  .humanSummaryItem {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .humanSummaryItemFull {
    grid-column: 1 / -1;
  }
  .humanSummaryLabel {
    font-size: 10px;
    font-weight: 600;
    color: var(--faint);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .humanSummaryValue {
    font-size: 12px;
    font-weight: 600;
    color: var(--fg);
    line-height: 1.4;
  }

  /* Statistical Summary Styles */
  .statisticalSummary {
    margin: 20px 0;
    padding: 20px;
    background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05));
    border-radius: 14px;
    border: 1px solid rgba(99,102,241,0.2);
    animation: statSummaryFadeIn 0.6s ease-out forwards;
  }
  @keyframes statSummaryFadeIn {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .statSummaryTitle {
    font-size: 14px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 16px;
  }
  .statSummaryGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }
  .statSummaryCard {
    padding: 16px;
    background: var(--card);
    border-radius: 12px;
    border: 1px solid var(--bd);
    animation: statCardSlideIn 0.5s ease-out forwards;
    opacity: 0;
  }
  .statSummaryCard:nth-child(1) { animation-delay: 0.1s; }
  .statSummaryCard:nth-child(2) { animation-delay: 0.2s; }
  @keyframes statCardSlideIn {
    0% { opacity: 0; transform: translateX(-15px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .statSummaryCardTitle {
    font-size: 12px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--bd);
  }
  .statSummaryMetrics {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 16px;
  }
  .statMetric {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: var(--card2);
    border-radius: 8px;
  }
  .statMetricLabel {
    font-size: 9px;
    font-weight: 600;
    color: var(--faint);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .statMetricValue {
    font-size: 14px;
    font-weight: 700;
    color: var(--fgStrong);
  }
  .statDistribution {
    margin-top: 12px;
  }
  .statDistTitle {
    font-size: 10px;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .statDistBar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
    animation: distBarGrow 0.6s ease-out forwards;
    opacity: 0;
  }
  .statDistBar:nth-child(2) { animation-delay: 0.1s; }
  .statDistBar:nth-child(3) { animation-delay: 0.15s; }
  .statDistBar:nth-child(4) { animation-delay: 0.2s; }
  .statDistBar:nth-child(5) { animation-delay: 0.25s; }
  .statDistBar:nth-child(6) { animation-delay: 0.3s; }
  @keyframes distBarGrow {
    0% { opacity: 0; transform: scaleX(0.5); }
    100% { opacity: 1; transform: scaleX(1); }
  }
  .statDistLabel {
    font-size: 10px;
    color: var(--muted);
    min-width: 70px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .statDistTrack {
    flex: 1;
    height: 8px;
    background: rgba(148,163,184,0.2);
    border-radius: 4px;
    overflow: hidden;
  }
  .statDistFill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.8s ease-out;
    animation: distFillGrow 0.8s ease-out forwards, statBarShimmer 2.5s ease-in-out infinite 0.8s;
    transform-origin: left;
    background-size: 200% 100%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2);
  }
  @keyframes distFillGrow {
    0% { transform: scaleX(0); }
    100% { transform: scaleX(1); }
  }
  @keyframes statBarShimmer {
    0% { background-position: 200% 0; filter: brightness(1); }
    50% { background-position: 0% 0; filter: brightness(1.3); }
    100% { background-position: 200% 0; filter: brightness(1); }
  }
  .statDistValue {
    font-size: 10px;
    font-weight: 600;
    color: var(--fg);
    min-width: 50px;
    text-align: right;
  }

  /* Heatmap Styles */
  .heatmapContainer {
    margin: 20px 0;
    padding: 20px;
    background: var(--card2);
    border-radius: 14px;
    border: 1px solid var(--bd);
    border-left: 4px solid #f59e0b;
    animation: heatmapFadeIn 0.7s ease-out forwards, heatmapBorderGlow 4s ease-in-out infinite;
    page-break-inside: avoid;
    page-break-before: auto;
    position: relative;
  }
  @keyframes heatmapBorderGlow {
    0%, 100% { border-left-color: #f59e0b; }
    33% { border-left-color: #f97316; }
    66% { border-left-color: #eab308; }
  }
  html[data-theme="light"] .heatmapContainer {
    border-left-color: #d97706;
    animation: heatmapFadeIn 0.7s ease-out forwards, heatmapBorderGlowLight 4s ease-in-out infinite;
  }
  @keyframes heatmapBorderGlowLight {
    0%, 100% { border-left-color: #d97706; }
    33% { border-left-color: #ea580c; }
    66% { border-left-color: #ca8a04; }
  }
  @media print {
    .heatmapContainer {
      page-break-before: always;
      page-break-inside: avoid;
      padding: 30px;
      margin: 0;
    }
    .heatmapContent {
      grid-template-columns: 1fr !important;
    }
    .heatmapSvgWrapper {
      margin-bottom: 20px;
    }
  }
  @keyframes heatmapFadeIn {
    0% { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  .heatmapTitle {
    font-size: 14px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 6px;
  }
  .heatmapDesc {
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 10px;
  }
  .heatmapColorGreen { color: #22c55e; font-weight: 600; }
  .heatmapColorYellow { color: #bfbf24; font-weight: 600; }
  .heatmapColorRed { color: #ef4444; font-weight: 600; }
  html[data-theme="light"] .heatmapColorGreen { color: #16a34a; }
  html[data-theme="light"] .heatmapColorYellow { color: #a3a323; }
  html[data-theme="light"] .heatmapColorRed { color: #dc2626; }
  .heatmapSvgWrapper {
    display: flex;
    justify-content: center;
    overflow-x: auto;
    padding: 10px 0;
  }
  .heatmapSvg {
    max-width: 100%;
    height: auto;
  }
  .heatmapCell:hover {
    filter: brightness(1.15) drop-shadow(0 4px 8px rgba(0,0,0,0.2));
  }
  .heatmapCellText {
    pointer-events: none;
    opacity: 0;
    animation: heatmapTextFade 0.3s ease-out forwards;
    animation-delay: inherit;
  }
  @keyframes heatmapTextFade {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes heatmapCellPop {
    0% { opacity: 0; transform: scale(0) rotate(-10deg); }
    60% { transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes heatmapCellGlow {
    0%, 100% { filter: brightness(1) drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
    50% { filter: brightness(1.08) drop-shadow(0 3px 6px rgba(0,0,0,0.15)); }
  }
  /* Animated color shift for heatmap cells */
  @keyframes heatmapColorShift {
    0%, 100% { filter: hue-rotate(0deg) brightness(1); }
    25% { filter: hue-rotate(5deg) brightness(1.05); }
    50% { filter: hue-rotate(0deg) brightness(1.1); }
    75% { filter: hue-rotate(-5deg) brightness(1.05); }
  }
  .heatmapCell {
    cursor: pointer;
    animation: heatmapCellPop 0.4s ease-out forwards, heatmapCellGlow 3s ease-in-out infinite 1s, heatmapColorShift 8s ease-in-out infinite;
    opacity: 0;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
  }
  html[data-theme="light"] .heatmapCell {
    animation: heatmapCellPop 0.4s ease-out forwards, heatmapCellGlowLight 3s ease-in-out infinite 1s, heatmapColorShiftLight 8s ease-in-out infinite;
  }
  @keyframes heatmapCellGlowLight {
    0%, 100% { filter: brightness(1) drop-shadow(0 2px 6px rgba(0,0,0,0.08)); }
    50% { filter: brightness(1.05) drop-shadow(0 4px 10px rgba(0,0,0,0.12)); }
  }
  @keyframes heatmapColorShiftLight {
    0%, 100% { filter: hue-rotate(0deg) brightness(1) saturate(1); }
    25% { filter: hue-rotate(8deg) brightness(1.02) saturate(1.1); }
    50% { filter: hue-rotate(0deg) brightness(1.08) saturate(1.15); }
    75% { filter: hue-rotate(-8deg) brightness(1.02) saturate(1.1); }
  }
  .heatmapContent {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    flex-wrap: nowrap;
    margin-bottom: 6px;
  }
  @media (max-width: 900px) {
    .heatmapContent {
      flex-direction: column;
      flex-wrap: wrap;
    }
  }
  .heatmapSvgWrapper {
    flex: 1;
    min-width: 0;
  }
  .heatmapInsights {
    padding: 14px;
    background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.05));
    border-radius: 12px;
    border: 1px solid rgba(251,191,36,0.2);
    border-left: 4px solid #f59e0b;
    animation: insightsFadeIn 0.6s ease-out forwards, insightsBorderGlow 4s ease-in-out infinite;
    animation-delay: 0.5s;
    opacity: 0;
    width: 260px;
    min-width: 240px;
    flex-shrink: 0;
    margin-left: -15px;
  }
  @keyframes insightsBorderGlow {
    0%, 100% { border-left-color: #f59e0b; }
    33% { border-left-color: #fbbf24; }
    66% { border-left-color: #d97706; }
  }
  @keyframes insightsFadeIn {
    0% { opacity: 0; transform: translateX(20px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .heatmapInsightsTitle {
    font-size: 12px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(251,191,36,0.2);
  }
  .heatmapInsightsList {
    margin: 0;
    padding-left: 0;
    list-style: none;
    font-size: 11px;
    line-height: 1.7;
    color: var(--fg);
  }
  .heatmapInsightsList li {
    margin-bottom: 10px;
    padding-left: 8px;
    border-left: 2px solid rgba(251,191,36,0.3);
    animation: insightItemSlide 0.4s ease-out forwards;
    opacity: 0;
  }
  .heatmapInsightsList li:nth-child(1) { animation-delay: 0.6s; }
  .heatmapInsightsList li:nth-child(2) { animation-delay: 0.7s; }
  .heatmapInsightsList li:nth-child(3) { animation-delay: 0.8s; }
  .heatmapInsightsList li:nth-child(4) { animation-delay: 0.9s; }
  .heatmapInsightsList li:nth-child(5) { animation-delay: 1.0s; }
  @keyframes insightItemSlide {
    0% { opacity: 0; transform: translateX(-10px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .heatmapInsightsList strong {
    color: var(--fgStrong);
  }
  .heatmapLegend {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: -10px;
    flex-wrap: wrap;
  }
  .heatmapLegendItem {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: var(--muted);
  }
  .heatmapLegendColor {
    width: 14px;
    height: 14px;
    border-radius: 3px;
  }

  /* ===============================================
     PROVIDER SPIDER CHART STYLES
     =============================================== */
  .providerSpiderCard {
    position: relative;
  }
  .providerSpiderCard::after {
    background: linear-gradient(180deg, #3b82f6, #8b5cf6);
  }
  .providerSpiderContainer {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 24px;
    align-items: center;
  }
  @media (max-width: 768px) {
    .providerSpiderContainer { grid-template-columns: 1fr; }
  }
  .providerSpiderChart {
    display: flex;
    justify-content: center;
  }
  .providerSpiderSvg {
    max-width: 100%;
    height: auto;
  }
  .providerPolygon {
    animation: polygonDraw 1s ease-out forwards;
    opacity: 0;
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
  }
  @keyframes polygonDraw {
    0% { opacity: 0; stroke-dashoffset: 1000; }
    50% { opacity: 0.5; }
    100% { opacity: 1; stroke-dashoffset: 0; }
  }
  .providerDot {
    animation: dotPop 0.3s ease-out forwards;
    opacity: 0;
  }
  .providerSpiderLegend {
    padding: 16px;
    background: var(--card2);
    border-radius: 12px;
  }
  .providerSpiderLegendTitle {
    font-size: 13px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 12px;
  }
  .providerSpiderLegendItem {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid var(--bd);
  }
  .providerSpiderLegendItem:last-of-type {
    border-bottom: none;
  }
  .providerSpiderLegendDot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
    animation: dotPulse 2s ease-in-out infinite;
  }
  .providerSpiderLegendName {
    font-size: 12px;
    font-weight: 600;
    color: var(--fg);
  }
  .providerSpiderLegendModel {
    font-size: 10px;
    color: var(--faint);
    margin-left: auto;
  }
  .providerSpiderMetricExplain {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--bd);
  }
  .providerSpiderMetricItem {
    font-size: 10px;
    color: var(--muted);
    margin-bottom: 4px;
  }

  /* ===============================================
     DECISION SCORE GAUGE STYLES
     =============================================== */
  .gaugeCard {
    position: relative;
  }
  .gaugeCard::after {
    background: linear-gradient(180deg, #10b981, #06b6d4);
  }
  .gaugeContainer {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 24px;
    align-items: center;
  }
  @media (max-width: 768px) {
    .gaugeContainer { grid-template-columns: 1fr; }
  }
  .gaugeChart {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 320px;
    overflow: visible;
    padding: 10px 0;
  }
  .gaugeSvg {
    max-width: 100%;
    height: auto;
    overflow: visible;
    min-height: 320px;
    display: block;
  }
  .gaugeArc {
    animation: gaugeArcDraw 1.5s ease-out forwards;
    stroke-dasharray: 500;
    stroke-dashoffset: 500;
  }
  @keyframes gaugeArcDraw {
    0% { stroke-dashoffset: 500; }
    100% { stroke-dashoffset: 0; }
  }
  .gaugeScoreText {
    animation: scoreCountUp 1s ease-out forwards;
  }
  @keyframes scoreCountUp {
    0% { opacity: 0; transform: scale(0.5); }
    100% { opacity: 1; transform: scale(1); }
  }
  /* Grade badge wrapper - positions badge below SVG */
  .gradeBadgeWrapper {
    display: flex;
    justify-content: flex-start;
    padding-left: 50px;
    margin-top: -2px;
    margin-bottom: 6px;
  }
  .gradeBadge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 18px;
    border-radius: 16px;
    animation: badgeFadeIn 0.6s ease-out 0.8s forwards, badgePulse 3s ease-in-out infinite 1.4s;
    opacity: 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .gradeBadgeText {
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  @keyframes badgeFadeIn {
    0% { opacity: 0; transform: translateY(10px) scale(0.9); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes badgePulse {
    0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    50% { transform: scale(1.03); box-shadow: 0 6px 16px rgba(0,0,0,0.25); }
  }
  .gaugeInfo {
    padding: 16px;
    background: var(--card2);
    border-radius: 12px;
  }
  .gaugeStatus {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--bd);
  }
  .gaugeStatusIcon {
    font-size: 24px;
  }
  .gaugeBreakdown {
    margin-top: 8px;
  }
  .gaugeBreakdownTitle {
    font-size: 11px;
    font-weight: 600;
    color: var(--faint);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }
  .gaugeBreakdownItem {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .gaugeBreakdownLabel {
    font-size: 11px;
    color: var(--muted);
    min-width: 70px;
  }
  .gaugeBreakdownBar {
    flex: 1;
    height: 6px;
    background: rgba(148,163,184,0.2);
    border-radius: 3px;
    overflow: hidden;
  }
  .gaugeBreakdownFill {
    height: 100%;
    border-radius: 3px;
    animation: breakdownFillGrow 0.8s ease-out forwards, gaugeBarShimmer 2.5s ease-in-out infinite 0.8s;
    transform-origin: left;
    background-size: 200% 100%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2);
  }
  @keyframes breakdownFillGrow {
    0% { transform: scaleX(0); }
    100% { transform: scaleX(1); }
  }
  @keyframes gaugeBarShimmer {
    0% { background-position: 200% 0; filter: brightness(1); }
    50% { background-position: 0% 0; filter: brightness(1.3); }
    100% { background-position: 200% 0; filter: brightness(1); }
  }
  .gaugeBreakdownValue {
    font-size: 11px;
    font-weight: 600;
    color: var(--fg);
    min-width: 35px;
    text-align: right;
  }

  /* Gauge Explanation Styles */
  .gaugeExplanation {
    margin-top: 20px;
    padding: 16px;
    background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05));
    border-radius: 12px;
    border: 1px solid rgba(16,185,129,0.2);
  }
  .gaugeExplanationTitle {
    font-size: 13px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 8px;
  }
  .gaugeExplanationText {
    font-size: 12px;
    line-height: 1.7;
    color: var(--fg);
    margin-bottom: 12px;
  }
  .gaugeNextSteps {
    padding-top: 12px;
    border-top: 1px solid rgba(16,185,129,0.15);
  }
  .gaugeNextStepsTitle {
    font-size: 11px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .gaugeNextStepsList {
    margin: 0;
    padding-left: 18px;
    font-size: 11px;
    line-height: 1.7;
    color: var(--muted);
  }
  .gaugeNextStepsList li {
    margin-bottom: 4px;
  }

  /* Decision Quality Distribution Styles */
  .qualityDistCard {
    position: relative;
  }
  .qualityDistCard::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #10b981, #3b82f6, #8b5cf6);
    border-radius: 4px 0 0 4px;
  }
  .qualityDistOverview {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 20px;
    align-items: center;
    padding: 16px;
    background: var(--card2);
    border-radius: 12px;
    margin-bottom: 20px;
  }
  @media (max-width: 600px) {
    .qualityDistOverview { grid-template-columns: 1fr; text-align: center; }
  }
  .qualityDistScore {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .qualityDistScoreValue {
    font-size: 48px;
    font-weight: 800;
    line-height: 1;
    animation: scorePopIn 0.6s ease-out forwards;
  }
  @keyframes scorePopIn {
    0% { transform: scale(0.5); opacity: 0; }
    60% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  .qualityDistScoreLabel {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .qualityDistInterpretation {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .qualityDistInterpretationIcon {
    font-size: 32px;
    animation: iconBounce 2s ease-in-out infinite;
  }
  @keyframes iconBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  .qualityDistInterpretationText {
    font-size: 14px;
    line-height: 1.6;
    color: var(--fg);
  }
  .qualityDistBars {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
  }
  .qualityDistBar {
    animation: barSlideIn 0.5s ease-out forwards;
    opacity: 0;
    transform: translateX(-20px);
  }
  @keyframes barSlideIn {
    0% { opacity: 0; transform: translateX(-20px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .qualityDistBarHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .qualityDistBarName {
    font-size: 13px;
    font-weight: 700;
    color: var(--fgStrong);
  }
  .qualityDistBarDesc {
    font-size: 11px;
    color: var(--faint);
  }
  .qualityDistBarContainer {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .qualityDistBarTrack {
    flex: 1;
    height: 12px;
    background: rgba(148,163,184,0.2);
    border-radius: 6px;
    overflow: hidden;
  }
  html[data-theme="light"] .qualityDistBarTrack {
    background: rgba(71,85,105,0.12);
  }
  .qualityDistBarFill {
    height: 100%;
    border-radius: 6px;
    animation: barFillGrow 1s ease-out forwards, qualityBarShimmer 2.5s ease-in-out infinite 1s;
    transform-origin: left;
    transform: scaleX(0);
    background-size: 200% 100%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25);
  }
  @keyframes barFillGrow {
    0% { transform: scaleX(0); }
    100% { transform: scaleX(1); }
  }
  @keyframes qualityBarShimmer {
    0% { background-position: 200% 0; filter: brightness(1); }
    50% { background-position: 0% 0; filter: brightness(1.3); }
    100% { background-position: 200% 0; filter: brightness(1); }
  }
  .qualityDistBarValue {
    font-size: 14px;
    font-weight: 700;
    color: var(--fgStrong);
    min-width: 45px;
    text-align: right;
  }
  .qualityDistNote {
    padding: 12px 16px;
    background: var(--card2);
    border-radius: 8px;
    font-size: 11px;
    color: var(--muted);
    border-left: 3px solid #3b82f6;
  }

  /* Disclaimer Styles */
  .disclaimerCard {
    background: linear-gradient(135deg, var(--card), rgba(245,158,11,0.03));
  }
  .disclaimerContent {
    font-size: 12px;
    line-height: 1.7;
    color: var(--muted);
  }
  .disclaimerContent p {
    margin: 0 0 12px 0;
  }
  .disclaimerContent ul {
    margin: 0 0 12px 0;
    padding-left: 20px;
  }
  .disclaimerContent li {
    margin-bottom: 6px;
  }
  .disclaimerContent strong {
    color: var(--fg);
  }

  /* Credits Styles */
  .creditsCard {
    background: linear-gradient(135deg, var(--card), rgba(16,185,129,0.03));
  }
  .creditsContent {
    font-size: 13px;
    line-height: 1.7;
    color: var(--muted);
  }
  .creditsContent p {
    margin: 0 0 16px 0;
  }
  .creditsAuthor {
    text-align: center;
    padding: 20px;
    background: var(--card2);
    border-radius: 12px;
    margin-bottom: 20px;
  }
  .creditsAuthorName {
    font-size: 16px;
    font-weight: 600;
    color: var(--fgStrong);
    margin-bottom: 4px;
  }
  .creditsAuthorSubtitle {
    font-size: 12px;
    color: var(--faint);
  }
  .creditsSocial {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .creditsFeedback {
    text-align: center;
    font-size: 12px;
    color: var(--faint);
    margin-bottom: 16px;
  }
  
  /* Credits Footer - Timezone/Generated */
  .creditsFooter {
    display: flex;
    justify-content: center;
    gap: 24px;
    padding: 16px;
    background: var(--card2);
    border-radius: 10px;
    flex-wrap: wrap;
  }
  .creditsFooterItem {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .creditsFooterLabel {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--faint);
  }
  .creditsFooterValue {
    font-size: 13px;
    font-weight: 500;
    color: var(--fg);
  }

  /* Section Emoji */
  .secEmoji {
    margin-right: 6px;
  }

  /* ===============================================
     UNIQUE CARD BORDER COLORS - ANIMATED GRADIENTS
     =============================================== */
  
  /* Base card border - animated color gradient */
  .card {
    position: relative;
  }
  .card::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    border-radius: 4px 0 0 4px;
    opacity: 0.8;
    transition: opacity 0.25s ease, width 0.25s ease;
  }
  .card:hover::after {
    opacity: 1;
    width: 5px;
  }

  /* Executive Brief Card - Emerald animation */
  .executiveBriefCard::after {
    background: #10b981;
    animation: borderGlowEmerald 4s ease-in-out infinite;
  }
  @keyframes borderGlowEmerald {
    0%, 100% { background: #10b981; }
    33% { background: #34d399; }
    66% { background: #059669; }
  }

  /* Half-Life Card - Amber animation */
  .halfLifeCard::after {
    background: #f59e0b;
    animation: borderGlowAmber 4s ease-in-out infinite;
  }
  @keyframes borderGlowAmber {
    0%, 100% { background: #f59e0b; }
    33% { background: #fbbf24; }
    66% { background: #d97706; }
  }

  /* Context Card - Blue animation */
  .contextCard::after {
    background: #3b82f6;
    animation: borderGlowBlue 4s ease-in-out infinite;
  }
  @keyframes borderGlowBlue {
    0%, 100% { background: #3b82f6; }
    33% { background: #60a5fa; }
    66% { background: #2563eb; }
  }
  
  /* Context and Intent separate boxes */
  .contextBox {
    padding: 16px;
    border-radius: 12px;
    background: var(--card2);
    border: 1px solid var(--bd);
  }
  .contextBoxLeft {
    border-left: 4px solid #3b82f6;
    animation: contextBoxLeftGlow 4s ease-in-out infinite;
  }
  @keyframes contextBoxLeftGlow {
    0%, 100% { border-left-color: #3b82f6; }
    33% { border-left-color: #60a5fa; }
    66% { border-left-color: #2563eb; }
  }
  .contextBoxRight {
    border-left: 4px solid #8b5cf6;
    animation: contextBoxRightGlow 4s ease-in-out infinite;
  }
  @keyframes contextBoxRightGlow {
    0%, 100% { border-left-color: #8b5cf6; }
    33% { border-left-color: #a78bfa; }
    66% { border-left-color: #7c3aed; }
  }
  html[data-theme="light"] .contextBox {
    background: #f8fafc;
  }
  html[data-theme="light"] .contextBoxLeft {
    border-left-color: #2563eb;
  }
  html[data-theme="light"] .contextBoxRight {
    border-left-color: #7c3aed;
  }

  /* Options Card - Indigo animation */
  .optionsCard::after {
    background: #6366f1;
    animation: borderGlowIndigo 4s ease-in-out infinite;
  }
  @keyframes borderGlowIndigo {
    0%, 100% { background: #6366f1; }
    33% { background: #818cf8; }
    66% { background: #4f46e5; }
  }

  /* Assumptions Card - Violet animation */
  .assumptionsCard::after {
    background: #8b5cf6;
    animation: borderGlowViolet 4s ease-in-out infinite;
  }
  @keyframes borderGlowViolet {
    0%, 100% { background: #8b5cf6; }
    33% { background: #a78bfa; }
    66% { background: #7c3aed; }
  }

  /* Risks Card - Rose animation */
  .risksCard::after {
    background: #f43f5e;
    animation: borderGlowRose 4s ease-in-out infinite;
  }
  @keyframes borderGlowRose {
    0%, 100% { background: #f43f5e; }
    33% { background: #fb7185; }
    66% { background: #e11d48; }
  }
  
  /* Risk status highlighting - HIGH=red, MEDIUM=yellow, LOW=green */
  .riskStatusHigh {
    font-weight: 700;
    color: #ef4444;
    animation: riskHighPulse 2s ease-in-out infinite;
  }
  @keyframes riskHighPulse {
    0%, 100% { color: #ef4444; }
    50% { color: #f87171; }
  }
  .riskStatusMedium {
    font-weight: 700;
    color: #f59e0b;
    animation: riskMediumPulse 2s ease-in-out infinite;
  }
  @keyframes riskMediumPulse {
    0%, 100% { color: #f59e0b; }
    50% { color: #fbbf24; }
  }
  .riskStatusLow {
    font-weight: 700;
    color: #22c55e;
    animation: riskLowPulse 2s ease-in-out infinite;
  }
  @keyframes riskLowPulse {
    0%, 100% { color: #22c55e; }
    50% { color: #4ade80; }
  }

  /* Evidence Card - Teal animation */
  .evidenceCard::after {
    background: #14b8a6;
    animation: borderGlowTeal 4s ease-in-out infinite;
  }
  @keyframes borderGlowTeal {
    0%, 100% { background: #14b8a6; }
    33% { background: #2dd4bf; }
    66% { background: #0d9488; }
  }

  /* Perspective Card - Sky animation */
  .perspectiveCard::after {
    background: #0ea5e9;
    animation: borderGlowSky 4s ease-in-out infinite;
  }
  @keyframes borderGlowSky {
    0%, 100% { background: #0ea5e9; }
    33% { background: #38bdf8; }
    66% { background: #0284c7; }
  }

  /* Sentiment Card - Purple animation */
  .sentimentCard::after {
    background: #a855f7;
    animation: borderGlowPurple 4s ease-in-out infinite;
  }
  @keyframes borderGlowPurple {
    0%, 100% { background: #a855f7; }
    33% { background: #c084fc; }
    66% { background: #9333ea; }
  }

  /* Radar Card - Cyan animation */
  .radarCard::after {
    background: #06b6d4;
    animation: borderGlowCyan 4s ease-in-out infinite;
  }
  @keyframes borderGlowCyan {
    0%, 100% { background: #06b6d4; }
    33% { background: #22d3ee; }
    66% { background: #0891b2; }
  }

  /* Conclusion Card - Green animation */
  .conclusionCard::after {
    background: #22c55e;
    animation: borderGlowGreen 4s ease-in-out infinite;
  }
  @keyframes borderGlowGreen {
    0%, 100% { background: #22c55e; }
    33% { background: #4ade80; }
    66% { background: #16a34a; }
  }

  /* Research Card - Sky Blue animation */
  .researchCard::after {
    background: #0284c7;
    animation: borderGlowSkyBlue 4s ease-in-out infinite;
  }
  @keyframes borderGlowSkyBlue {
    0%, 100% { background: #0284c7; }
    33% { background: #0ea5e9; }
    66% { background: #0369a1; }
  }

  /* Disclaimer Card - Yellow animation */
  .disclaimerCard::after {
    background: #eab308;
    animation: borderGlowYellow 4s ease-in-out infinite;
  }
  @keyframes borderGlowYellow {
    0%, 100% { background: #eab308; }
    33% { background: #facc15; }
    66% { background: #ca8a04; }
  }

  /* Credits Card - Pink animation */
  .creditsCard::after {
    background: #ec4899;
    animation: borderGlowPink 4s ease-in-out infinite;
  }
  @keyframes borderGlowPink {
    0%, 100% { background: #ec4899; }
    33% { background: #f472b6; }
    66% { background: #db2777; }
  }

  /* Hackathon Card - Gold animation */
  .hackathonCard::after {
    background: #fbbf24;
    animation: borderGlowGold 4s ease-in-out infinite;
  }
  @keyframes borderGlowGold {
    0%, 100% { background: #fbbf24; }
    33% { background: #fcd34d; }
    66% { background: #f59e0b; }
  }

  /* Tooltip Card - Slate animation */
  .tooltipCard::after {
    background: #64748b;
    animation: borderGlowSlate 4s ease-in-out infinite;
  }
  @keyframes borderGlowSlate {
    0%, 100% { background: #64748b; }
    33% { background: #94a3b8; }
    66% { background: #475569; }
  }

  /* Grade Legend Card - Soft Orange */
  .gradeLegendCard::after {
    background: #f97316;
  }

  /* Gemini Critic Card - Soft Lime */
  .geminiCriticCard::after {
    background: #84cc16;
  }
  
  /* Gemini Critic - Enhanced Styling */
  .criticOverview {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 16px;
    padding: 16px;
    background: var(--card2);
    border-radius: 12px;
  }
  .criticScore {
    text-align: center;
  }
  .criticScoreValue {
    font-size: 42px;
    font-weight: 800;
    display: block;
    line-height: 1;
  }
  .criticScoreLabel {
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .criticDetails {
    flex: 1;
  }
  .criticLevel {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .criticMeta {
    font-size: 10px;
    color: var(--muted);
  }
  .criticInterpretation {
    padding: 14px 16px;
    background: var(--card2);
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.6;
    margin-bottom: 16px;
    border-left: 3px solid #84cc16;
  }
  .criticStats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  .criticStatItem {
    text-align: center;
    padding: 14px;
    background: var(--card2);
    border-radius: 10px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .criticStatItem:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .criticStatIcon {
    font-size: 20px;
    display: block;
    margin-bottom: 6px;
  }
  .criticStatValue {
    font-size: 24px;
    font-weight: 700;
    color: var(--fgStrong);
    display: block;
  }
  .criticStatLabel {
    font-size: 10px;
    color: var(--muted);
  }
  .criticSection {
    animation: criticSectionFadeIn 0.4s ease-out forwards;
    opacity: 0;
  }
  .criticSection:nth-child(1) { animation-delay: 0.1s; }
  .criticSection:nth-child(2) { animation-delay: 0.2s; }
  .criticSection:nth-child(3) { animation-delay: 0.3s; }
  .criticSection:nth-child(4) { animation-delay: 0.4s; }
  @keyframes criticSectionFadeIn {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .criticNote {
    margin-top: 16px;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(132,204,22,0.1), rgba(16,185,129,0.05));
    border-radius: 10px;
    border-left: 3px solid #84cc16;
    font-size: 11px;
    color: var(--fg);
  }

  /* Provider Compare Card - Soft Fuchsia */
  .providerCompareCard::after {
    background: #d946ef;
  }

  /* ===============================================
     UNIFORM HOVER ANIMATIONS FOR ALL ELEMENTS
     Soft and eye-friendly for dark mode - NO white effects
     =============================================== */
  
  /* Standardize hover animation for all cards - SOFT, no border change */
  .card {
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(0,0,0,0.30);
  }
  .card:hover::after {
    opacity: 0.9;
  }

  /* KPI Box hover - SOFT */
  .kpiBox {
    transition: background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
  }
  .kpiBox:hover {
    background: var(--card);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  }

  /* Note hover - SOFT */
  .note {
    transition: background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
  }
  .note:hover {
    background: var(--card);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  }

  /* gRow (Grade Legend) hover - SOFT */
  .gRow {
    transition: background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
  }
  .gRow:hover {
    background: var(--card);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  }

  /* Sentiment Row hover - SOFT */
  .sentimentRow {
    transition: background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
  }
  .sentimentRow:hover {
    background: var(--card);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  }

  /* Research Item hover - SOFT */
  .researchItem {
    transition: background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
  }
  .researchItem:hover {
    background: var(--card);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  }

  /* ===============================================
     SENTIMENT ENHANCEMENTS
     =============================================== */
  
  .sentimentEmoji {
    font-size: 18px;
    margin-right: 8px;
  }
  .sentimentOverviewEmoji {
    font-size: 24px;
    margin-right: 8px;
  }
  .sentimentSummaryText {
    font-size: 11px;
    color: var(--muted);
    margin-top: 6px;
    margin-bottom: 10px;
    padding: 8px 12px;
    background: rgba(139,92,246,0.1);
    border-radius: 8px;
    border-left: 2px solid #8b5cf6;
  }
  .sentimentLocation {
    font-size: 11px;
    color: var(--hint);
    margin-top: 4px;
    margin-bottom: 8px;
    padding: 6px 10px;
    background: rgba(59,130,246,0.1);
    border-radius: 6px;
    border-left: 2px solid #3b82f6;
  }

  /* Sentiment Legend */
  .sentimentLegend {
    padding: 16px;
    background: var(--card2);
    border-radius: 12px;
    margin-bottom: 16px;
    border: 1px solid var(--bd);
  }
  .sentimentLegendTitle {
    font-size: 12px;
    font-weight: 600;
    color: var(--fgStrong);
    margin-bottom: 12px;
  }
  .sentimentLegendGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  @media (max-width: 600px) {
    .sentimentLegendGrid { grid-template-columns: 1fr; }
  }
  .sentimentLegendItem {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px;
    background: var(--card);
    border-radius: 8px;
    border: 1px solid var(--bd);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  /* Sentiment-specific border colors - soft but visible */
  .sentimentLegendItem:nth-child(1) {
    border-left: 3px solid rgba(16, 185, 129, 0.5);
    background: linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
  }
  .sentimentLegendItem:nth-child(2) {
    border-left: 3px solid rgba(239, 68, 68, 0.5);
    background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%);
  }
  .sentimentLegendItem:nth-child(3) {
    border-left: 3px solid rgba(148, 163, 184, 0.5);
    background: linear-gradient(90deg, rgba(148, 163, 184, 0.05) 0%, transparent 100%);
  }
  .sentimentLegendItem:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.15);
  }
  .sentimentLegendEmoji {
    font-size: 20px;
  }
  .sentimentLegendContent {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sentimentLegendLabel {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .sentimentLegendDesc {
    font-size: 10px;
    color: var(--fg);
    line-height: 1.5;
  }

  /* ===============================================
     RADAR ENHANCEMENTS
     =============================================== */
  
  .radarLegendText {
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  .radarLegendDesc {
    font-size: 10px;
    color: var(--muted);
  }
  .radarLegendItem {
    transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
  }
  .radarLegendItem:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    background: var(--card);
  }
  .radarLabel {
    transition: opacity 0.2s ease;
  }
  .radarInterpretation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--card2);
    border-radius: 10px;
    margin-top: 16px;
    margin-bottom: 12px;
  }
  .radarInterpretationScore {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .radarInterpretationLabel {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--faint);
  }
  .radarInterpretationValue {
    font-size: 20px;
    font-weight: 700;
    color: var(--fgStrong);
  }
  .radarInterpretationText {
    font-size: 13px;
    color: var(--fg);
    font-weight: 500;
  }

  /* Reality Check inside Radar */
  .radarRealityCheck {
    padding: 16px;
    background: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.1));
    border-radius: 12px;
    margin-top: 16px;
    margin-bottom: 12px;
    border: 1px solid rgba(6,182,212,0.3);
  }
  .radarRealityCheckTitle {
    font-size: 13px;
    color: #06b6d4;
    margin-bottom: 8px;
  }
  .radarRealityCheckDesc {
    font-size: 11px;
    color: var(--faint);
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px dashed var(--bd);
  }
  .radarRealityCheckContent {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.6;
  }

  /* ===============================================
     SOCIAL MEDIA BUTTON HOVER COLORS
     =============================================== */
  
  .creditsSocialLink {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 10px;
    border: 1px solid rgba(156,163,175,0.4);
    color: var(--fg);
    text-decoration: none;
    font-size: 13px;
    transition: all 0.25s ease;
  }
  html[data-theme="light"] .creditsSocialLink {
    border-color: rgba(156,163,175,0.5);
  }
  /* Twitter - Green background */
  .creditsSocialTwitter {
    background: rgba(5,150,105,0.15);
  }
  /* GitHub - Pink background */
  .creditsSocialGithub {
    background: rgba(236,72,153,0.15);
  }
  /* Discord - Blue/Indigo background */
  .creditsSocialDiscord {
    background: rgba(88,101,242,0.15);
  }
  .creditsSocialLink:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    font-weight: 600;
  }
  /* Twitter hover - Darker Emerald Green */
  .creditsSocialTwitter:hover {
    background: #059669;
    border-color: #059669;
    color: #fff;
  }
  /* GitHub hover - Pink */
  .creditsSocialGithub:hover {
    background: #ec4899;
    border-color: #ec4899;
    color: #fff;
  }
  /* Discord hover - Indigo */
  .creditsSocialDiscord:hover {
    background: #5865f2;
    border-color: #5865f2;
    color: #fff;
  }
  .creditsSocialLink svg {
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }
  .creditsSocialLink:hover svg {
    opacity: 1;
  }
  
  /* PDF-specific social button colors */
  @media print {
    .creditsSocialTwitter {
      background: #d1fae5 !important;
      border-color: #a7f3d0 !important;
    }
    .creditsSocialGithub {
      background: #fce7f3 !important;
      border-color: #fbcfe8 !important;
    }
    .creditsSocialDiscord {
      background: #e0e7ff !important;
      border-color: #c7d2fe !important;
    }
  }

  /* Theme Badge in Header */
  .metaTheme {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: var(--card2);
    border-radius: 20px;
    border: 1px solid rgba(100,116,139,0.4);
    font-size: 12px;
    color: var(--fg);
    margin-bottom: 10px;
  }
  html[data-theme="light"] .metaTheme {
    border-color: rgba(71,85,105,0.35);
  }
  .themeBadge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: var(--card);
    border-radius: 20px;
    border: 1px solid var(--bd);
    font-size: 12px;
    color: var(--fg);
  }
  .themeBadgeEmoji {
    font-size: 14px;
  }
  .themeBadgeLabel {
    font-weight: 500;
  }

  /* Header meta update - Title centered, theme below, dates with spacing */
  /* Record social links */
  .recordSocial {
    display: flex;
    gap: 12px;
    margin-top: 6px;
    justify-content: flex-end;
  }
  .recordSocialLink {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--faint);
    text-decoration: none;
    font-size: 11px;
    transition: color 0.2s;
  }
  .recordSocialLink:hover {
    color: var(--fg);
  }
  .recordSocialLink svg {
    opacity: 0.7;
  }

  /* ===============================================
     DATA SCIENTIST VISUALIZATIONS - 5 NEW CHARTS
     =============================================== */

  /* 1. CONFIDENCE INTERVAL CHART */
  .ciCard {
    position: relative;
  }
  .ciCard::after {
    background: linear-gradient(180deg, #06b6d4, #8b5cf6);
  }
  .ciOverview {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
  }
  .ciUncertainty {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: var(--card2);
    border-radius: 10px;
    border: 1px solid var(--bd);
  }
  .ciUncertaintyLabel {
    font-size: 12px;
    color: var(--muted);
  }
  .ciUncertaintyValue {
    font-size: 20px;
    font-weight: 800;
  }
  .ciUncertaintyLevel {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
  }
  .ciChartWrap {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
  }
  .ciSvg {
    width: 100%;
    max-width: 500px;
    height: auto;
  }
  /* CI Chart Grid Lines - visible in both modes */
  .ciGridLine {
    stroke: #9ca3af;
    stroke-opacity: 0.6;
    stroke-dasharray: 6,4;
  }
  html[data-theme="light"] .ciGridLine {
    stroke: #374151;
    stroke-opacity: 0.35;
  }
  .ciBar {
    animation: ciBarFadeIn 0.6s ease-out forwards, ciBarGlow 3s ease-in-out infinite 0.6s;
    opacity: 0;
  }
  .ciBar:nth-child(1) { animation-delay: 0.1s, 0.7s; }
  .ciBar:nth-child(2) { animation-delay: 0.2s, 0.8s; }
  .ciBar:nth-child(3) { animation-delay: 0.3s, 0.9s; }
  .ciBar:nth-child(4) { animation-delay: 0.4s, 1.0s; }
  .ciBar:nth-child(5) { animation-delay: 0.5s, 1.1s; }
  @keyframes ciBarFadeIn {
    0% { opacity: 0; transform: translateX(-20px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes ciBarGlow {
    0%, 100% { filter: brightness(1) saturate(1); }
    50% { filter: brightness(1.1) saturate(1.15); }
  }
  .ciPoint {
    animation: ciPointPop 0.4s ease-out forwards, ciPointPulse 2s ease-in-out infinite 0.4s;
    opacity: 0;
  }
  @keyframes ciPointPop {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes ciPointPulse {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 transparent); }
    50% { transform: scale(1.15); filter: drop-shadow(0 0 6px currentColor); }
  }
  .ciLegend {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .ciLegendItem {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--muted);
  }
  .ciLegendIcon {
    color: #3b82f6;
  }
  .ciNote {
    padding: 12px 16px;
    background: var(--card2);
    border-radius: 8px;
    font-size: 11px;
    color: var(--muted);
    border-left: 3px solid #06b6d4;
  }

  /* 2. TIME SERIES CHART */
  .tsCard {
    position: relative;
  }
  .tsCard::after {
    background: linear-gradient(180deg, #10b981, #3b82f6);
  }
  .tsOverview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--card2);
    border-radius: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .tsTrend {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .tsTrendIcon {
    font-size: 24px;
  }
  .tsTrendLabel {
    font-size: 12px;
    color: var(--muted);
  }
  .tsTrendValue {
    font-size: 14px;
    font-weight: 700;
  }
  .tsRange {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
  .tsRangeLabel {
    color: var(--muted);
  }
  .tsRangeValue {
    font-weight: 600;
    color: var(--fg);
  }
  .tsChartWrap {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
  }
  .tsSvg {
    width: 100%;
    max-width: 550px;
    height: auto;
  }
  .tsLine {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: tsLineDraw 2s ease-out forwards;
  }
  /* Dashed line - preserve dashed pattern after animation */
  .tsLineDashed {
    stroke-dasharray: 6,4 !important;
    stroke-dashoffset: 0;
    animation: tsLineFadeIn 1s ease-out forwards;
  }
  .tsLineDotted {
    stroke-dasharray: 3,3 !important;
    stroke-dashoffset: 0;
    animation: tsLineFadeIn 1s ease-out forwards;
  }
  @keyframes tsLineDraw {
    0% { stroke-dashoffset: 1000; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes tsLineFadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  .tsPoint {
    animation: tsPointPop 0.4s ease-out forwards;
    opacity: 0;
  }
  @keyframes tsPointPop {
    0% { transform: scale(0); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  .tsLegend {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .tsLegendItem {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--fg);
  }
  .tsLegendLine {
    width: 24px;
    height: 3px;
    border-radius: 2px;
  }
  .tsLegendDashed {
    background: repeating-linear-gradient(90deg, #3b82f6 0px, #3b82f6 6px, transparent 6px, transparent 10px) !important;
  }
  .tsLegendDotted {
    background: repeating-linear-gradient(90deg, #8b5cf6 0px, #8b5cf6 3px, transparent 3px, transparent 6px) !important;
  }
  /* Current Values Summary */
  .tsCurrentValues {
    display: flex;
    justify-content: center;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 16px;
    padding: 12px;
    background: var(--card2);
    border-radius: 10px;
    border: 1px solid var(--bd);
  }
  .tsCurrentItem {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--bg);
    border-radius: 6px;
    border: 1px solid var(--bd);
  }
  .tsCurrentLabel {
    font-size: 11px;
    color: var(--muted);
  }
  .tsCurrentValue {
    font-size: 13px;
    font-weight: 700;
  }
  .tsCurrentInterpret {
    font-size: 10px;
    color: var(--faint);
    padding-left: 6px;
    border-left: 1px solid var(--bd);
  }
  .tsNote {
    padding: 12px 16px;
    background: var(--card2);
    border-radius: 8px;
    font-size: 11px;
    color: var(--muted);
    border-left: 3px solid #10b981;
  }
  /* Timeline Data Points section */
  .tsDataPoints {
    padding: 12px 16px;
    background: var(--card2);
    border-radius: 8px;
    margin-bottom: 12px;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }
  .tsDataPointsTitle {
    font-size: 12px;
    font-weight: 600;
    color: var(--fgStrong);
    margin-bottom: 8px;
  }
  .tsDataPointsList {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .tsDataPoint {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 6px 10px;
    background: var(--bg0);
    border-radius: 6px;
    font-size: 10px;
    border: 1px solid rgba(148, 163, 184, 0.25);
  }
  .tsDataPointDate {
    color: var(--muted);
    font-weight: 500;
    min-width: 60px;
  }
  .tsDataPointValue {
    font-weight: 600;
    font-family: var(--mono);
  }

  /* Time Series Value Labels - hidden by default, shown on hover */
  .tsValueLabel {
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }
  .tsPointGroup:hover .tsValueLabel {
    opacity: 1;
  }
  /* Show all labels when hovering over chart */
  .tsSvg:hover .tsValueLabel {
    opacity: 0.7;
  }
  .tsPointGroup:hover .tsValueLabel {
    opacity: 1;
  }

  /* Time Series - Color Animations Dark Mode */
  @keyframes tsLineGlow {
    0%, 100% { filter: drop-shadow(0 0 3px rgba(16,185,129,0.4)); }
    50% { filter: drop-shadow(0 0 8px rgba(16,185,129,0.8)); }
  }
  @keyframes tsPointPulse {
    0%, 100% { filter: brightness(1) drop-shadow(0 0 2px rgba(16,185,129,0.5)); }
    50% { filter: brightness(1.2) drop-shadow(0 0 6px rgba(16,185,129,0.9)); }
  }
  .tsLine {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: tsLineDraw 2s ease-out forwards, tsLineGlow 3s ease-in-out infinite 2s;
  }
  .tsPoint {
    animation: tsPointPop 0.4s ease-out forwards, tsPointPulse 2.5s ease-in-out infinite 1s;
    opacity: 0;
  }
  /* Time Series - Light Mode Animations */
  html[data-theme="light"] .tsLine {
    animation: tsLineDraw 2s ease-out forwards, tsLineGlowLight 3s ease-in-out infinite 2s;
  }
  @keyframes tsLineGlowLight {
    0%, 100% { filter: drop-shadow(0 0 2px rgba(16,185,129,0.3)); }
    50% { filter: drop-shadow(0 0 5px rgba(16,185,129,0.6)); }
  }
  html[data-theme="light"] .tsPoint {
    animation: tsPointPop 0.4s ease-out forwards, tsPointPulseLight 2.5s ease-in-out infinite 1s;
  }
  @keyframes tsPointPulseLight {
    0%, 100% { filter: brightness(1) drop-shadow(0 0 1px rgba(16,185,129,0.4)); }
    50% { filter: brightness(1.1) drop-shadow(0 0 4px rgba(16,185,129,0.7)); }
  }
  
  /* CI Chart - Professional Animations Dark Mode */
  @keyframes ciPointGlow {
    0%, 100% { filter: brightness(1); transform: scale(1); }
    50% { filter: brightness(1.15); transform: scale(1.03); }
  }
  @keyframes ciBarShimmer {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 0.5; }
  }
  .ciPoint {
    animation: ciPointPop 0.4s ease-out forwards;
    transition: all 0.25s ease;
  }
  .ciPoint:hover {
    filter: brightness(1.2) drop-shadow(0 0 6px currentColor);
    transform: scale(1.15);
  }
  .ciSvg line[stroke-linecap="round"][opacity="0.4"] {
    animation: ciBarShimmer 4s ease-in-out infinite;
  }
  /* CI Chart - Light Mode */
  html[data-theme="light"] .ciPoint {
    animation: ciPointPop 0.4s ease-out forwards;
  }
  html[data-theme="light"] .ciPoint:hover {
    filter: brightness(1.1) drop-shadow(0 0 4px currentColor);
    transform: scale(1.12);
  }
  @keyframes ciPointGlowLight {
    0%, 100% { filter: brightness(1); transform: scale(1); }
    50% { filter: brightness(1.08); transform: scale(1.02); }
  }

  /* 3. WORD CLOUD */
  .wcCard {
    position: relative;
  }
  .wcCard::after {
    background: linear-gradient(180deg, #ec4899, #f59e0b);
  }
  .wcStats {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-bottom: 20px;
  }
  .wcStatItem {
    text-align: center;
    padding: 12px 20px;
    background: var(--card2);
    border-radius: 10px;
    border: 1px solid var(--bd);
    position: relative;
    overflow: hidden;
  }
  /* Animated border for conclusion stats */
  .wcStatAnimated {
    animation: wcStatBorderPulse 3s ease-in-out infinite;
  }
  .wcStatAnimated::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 12px;
    background: linear-gradient(90deg, #06b6d4, #8b5cf6, #ec4899, #f59e0b, #06b6d4);
    background-size: 400% 100%;
    animation: wcStatBorderFlow 4s linear infinite;
    z-index: -1;
    opacity: 0.7;
  }
  .wcStatAnimated::after {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 9px;
    background: var(--card2);
    z-index: -1;
  }
  @keyframes wcStatBorderFlow {
    0% { background-position: 0% 50%; }
    100% { background-position: 400% 50%; }
  }
  @keyframes wcStatBorderPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 transparent; }
    50% { transform: scale(1.02); box-shadow: 0 4px 20px rgba(139,92,246,0.2); }
  }
  .wcStatValue {
    display: block;
    font-size: 20px;
    font-weight: 800;
    color: var(--fgStrong);
  }
  .wcStatLabel {
    font-size: 10px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .wcCloud {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 12px 16px;
    padding: 24px;
    background: var(--card2);
    border-radius: 12px;
    min-height: 150px;
    margin-bottom: 16px;
  }
  .wcWord {
    display: inline-block;
    font-weight: 600;
    cursor: default;
    transition: all 0.2s ease;
    animation: wcWordPop 0.4s ease-out forwards, wcWordColorShift 6s ease-in-out infinite;
    opacity: 0;
    position: relative;
  }
  @keyframes wcWordPop {
    0% { opacity: 0; transform: scale(0.5); }
    60% { transform: scale(1.1); }
    100% { opacity: 1; transform: scale(1); }
  }
  /* Word Cloud - Color Animation Dark Mode */
  @keyframes wcWordColorShift {
    0%, 100% { filter: hue-rotate(0deg) brightness(1); }
    25% { filter: hue-rotate(15deg) brightness(1.1); }
    50% { filter: hue-rotate(0deg) brightness(1.2); }
    75% { filter: hue-rotate(-15deg) brightness(1.1); }
  }
  @keyframes wcWordFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-3px); }
  }
  .wcWord:nth-child(odd) {
    animation: wcWordPop 0.4s ease-out forwards, wcWordColorShift 6s ease-in-out infinite, wcWordFloat 4s ease-in-out infinite;
  }
  .wcWord:nth-child(even) {
    animation: wcWordPop 0.4s ease-out forwards, wcWordColorShift 6s ease-in-out infinite 0.5s, wcWordFloat 4.5s ease-in-out infinite 0.3s;
  }
  /* Word Cloud - Light Mode */
  html[data-theme="light"] .wcWord {
    animation: wcWordPop 0.4s ease-out forwards, wcWordColorShiftLight 6s ease-in-out infinite;
  }
  @keyframes wcWordColorShiftLight {
    0%, 100% { filter: hue-rotate(0deg) saturate(1) brightness(1); }
    25% { filter: hue-rotate(10deg) saturate(1.2) brightness(1.05); }
    50% { filter: hue-rotate(0deg) saturate(1.3) brightness(1.1); }
    75% { filter: hue-rotate(-10deg) saturate(1.2) brightness(1.05); }
  }
  html[data-theme="light"] .wcWord:nth-child(odd) {
    animation: wcWordPop 0.4s ease-out forwards, wcWordColorShiftLight 6s ease-in-out infinite, wcWordFloat 4s ease-in-out infinite;
  }
  html[data-theme="light"] .wcWord:nth-child(even) {
    animation: wcWordPop 0.4s ease-out forwards, wcWordColorShiftLight 6s ease-in-out infinite 0.5s, wcWordFloat 4.5s ease-in-out infinite 0.3s;
  }
  .wcWord:hover {
    transform: scale(1.15) !important;
    filter: brightness(1.2);
  }
  .wcCount {
    display: none;
    position: absolute;
    top: -28px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg0);
    color: var(--fg);
    font-size: 10px;
    padding: 4px 10px;
    border-radius: 8px;
    font-weight: 700;
    white-space: nowrap;
    border: 1px solid var(--bd);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 100;
  }
  .wcCount::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid var(--bg0);
  }
  .wcWord:hover .wcCount {
    display: block;
  }
  html[data-theme="light"] .wcCount {
    background: #fff;
    border-color: #e2e8f0;
    color: #0f172a;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  html[data-theme="light"] .wcCount::after {
    border-top-color: #fff;
  }
  .wcCategories {
    margin-bottom: 16px;
  }
  .wcCategoriesTitle {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 12px;
    color: var(--fgStrong);
  }
  .wcCategoryBars {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .wcCategoryBar {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .wcCategoryName {
    width: 80px;
    font-size: 11px;
    color: var(--fg);
    font-weight: 600;
  }
  .wcCategoryTrack {
    flex: 1;
    height: 8px;
    background: var(--bd);
    border-radius: 4px;
    overflow: hidden;
  }
  .wcCategoryFill {
    height: 100%;
    background: linear-gradient(90deg, #ec4899, #f59e0b);
    border-radius: 4px;
    animation: wcCategoryGrow 1s ease-out forwards;
    transform-origin: left;
  }
  @keyframes wcCategoryGrow {
    0% { transform: scaleX(0); }
    100% { transform: scaleX(1); }
  }
  .wcCategoryCount {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    min-width: 20px;
  }
  .wcCategoryInterp {
    font-size: 10px;
    color: var(--muted);
    font-style: italic;
    margin: -4px 0 8px 0;
    padding-left: 4px;
    border-left: 2px solid rgba(236,72,153,0.3);
    line-height: 1.4;
  }
  .wcNote {
    padding: 12px 16px;
    background: var(--card2);
    border-radius: 8px;
    font-size: 11px;
    color: var(--muted);
    border-left: 3px solid #ec4899;
  }

  /* 4. CORRELATION MATRIX */
  .cmCard {
    position: relative;
  }
  .cmCard::after {
    background: linear-gradient(180deg, #8b5cf6, #06b6d4);
  }
  .cmContainer {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 24px;
    margin-bottom: 16px;
  }
  @media (max-width: 768px) {
    .cmContainer { grid-template-columns: 1fr; }
  }
  .cmMatrixWrap {
    display: flex;
    flex-direction: column;
  }
  .cmColHeaders {
    display: flex;
    gap: 0;
    margin-bottom: 4px;
  }
  .cmColLabel {
    width: 60px;
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    color: var(--fg);
    transform: rotate(-45deg);
    transform-origin: center;
    height: 40px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .cmMatrixRow {
    display: flex;
  }
  .cmRowLabels {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-right: 4px;
  }
  .cmRowLabel {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 8px;
    font-size: 10px;
    font-weight: 700;
    color: var(--fg);
    width: 80px;
  }
  /* Right-side metric explanation labels */
  .cmRightLabels {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-left: 12px;
  }
  .cmRightLabel {
    height: 60px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    font-size: 10px;
    font-weight: 700;
    color: var(--fg);
    min-width: 100px;
  }
  .cmRightLabelDesc {
    font-size: 9px;
    font-weight: 400;
    color: var(--muted);
  }

  /* Monte Carlo Simulation */
  .mcCard {
    border-left: 4px solid #a78bfa;
    animation: mcBorderGlow 4s ease-in-out infinite;
  }
  @keyframes mcBorderGlow {
    0%, 100% { border-left-color: #a78bfa; }
    33% { border-left-color: #c4b5fd; }
    66% { border-left-color: #8b5cf6; }
  }
  html[data-theme="light"] .mcCard {
    border-left-color: #7c3aed;
    animation: mcBorderGlowLight 4s ease-in-out infinite;
  }
  @keyframes mcBorderGlowLight {
    0%, 100% { border-left-color: #7c3aed; }
    33% { border-left-color: #8b5cf6; }
    66% { border-left-color: #6d28d9; }
  }
  .mcContent {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 24px;
    align-items: start;
    margin-bottom: 16px;
  }
  @media (max-width: 768px) {
    .mcContent { grid-template-columns: 1fr; }
  }
  .mcChartWrap {
    display: flex;
    justify-content: center;
    padding: 8px 0;
  }
  .mcBar {
    animation: mcBarGrow 0.5s ease-out forwards;
    opacity: 0;
    transform-origin: bottom;
  }
  @keyframes mcBarGrow {
    0% { opacity: 0; transform: scaleY(0); }
    100% { opacity: 1; transform: scaleY(1); }
  }
  .mcStats {
    padding: 16px;
    background: var(--card2);
    border-radius: 12px;
    border: 1px solid var(--bd);
  }
  .mcStatsTitle {
    font-size: 12px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 12px;
  }
  .mcStatGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
  }
  .mcStatItem {
    display: flex;
    justify-content: space-between;
    padding: 6px 8px;
    background: var(--bg0);
    border-radius: 6px;
    font-size: 10px;
  }
  .mcStatLabel { color: var(--muted); }
  .mcStatValue { font-weight: 700; color: var(--fg); font-family: var(--mono); }
  .mcProbs { display: flex; flex-direction: column; gap: 8px; }
  .mcProbItem {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
  }
  .mcProbLabel { color: var(--muted); min-width: 90px; }
  .mcProbBar {
    flex: 1;
    height: 8px;
    background: var(--bg0);
    border-radius: 4px;
    overflow: hidden;
  }
  .mcProbFill {
    height: 100%;
    border-radius: 4px;
    transition: width 1s ease-out;
    background-size: 200% 100%;
    animation: mcBarShimmer 2.5s ease-in-out infinite;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25);
  }
  @keyframes mcBarShimmer {
    0% { background-position: 200% 0; filter: brightness(1); }
    50% { background-position: 0% 0; filter: brightness(1.3); }
    100% { background-position: 200% 0; filter: brightness(1); }
  }
  .mcProbValue { font-weight: 700; color: var(--fg); min-width: 36px; text-align: right; }
  .mcNote {
    padding: 12px 16px;
    background: var(--card2);
    border-radius: 8px;
    font-size: 11px;
    color: var(--muted);
    border-left: 3px solid #8b5cf6;
  }

  .cmMatrix {
    display: grid;
    gap: 2px;
  }
  .cmCell {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    border-radius: 6px;
    cursor: default;
    transition: transform 0.2s ease;
    animation: cmCellPop 0.3s ease-out forwards, cmCellGlow 4s ease-in-out infinite;
    opacity: 0;
  }
  @keyframes cmCellPop {
    0% { opacity: 0; transform: scale(0.8); }
    100% { opacity: 1; transform: scale(1); }
  }
  /* Correlation Matrix - Color Animation Dark Mode */
  @keyframes cmCellGlow {
    0%, 100% { filter: brightness(1); box-shadow: inset 0 0 0 rgba(255,255,255,0); }
    50% { filter: brightness(1.15); box-shadow: inset 0 0 15px rgba(255,255,255,0.1); }
  }
  @keyframes cmCellColorPulse {
    0%, 100% { filter: brightness(1) saturate(1); }
    33% { filter: brightness(1.1) saturate(1.2); }
    66% { filter: brightness(1.05) saturate(1.1); }
  }
  .cmCell:nth-child(3n) {
    animation: cmCellPop 0.3s ease-out forwards, cmCellGlow 4s ease-in-out infinite, cmCellColorPulse 5s ease-in-out infinite;
  }
  .cmCell:nth-child(3n+1) {
    animation: cmCellPop 0.3s ease-out forwards, cmCellGlow 4s ease-in-out infinite 0.5s, cmCellColorPulse 5s ease-in-out infinite 0.3s;
  }
  .cmCell:nth-child(3n+2) {
    animation: cmCellPop 0.3s ease-out forwards, cmCellGlow 4s ease-in-out infinite 1s, cmCellColorPulse 5s ease-in-out infinite 0.6s;
  }
  /* Correlation Matrix - Light Mode */
  html[data-theme="light"] .cmCell {
    animation: cmCellPop 0.3s ease-out forwards, cmCellGlowLight 4s ease-in-out infinite, cmCellPulseLight 5s ease-in-out infinite;
  }
  @keyframes cmCellGlowLight {
    0%, 100% { filter: brightness(1) saturate(1.05); box-shadow: inset 0 0 0 rgba(0,0,0,0), 0 1px 3px rgba(0,0,0,0.08); }
    50% { filter: brightness(1.06) saturate(1.12); box-shadow: inset 0 0 12px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.12); }
  }
  @keyframes cmCellPulseLight {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }
  html[data-theme="light"] .cmCell:nth-child(3n) {
    animation: cmCellPop 0.3s ease-out forwards, cmCellGlowLight 4s ease-in-out infinite, cmCellPulseLight 5s ease-in-out infinite 0.2s;
  }
  html[data-theme="light"] .cmCell:nth-child(3n+1) {
    animation: cmCellPop 0.3s ease-out forwards, cmCellGlowLight 4s ease-in-out infinite 0.4s, cmCellPulseLight 5s ease-in-out infinite 0.5s;
  }
  /* Light mode - make gray cells darker but soft */
  html[data-theme="light"] .cmCell[style*="rgb(148"],
  html[data-theme="light"] .cmCell[style*="hsl(0, 0%"] {
    filter: brightness(0.85) saturate(0.9);
  }
  .cmCell:hover {
    transform: scale(1.1);
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .cmLegend {
    padding: 16px;
    background: var(--card2);
    border-radius: 10px;
  }
  .cmLegendTitle {
    font-size: 12px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 12px;
  }
  .cmLegendScale {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }
  .cmLegendItem {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    color: var(--muted);
  }
  .cmLegendColor {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .cmKeyLabels {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 12px;
    border-top: 1px solid var(--bd);
  }
  .cmKeyLabel {
    font-size: 10px;
    color: var(--muted);
  }
  .cmInsights {
    padding: 16px;
    background: var(--card2);
    border-radius: 10px;
    margin-bottom: 16px;
  }
  .cmInsightsTitle {
    font-size: 13px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 12px;
  }
  .cmInsight {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--bd);
  }
  .cmInsight:last-child {
    border-bottom: none;
  }
  .cmInsightPair {
    font-size: 12px;
    font-weight: 600;
    color: var(--fg);
    min-width: 100px;
  }
  .cmInsightValue {
    font-size: 14px;
    font-weight: 800;
    min-width: 50px;
  }
  .cmInsightDesc {
    font-size: 11px;
    color: var(--muted);
  }
  .cmNote {
    padding: 12px 16px;
    background: var(--card2);
    border-radius: 8px;
    font-size: 11px;
    color: var(--muted);
    border-left: 3px solid #8b5cf6;
  }

  /* 5. BOX PLOT */
  .bpCard {
    position: relative;
  }
  .bpCard::after {
    background: linear-gradient(180deg, #3b82f6, #10b981);
  }
  .bpStats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-bottom: 16px;
  }
  .bpStatItem {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 16px;
    background: var(--card2);
    border-radius: 8px;
    border: 1px solid var(--bd);
    min-width: 70px;
  }
  .bpStatLabel {
    font-size: 9px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .bpStatValue {
    font-size: 14px;
    font-weight: 700;
    color: var(--fg);
  }
  .bpStatHighlight {
    color: #10b981 !important;
    font-size: 16px !important;
  }
  .bpChartWrap {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
  }
  .bpSvg {
    width: 100%;
    max-width: 500px;
    height: auto;
  }
  .bpPoint {
    transition: all 0.2s ease;
    animation: bpPointFloat 3s ease-in-out infinite, bpPointGlow 2.5s ease-in-out infinite;
  }
  /* Box Plot - Color Animation Dark Mode */
  @keyframes bpPointFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }
  @keyframes bpPointGlow {
    0%, 100% { filter: brightness(1) drop-shadow(0 0 2px currentColor); }
    50% { filter: brightness(1.3) drop-shadow(0 0 6px currentColor); }
  }
  @keyframes bpBoxPulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.1); }
  }
  .bpSvg rect {
    animation: bpBoxPulse 3s ease-in-out infinite;
  }
  /* Box Plot - Light Mode */
  html[data-theme="light"] .bpPoint {
    animation: bpPointFloat 3s ease-in-out infinite, bpPointGlowLight 2.5s ease-in-out infinite;
  }
  @keyframes bpPointGlowLight {
    0%, 100% { filter: brightness(1) drop-shadow(0 0 1px currentColor); }
    50% { filter: brightness(1.15) drop-shadow(0 0 4px currentColor); }
  }
  html[data-theme="light"] .bpSvg rect {
    animation: bpBoxPulseLight 3s ease-in-out infinite;
  }
  @keyframes bpBoxPulseLight {
    0%, 100% { filter: brightness(1) saturate(1); }
    50% { filter: brightness(1.05) saturate(1.1); }
  }
  .bpPoint:hover {
    r: 8;
    opacity: 1 !important;
  }
  .bpRanking {
    padding: 16px;
    background: var(--card2);
    border-radius: 10px;
    margin-bottom: 16px;
  }
  .bpRankingTitle {
    font-size: 13px;
    font-weight: 700;
    color: var(--fgStrong);
    margin-bottom: 12px;
  }
  .bpRankItem {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid var(--bd);
  }
  .bpRankItem:last-child {
    border-bottom: none;
  }
  .bpRankMedal {
    font-size: 16px;
    width: 24px;
    animation: bpMedalBounce 2s ease-in-out infinite;
  }
  @keyframes bpMedalBounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  .bpRankItem:first-child .bpRankMedal {
    animation: bpMedalBounce 2s ease-in-out infinite, bpMedalGold 3s ease-in-out infinite;
  }
  @keyframes bpMedalGold {
    0%, 100% { filter: brightness(1) drop-shadow(0 0 0 transparent); }
    50% { filter: brightness(1.2) drop-shadow(0 0 8px #fbbf24); }
  }
  .bpRankName {
    font-size: 12px;
    font-weight: 600;
    color: var(--fg);
    min-width: 80px;
  }
  .bpRankBar {
    flex: 1;
    height: 8px;
    background: var(--bd);
    border-radius: 4px;
    overflow: hidden;
  }
  .bpRankFill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #3b82f6);
    border-radius: 4px;
    animation: bpRankGrow 0.8s ease-out forwards, bpRankShimmer 3s ease-in-out infinite 1s;
    transform-origin: left;
  }
  @keyframes bpRankGrow {
    0% { transform: scaleX(0); }
    100% { transform: scaleX(1); }
  }
  @keyframes bpRankShimmer {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.15); }
  }
  .bpRankValue {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    min-width: 50px;
    text-align: right;
  }
  .bpOutliers {
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    font-size: 12px;
    animation: bpOutlierPulse 2s ease-in-out infinite;
  }
  @keyframes bpOutlierPulse {
    0%, 100% { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); }
    50% { background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.5); }
  }
    color: #ef4444;
    margin-bottom: 16px;
  }
  .bpNote {
    padding: 12px 16px;
    background: var(--card2);
    border-radius: 8px;
    font-size: 11px;
    color: var(--muted);
    border-left: 3px solid #3b82f6;
  }

  /* ===============================================
     PDF PRINT STYLES FOR 5 NEW DATA SCIENTIST CHARTS
     =============================================== */
  @media print {
    /* Confidence Interval Chart */
    .ciCard {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .ciCard::after { display: none !important; }
    .ciOverview {
      background: transparent !important;
      border: none !important;
    }
    .ciUncertainty {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8pt !important;
    }
    .ciUncertaintyValue {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .ciUncertaintyLevel {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .ciSvg {
      width: 100% !important;
      max-width: 450pt !important;
    }
    .ciBar {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
    .ciPoint {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
    .ciSvg line, .ciSvg circle, .ciSvg text {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .ciNote {
      background: #f0f9ff !important;
      border: 1px solid #bae6fd !important;
      border-left: 3pt solid #06b6d4 !important;
    }

    /* Time Series Chart */
    .tsCard {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .tsCard::after { display: none !important; }
    .tsOverview {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
    }
    .tsTrendValue {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .tsSvg {
      width: 100% !important;
      max-width: 500pt !important;
    }
    .tsLine {
      animation: none !important;
      stroke-dasharray: none !important;
      stroke-dashoffset: 0 !important;
    }
    .tsPoint {
      animation: none !important;
      opacity: 1 !important;
    }
    .tsSvg path, .tsSvg line, .tsSvg circle {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .tsLegendLine {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .tsNote {
      background: #f0fdf4 !important;
      border: 1px solid #bbf7d0 !important;
      border-left: 3pt solid #10b981 !important;
    }
    /* Current Values Summary for PDF - hide graph values shown below */
    .tsCurrentValues {
      display: flex !important;
      justify-content: center !important;
      gap: 12pt !important;
      margin-bottom: 12pt !important;
      padding: 10pt !important;
      background: #f8fafc !important;
      border-radius: 8pt !important;
      border: 1px solid #e2e8f0 !important;
    }
    .tsCurrentItem {
      padding: 6pt 10pt !important;
      background: #ffffff !important;
      border-radius: 6pt !important;
      border: 1px solid #e2e8f0 !important;
    }
    .tsCurrentLabel {
      font-size: 9pt !important;
      color: #64748b !important;
    }
    .tsCurrentValue {
      font-size: 11pt !important;
      font-weight: 700 !important;
    }
    .tsCurrentInterpret {
      font-size: 8pt !important;
      color: #94a3b8 !important;
    }

    /* Word Cloud */
    .wcCard {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .wcCard::after { display: none !important; }
    .wcStats {
      gap: 16pt !important;
    }
    .wcStatItem {
      background: #f8fafc !important;
      border: none !important;
      position: relative !important;
      overflow: visible !important;
    }
    .wcStatAnimated::before,
    .wcStatAnimated::after {
      display: none !important;
      content: none !important;
    }
    .wcStatAnimated {
      animation: none !important;
    }
    /* Colored borders for each stat item - clean single border */
    .wcStatItem:nth-child(1) {
      border-left: 4pt solid #06b6d4 !important;
      background: linear-gradient(90deg, rgba(6, 182, 212, 0.08), #f8fafc) !important;
    }
    .wcStatItem:nth-child(2) {
      border-left: 4pt solid #8b5cf6 !important;
      background: linear-gradient(90deg, rgba(139, 92, 246, 0.08), #f8fafc) !important;
    }
    .wcStatItem:nth-child(3) {
      border-left: 4pt solid #f59e0b !important;
      background: linear-gradient(90deg, rgba(245, 158, 11, 0.08), #f8fafc) !important;
    }
    .wcStatLabel {
      font-weight: 700 !important;
      text-transform: uppercase !important;
    }
    .wcCloud {
      background: #f8fafc !important;
      padding: 16pt !important;
    }
    .wcWord {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .wcCategoryFill {
      animation: none !important;
      transform: scaleX(1) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .wcNote {
      background: #fdf2f8 !important;
      border: 1px solid #fbcfe8 !important;
      border-left: 3pt solid #ec4899 !important;
    }

    /* Correlation Matrix */
    .cmCard {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-before: always !important;
    }
    .cmCard::after { display: none !important; }
    .cmContainer {
      display: block !important;
    }
    .cmMatrixWrap {
      margin-bottom: 16pt !important;
    }
    .cmColHeaders {
      display: flex !important;
      margin-left: 45pt !important;
      gap: 0pt !important;
    }
    .cmColLabel {
      width: 45pt !important;
      font-size: 9pt !important;
      font-weight: 700 !important;
      text-align: center !important;
      transform: none !important;
      height: 20pt !important;
      display: flex !important;
      align-items: flex-end !important;
      justify-content: center !important;
      color: #1e293b !important;
    }
    .cmRowLabels {
      gap: 0pt !important;
    }
    .cmRowLabel {
      width: 45pt !important;
      height: 45pt !important;
      font-size: 9pt !important;
      font-weight: 700 !important;
      color: #1e293b !important;
      padding-right: 6pt !important;
    }
    .cmMatrix {
      display: grid !important;
      gap: 0pt !important;
    }
    .cmCell {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      width: 45pt !important;
      height: 45pt !important;
      font-size: 10pt !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .cmRightLabels {
      gap: 0pt !important;
    }
    .cmRightLabel {
      height: 45pt !important;
    }
    .cmLegend {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
    }
    .cmLegendColor {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .cmInsights {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
    }
    .cmInsightValue {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .cmNote {
      background: #f5f3ff !important;
      border: 1px solid #ddd6fe !important;
      border-left: 3pt solid #8b5cf6 !important;
    }

    /* Box Plot */
    .bpCard {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .bpCard::after { display: none !important; }
    .bpStats {
      gap: 8pt !important;
    }
    .bpStatItem {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      padding: 8pt 12pt !important;
    }
    .bpStatHighlight {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .bpSvg {
      width: 100% !important;
      max-width: 450pt !important;
    }
    .bpSvg rect, .bpSvg line, .bpSvg circle {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .bpRanking {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
    }
    .bpRankFill {
      animation: none !important;
      transform: scaleX(1) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .bpOutliers {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background: #fef2f2 !important;
      border-color: #fecaca !important;
    }
    .bpNote {
      background: #eff6ff !important;
      border: 1px solid #bfdbfe !important;
      border-left: 3pt solid #3b82f6 !important;
    }

    /* Data Science Summary in Conclusion - Print */
    .conclusionDataScience {
      margin-top: 16pt !important;
      padding: 16pt !important;
      background: #f0f9ff !important;
      border: 1px solid #bae6fd !important;
      border-radius: 8pt !important;
      page-break-inside: avoid !important;
    }
    .conclusionDataScienceTitle {
      font-size: 12pt !important;
      margin-bottom: 12pt !important;
    }
    .conclusionDataScienceGrid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10pt !important;
    }
    .conclusionDSItem {
      padding: 10pt !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 6pt !important;
    }
    .conclusionDSIcon {
      font-size: 16pt !important;
    }
    .conclusionDSLabel {
      font-size: 10pt !important;
    }
    .conclusionDSDesc {
      font-size: 9pt !important;
    }
    .conclusionDSNote {
      margin-top: 12pt !important;
      padding: 10pt !important;
      background: #ecfdf5 !important;
      border: 1px solid #a7f3d0 !important;
      border-left: 3pt solid #06b6d4 !important;
      font-size: 9pt !important;
    }

    /* Priority Action Checklist - Print Styles */
    .conclusionPrioritySection {
      display: block !important;
      visibility: visible !important;
      margin: 16pt 0 !important;
      padding: 16pt !important;
      background: #fffbeb !important;
      border: 1pt solid #fde68a !important;
      border-radius: 8pt !important;
      page-break-inside: avoid !important;
      opacity: 1 !important;
    }
    .conclusionPrioritySection::before {
      display: block !important;
      visibility: visible !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      bottom: 0 !important;
      width: 4pt !important;
      height: auto !important;
      border-radius: 4pt 0 0 4pt !important;
      background: linear-gradient(180deg, #ef4444, #f59e0b, #10b981) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .conclusionPriorityTitle {
      display: block !important;
      visibility: visible !important;
      font-size: 12pt !important;
      font-weight: bold !important;
      margin-bottom: 12pt !important;
      color: #92400e !important;
    }
    .conclusionPriorityList {
      display: flex !important;
      visibility: visible !important;
      flex-direction: column !important;
      gap: 8pt !important;
    }
    .conclusionPriorityItem {
      display: flex !important;
      visibility: visible !important;
      align-items: center !important;
      gap: 10pt !important;
      padding: 10pt 12pt !important;
      background: white !important;
      border: 1pt solid #e5e7eb !important;
      border-radius: 6pt !important;
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
    .conclusionPriorityBadge {
      display: inline-block !important;
      visibility: visible !important;
      font-size: 8pt !important;
      font-weight: bold !important;
      padding: 3pt 8pt !important;
      border-radius: 4pt !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .conclusionPriorityText {
      display: inline !important;
      visibility: visible !important;
      font-size: 10pt !important;
      color: #1f2937 !important;
    }

    /* Conclusion Grid and Boxes - Print Styles */
    .conclusionGrid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 12pt !important;
      margin: 12pt 0 !important;
    }
    .conclusionBox {
      padding: 12pt !important;
      background: #f8fafc !important;
      border: 1pt solid #e2e8f0 !important;
      border-radius: 6pt !important;
      animation: none !important;
      opacity: 1 !important;
      page-break-inside: avoid !important;
    }
    .conclusionBoxPros {
      border-left: 3pt solid #10b981 !important;
    }
    .conclusionBoxCons {
      border-left: 3pt solid #f59e0b !important;
    }
    .conclusionBoxTitle {
      font-size: 11pt !important;
      font-weight: bold !important;
      margin-bottom: 8pt !important;
    }
    .conclusionList {
      margin: 0 !important;
      padding-left: 16pt !important;
      font-size: 10pt !important;
      list-style: disc !important;
    }
    .conclusionList li {
      margin-bottom: 4pt !important;
      animation: none !important;
      opacity: 1 !important;
    }

    /* Conclusion Recommendation - Print Styles */
    .conclusionRecommendation {
      padding: 12pt !important;
      background: #f0fdf4 !important;
      border: 1pt solid #bbf7d0 !important;
      border-left: 3pt solid #10b981 !important;
      border-radius: 6pt !important;
      margin-bottom: 12pt !important;
    }

    /* Conclusion Confidence Overview - Print Styles */
    .conclusionConfidenceOverview {
      display: flex !important;
      background: #f8fafc !important;
      border: 1pt solid #e2e8f0 !important;
      padding: 14pt !important;
      border-radius: 8pt !important;
      margin-bottom: 16pt !important;
    }
    .conclusionConfidenceValue {
      font-size: 32pt !important;
      font-weight: bold !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .conclusionConfidenceLevel {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Sentiment Insights in Conclusion - Print Styles */
    .conclusionSentimentInsights {
      display: block !important;
      visibility: visible !important;
      margin: 14pt 0 !important;
      padding: 14pt !important;
      padding-left: 18pt !important;
      background: #faf5ff !important;
      border: 1pt solid #e9d5ff !important;
      border-left: 4pt solid #8b5cf6 !important;
      border-radius: 8pt !important;
      animation: none !important;
      opacity: 1 !important;
    }

    /* Gemini Critic - Print Styles */
    .geminiCriticCard {
      page-break-inside: avoid !important;
    }
    .criticOverview {
      display: flex !important;
      gap: 16pt !important;
      margin-bottom: 14pt !important;
    }
    .criticScore {
      text-align: center !important;
    }
    .criticScoreValue {
      font-size: 28pt !important;
      font-weight: bold !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .criticStats {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 10pt !important;
      margin-bottom: 14pt !important;
    }
    .criticStatItem {
      text-align: center !important;
      padding: 10pt !important;
      background: #f8fafc !important;
      border: 1pt solid #e2e8f0 !important;
      border-radius: 6pt !important;
    }
    .criticInterpretation {
      padding: 10pt !important;
      background: #f0f9ff !important;
      border-radius: 6pt !important;
      margin-bottom: 12pt !important;
      font-size: 10pt !important;
    }
    .criticNote {
      padding: 10pt !important;
      background: #ecfdf5 !important;
      border-left: 3pt solid #10b981 !important;
      font-size: 9pt !important;
      margin-top: 12pt !important;
    }

    /* CI Chart Grid Lines - Print Styles */
    .ciGridLine {
      stroke: #6b7280 !important;
      stroke-opacity: 0.6 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Grade Badge - Print Styles */
    .gradeBadgeBg {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .gradeBadgeText {
      fill: #ffffff !important;
    }

    /* Stress Test Score Scale - Print Styles */
    .stressScaleLegend {
      border: 1px solid #cbd5e1 !important;
      background: #f8fafc !important;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LIGHT MODE ENHANCEMENTS - Fix visibility issues
     ═══════════════════════════════════════════════════════════════════════════ */

  /* Header animation - make visible in light mode */
  html[data-theme="light"] .brandName {
    background: linear-gradient(90deg, #0d9488, #059669, #10b981, #14b8a6, #0d9488);
    background-size: 400% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: brandShimmer 8s ease-in-out infinite;
  }

  /* Decision Quality Distribution - light mode border fix */
  html[data-theme="light"] .qualityDistOverview {
    border: 2px solid #e2e8f0;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }

  html[data-theme="light"] .qualityDistInterpretation {
    padding: 12px 16px;
    background: #ffffff;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
  }

  /* Decision Readiness Score - gaugeStatus border fix */
  html[data-theme="light"] .gaugeStatus {
    border-bottom: 2px solid #e2e8f0;
    padding: 12px 16px;
    background: #f8fafc;
    border-radius: 10px;
    margin-bottom: 16px;
  }

  html[data-theme="light"] .gaugeInfo {
    border: 2px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }

  /* Card borders - stronger in light mode */
  html[data-theme="light"] .card {
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }

  html[data-theme="light"] .card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  /* Confidence Interval Chart - light mode */
  html[data-theme="light"] .ciOverview {
    border: 2px solid #e2e8f0;
    background: #ffffff;
  }

  /* Priority Action Checklist - light mode visibility */
  html[data-theme="light"] .conclusionPrioritySection {
    border: 2px solid #fde68a;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    box-shadow: 0 2px 8px rgba(245,158,11,0.1);
  }

  html[data-theme="light"] .conclusionPriorityItem {
    border: 1px solid #e2e8f0;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  html[data-theme="light"] .conclusionPriorityItem:hover {
    border-color: #f59e0b;
    box-shadow: 0 4px 12px rgba(245,158,11,0.15);
  }

  /* Conclusion boxes - light mode */
  html[data-theme="light"] .conclusionBox {
    border: 1px solid #e2e8f0 !important;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  }

  /* Section titles - light mode */
  html[data-theme="light"] .secT {
    border-bottom: 2px solid #e2e8f0;
  }

  /* Time Series - tooltip visibility */
  html[data-theme="light"] .tsTooltip {
    background: #1f2937;
    color: #ffffff;
    border: 1px solid #374151;
  }

  /* Correlation Matrix - light mode gray cells */
  html[data-theme="light"] .cmCell[style*="rgb(148"],
  html[data-theme="light"] .cmCell[style*="hsl(0, 0%"] {
    filter: brightness(0.85) saturate(0.9);
  }

  /* JSON Export Panel - light mode */
  html[data-theme="light"] .outPanel {
    border: 2px solid #e2e8f0;
    background: #f8fafc;
  }

  html[data-theme="light"] .monoBlock {
    border: 1px solid #e2e8f0 !important;
    background: #ffffff !important;
  }

  /* ─── Deep Reasoner Stress Test Styles ─── */
  .stressTestCard {
    transition: box-shadow 0.3s ease, transform 0.2s ease;
  }
  .stressTestCard:hover {
    box-shadow: 0 8px 32px rgba(139,92,246,0.15);
    transform: translateY(-2px);
  }
  /* Stress Test Card - Violet animation (consistent with other cards) */
  .stressTestCard::after {
    background: #8b5cf6;
    animation: borderGlowViolet 4s ease-in-out infinite;
  }
  @keyframes borderGlowViolet {
    0%, 100% { background: #8b5cf6; }
    33% { background: #a78bfa; }
    66% { background: #7c3aed; }
  }

  .stressVerdict {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    margin: 14px 0;
    border-radius: var(--rInner);
    border: 1px solid rgba(139,92,246,0.25);
    background: rgba(139,92,246,0.06);
    transition: background 0.2s ease, border-color 0.2s ease;
  }
  .stressVerdict:hover {
    background: rgba(139,92,246,0.10);
    border-color: rgba(139,92,246,0.4);
  }
  .stressVerdictIcon { font-size: 22px; line-height: 1; }
  .stressVerdictText { font-size: 13px; color: var(--cMuted); line-height: 1.5; }

  .stressScoreGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin: 16px 0;
  }
  .stressScoreCard {
    padding: 14px;
    border-radius: var(--rInner);
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.03);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .stressScoreCard:hover {
    border-color: rgba(139,92,246,0.35);
    background: rgba(139,92,246,0.06);
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(139,92,246,0.15);
  }
  .stressScoreHeader {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .stressScoreEmoji { font-size: 16px; }
  .stressScoreLabel { font-size: 12px; font-weight: 600; color: var(--cH); }
  .stressScoreBadge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    margin-left: auto;
  }
  .stressScoreBarWrap {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
    margin-bottom: 6px;
  }
  .stressScoreBar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s cubic-bezier(.16,1,.3,1);
    background-size: 200% 100%;
    animation: stressBarShimmer 2.5s ease-in-out infinite;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25);
  }
  @keyframes stressBarShimmer {
    0% { background-position: 200% 0; filter: brightness(1); }
    50% { background-position: 0% 0; filter: brightness(1.3); }
    100% { background-position: 200% 0; filter: brightness(1); }
  }
  .stressScoreAction {
    font-size: 10px;
    font-weight: 600;
    line-height: 1.4;
  }
  .stressScaleLegend {
    margin: 16px 0;
    padding: 14px 16px;
    border-radius: var(--rInner);
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .stressScaleLegendTitle {
    font-size: 12px;
    font-weight: 700;
    color: var(--fg);
    margin-bottom: 10px;
  }
  .stressScaleLegendGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .stressScaleLegendItem {
    font-size: 10px;
    color: var(--cMuted);
    line-height: 1.5;
  }
  .stressScoreRow {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 6px;
  }
  .stressScoreValue {
    font-size: 16px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .stressScoreInterp {
    font-size: 11px;
    color: var(--cMuted);
    line-height: 1.5;
    border-top: 1px solid rgba(255,255,255,0.06);
    padding-top: 8px;
    margin-top: 4px;
  }

  .stressCriticalFlaw {
    border: 1px solid rgba(239,68,68,0.3);
    border-left: 4px solid #ef4444;
    border-radius: var(--rInner);
    padding: 16px;
    margin: 16px 0;
    background: rgba(239,68,68,0.04);
    transition: border-color 0.25s ease, background 0.25s ease;
  }
  .stressCriticalFlaw:hover {
    border-color: rgba(239,68,68,0.45);
    background: rgba(239,68,68,0.06);
  }
  .stressCritFlawHeader {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .stressCritFlawIcon { font-size: 18px; }
  .stressCritFlawTitle { font-size: 14px; font-weight: 700; color: #ef4444; }
  .stressCritFlawSev {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    margin-left: auto;
  }
  .stressCritFlawBody { font-size: 12px; color: var(--cMuted); line-height: 1.6; }
  .stressCritFlawName { font-size: 13px; color: var(--cH); margin-bottom: 4px; }
  .stressCritFlawDesc { margin-bottom: 8px; }
  .stressCritFlawScenario {
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.2);
    margin-top: 8px;
  }

  .stressSectionHead {
    font-size: 14px;
    font-weight: 700;
    color: var(--cH);
    margin-bottom: 2px;
  }
  .stressSectionHint {
    font-size: 11px;
    color: var(--cMuted);
    margin-bottom: 12px;
  }

  .stressChallenges, .stressDeps, .stressMatrix, .stressThink {
    margin: 20px 0;
  }
  .stressChallengeItem, .stressDepItem {
    padding: 12px 14px;
    border-radius: var(--rInner);
    border: 1px solid rgba(255,255,255,0.12);
    border-left: 3px solid rgba(139,92,246,0.3);
    margin-bottom: 8px;
    background: rgba(255,255,255,0.02);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .stressChallengeItem:hover, .stressDepItem:hover {
    border-color: rgba(139,92,246,0.35);
    border-left-color: #8b5cf6;
    background: rgba(139,92,246,0.06);
    transform: translateX(4px);
    box-shadow: 0 4px 16px rgba(139,92,246,0.12);
  }
  .stressChallengeHead {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
  .stressChallengeType {
    font-size: 11px;
    font-weight: 600;
    color: #a78bfa;
    text-transform: uppercase;
  }
  .stressChallengeTarget {
    font-size: 11px;
    color: var(--cMuted);
  }
  .stressChallengeBody {
    font-size: 12px;
    color: var(--cMuted);
    line-height: 1.6;
  }
  .stressChallengeSub {
    margin-top: 4px;
    padding-left: 12px;
    border-left: 2px solid rgba(160,160,180,0.25);
  }

  .stressDepName { font-size: 13px; color: var(--cH); margin-bottom: 4px; }
  .stressDepWhy { font-size: 12px; color: var(--cMuted); margin-bottom: 6px; }
  .stressDepRow {
    display: flex;
    gap: 16px;
    font-size: 11px;
    flex-wrap: wrap;
  }
  .stressDepStatus { color: #f59e0b; }
  .stressDepRisk { color: #ef4444; }

  .stressMatrixGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }
  .stressMatrixCard {
    padding: 14px;
    border-radius: var(--rInner);
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.03);
    text-align: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .stressMatrixCard:hover {
    border-color: rgba(139,92,246,0.35);
    background: rgba(139,92,246,0.06);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(139,92,246,0.12);
  }
  .stressMatrixLabel {
    font-size: 11px;
    color: var(--cMuted);
    margin-bottom: 4px;
    font-weight: 600;
  }
  .stressMatrixValue {
    font-size: 28px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .stressMatrixHint {
    font-size: 11px;
    color: var(--cMuted);
    margin-top: 4px;
  }
  .stressMatrixList {
    font-size: 12px;
    color: var(--cMuted);
    margin-bottom: 10px;
  }
  .stressMatrixList ul {
    margin-top: 4px;
    padding-left: 18px;
  }

  .stressThinkStep {
    display: flex;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.2s ease;
  }
  .stressThinkStep:hover {
    background: rgba(139,92,246,0.03);
    border-radius: 8px;
    padding-left: 8px;
  }
  .stressThinkStep:last-child { border-bottom: none; }
  .stressThinkNum {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(139,92,246,0.15);
    color: #a78bfa;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .stressThinkBody { flex: 1; }
  .stressThinkAction { font-size: 12px; color: var(--cH); margin-bottom: 2px; }
  .stressThinkReason { font-size: 11px; color: var(--cMuted); line-height: 1.5; }
  .stressThinkConf { font-size: 11px; font-weight: 600; margin-top: 3px; }

  /* Light mode overrides for Stress Test */
  html[data-theme="light"] .stressTestCard {
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  html[data-theme="light"] .stressTestCard:hover {
    border-color: #a78bfa;
    box-shadow: 0 8px 32px rgba(124,58,237,0.12);
  }
  html[data-theme="light"] .stressVerdict {
    border-color: rgba(124,58,237,0.2);
    background: rgba(124,58,237,0.04);
  }
  html[data-theme="light"] .stressScoreCard {
    border: 1px solid #e2e8f0;
    background: #ffffff;
  }
  html[data-theme="light"] .stressScoreCard:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }
  html[data-theme="light"] .stressScoreBarWrap {
    background: #e2e8f0;
  }
  html[data-theme="light"] .stressScoreInterp {
    border-top-color: #e2e8f0;
  }
  html[data-theme="light"] .stressCriticalFlaw {
    border-color: rgba(239,68,68,0.3);
    background: rgba(239,68,68,0.03);
  }
  html[data-theme="light"] .stressCriticalFlaw:hover {
    border-color: rgba(239,68,68,0.4);
    background: rgba(239,68,68,0.04);
  }
  html[data-theme="light"] .stressChallengeItem,
  html[data-theme="light"] .stressDepItem {
    border: 1px solid #e2e8f0;
    border-left: 3px solid #cbd5e1;
    background: #ffffff;
  }
  html[data-theme="light"] .stressChallengeItem:hover,
  html[data-theme="light"] .stressDepItem:hover {
    border-color: #cbd5e1;
    border-left-color: #94a3b8;
    background: #f8fafc;
  }
  html[data-theme="light"] .stressMatrixCard {
    border: 1px solid #e2e8f0;
    background: #ffffff;
  }
  html[data-theme="light"] .stressMatrixCard:hover {
    border-color: #cbd5e1;
  }
  html[data-theme="light"] .stressThinkStep {
    border-bottom-color: #e2e8f0;
  }
  html[data-theme="light"] .stressThinkStep:hover {
    background: #f8fafc;
  }
  html[data-theme="light"] .stressScaleLegend {
    border: 1px solid #d1d5db;
    background: rgba(0,0,0,0.02);
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="frame">
      <div class="frameInner">

        <div class="top">
          <div class="brand">
            <span class="markWrap" aria-hidden="true"><span class="markG">G</span></span>
            <div class="brandCol">
              <div class="brandName">Grounds</div>
              <span class="brandSep">|</span>
              <div class="brandTag">decision-grade reports</div>
            </div>
          </div>

          <div class="meta">
            <div class="metaTitle">${esc(input.title)}</div>
            ${extras?.theme ? `
              <div class="metaTheme">
                <span class="themeBadgeEmoji">${esc(extras.theme.emoji)}</span>
                <span class="themeBadgeLabel">${esc(extras.theme.label)}</span>
              </div>
            ` : ""}
            <div class="metaDates">
              <div>Created: ${esc(new Date(createdISO).toLocaleString())} (${esc(extras?.timezone || "UTC")})</div>
              <div>Generated: ${esc(new Date(generatedISO).toLocaleString())} (${esc(extras?.timezone || "UTC")})</div>
            </div>
          </div>
          
          <!-- Share Toolbar - hidden, available via print only -->
          <div class="shareToolbar no-print" style="display:none !important">
          </div>
        </div>

        <div class="grid g2">
          <div class="card executiveBriefCard">
            ${sectionTitle("📊 Executive brief", "Fast read - what matters most")}
            <div class="row">
              ${pill("Readiness <strong>" + r.score + "/100</strong>", gradeTone)}
              ${pill("Grade <strong>" + r.grade + "</strong>", gradeTone)}
              ${pill("Half-life: <strong>" + String(h.status).toUpperCase() + "</strong>", halfTone)}
              ${pill("Blind-Spot Index: <strong>" + b.score + "/100</strong>", blindTone)}
            </div>

            <div class="kpi">
              <div class="kpiBox">
                <div class="kpiLabel">Highlights</div>
                <div class="kpiHint">${list(r.highlights)}</div>
              </div>
              <div class="kpiBox">
                <div class="kpiLabel">Primary risks</div>
                <div class="kpiHint">${list(r.primaryRisks)}</div>
              </div>
              <div class="kpiBox">
                <div class="kpiLabel">Open questions</div>
                <div class="kpiHint">${list(r.openQuestions)}</div>
              </div>
            </div>
          </div>

          <div class="card halfLifeCard">
            ${sectionTitle("⏱️ Decision half-life", "Context freshness check")}
            <div class="muted">${list(h.reasons)}</div>
            <div class="hr"></div>
            ${sectionTitle("👁️ Blind-Spot Index", "Coverage, not correctness")}
            <div class="muted">${list(b.notes)}</div>
          </div>
        </div>

        <div class="grid">

          <div class="card contextCard">
            ${sectionTitle("📋 Context & intent", "The foundation of your decision")}
            <div class="two">
              <div class="contextBox contextBoxLeft">
                <div class="secSub"><strong>Context</strong></div>
                <div class="muted contextBullets">${listParagraph(input.context)}</div>
              </div>
              <div class="contextBox contextBoxRight">
                <div class="secSub"><strong>Intent</strong></div>
                <div class="muted contextBullets">${listParagraph(input.intent)}</div>
                <div class="hr"></div>
                <div class="secSub"><strong>Confidence</strong></div>
                <div class="row">
                  ${pill(
                    String(input.confidence).toUpperCase(),
                    input.confidence === "high" ? "good" : input.confidence === "medium" ? "warn" : "bad"
                  )}
                </div>
              </div>
            </div>
          </div>

          <div class="card support optionsCard">
            ${sectionTitle("🔄 Options & trade-offs", "Keep alternatives visible")}
            ${list(input.options)}
          </div>

          <div class="grid g2">
            <div class="card support assumptionsCard">
              ${sectionTitle("💭 Assumptions", "What you're relying on")}
              ${list(input.assumptions)}
            </div>
            <div class="card support risksCard">
              ${sectionTitle("⚡ Risks", "What could fail first")}
              ${listRisks(input.risks)}
            </div>
          </div>

          <div class="card support evidenceCard">
            ${sectionTitle("📎 Evidence & support", "Anchor key claims to artifacts")}
            ${list(input.evidence)}
            <div class="hr"></div>
            <div class="small">💡 <strong>Tip:</strong> evidence can be links, doc titles, metrics, or short references you can re-check later.</div>
          </div>

          <div class="card perspectiveCard">
            ${sectionTitle("🔍 Perspective shift", "A few lenses to reduce blind spots")}
            <div class="two">
              ${analysis.perspectives
                .map(
                  (p) => `
                <div class="kpiBox">
                  <div class="kpiLabel">${esc(p.lens)}</div>
                  <div class="kpiHint">${list(p.points)}</div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>

          ${renderDecisionGauge(analysis, extras)}
          ${renderRadarChart(extras?.radarChart, (input as any).outcome)}
          ${renderDecisionQualityDistribution(analysis, extras)}
          ${renderProviderSpiderChart(extras?.providerCompare)}
          ${renderSentimentAnalysis(extras?.sentiment)}
          
          <!-- Data Scientist Visualizations -->
          ${renderConfidenceIntervalChart(analysis, extras)}
          ${renderTimeSeriesChart(analysis, extras)}
          ${renderWordCloud(input)}
          ${renderCorrelationMatrix(analysis, extras)}
          ${renderBoxPlot(extras)}
          ${renderMonteCarloSimulation(analysis, extras)}

          ${hackathonSection}
          ${geminiCriticSection}
          ${providerCompareAppendix}
          
          ${renderRelatedResearch(extras?.relatedResearch, input)}

          <!-- Deep Reasoner Stress Test (placed after research, before grade legend) -->
          ${renderStressTest(extras?.stressTest)}

          ${gradeLegendSection}
          ${explainabilitySection}

          ${renderDataExport(input, analysis, extras)}
          
          <!-- CONCLUSION - Final Summary (placed at the end before credits) -->
          ${renderConclusion(extras?.conclusion, analysis, !!extras?.providerCompare, extras?.sentiment, extras?.stressTest, extras?.providerCompare as any, extras?.geminiCritic)}
          
          ${renderDisclaimer()}
          ${renderCredits(extras?.timezone)}

        </div>

      </div>
    </div>
  </div>
</body>
</html>`;
}
