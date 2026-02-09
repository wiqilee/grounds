// lib/gallery/types.ts

export type ReportGrade = "A" | "B" | "C" | "D";
export type HalfLifeStatus = "stable" | "degrading" | "expired";

export type ProviderId = "openai" | "groq" | "google" | "openrouter";

export type CompareResultItem = {
  provider: ProviderId;
  model: string;
  ok: boolean;
  text?: string;
  latencyMs?: number;
  usage?: Record<string, unknown>;
  error?: { message: string };
};

export type CompareBundle = {
  /**
   * ISO timestamp when compare run completed.
   */
  generatedAtISO: string;

  /**
   * Prompt used (already includes title/context/options/evidence etc).
   * This is what you want to preserve for audit + deterministic replay.
   */
  prompt: string;

  /**
   * Which providers were enabled at run time.
   */
  enabled: Partial<Record<ProviderId, boolean>>;

  /**
   * Model mapping used.
   */
  models: Partial<Record<ProviderId, string>>;

  /**
   * Winner chosen by your normalize+pickBest heuristic.
   */
  winnerProvider: ProviderId | null;

  /**
   * Raw results returned from /api/compare (per provider).
   */
  results: CompareResultItem[];
};

export type StoredReport = {
  id: string;
  title: string;
  createdAtISO: string;
  generatedAtISO: string;

  readinessScore: number;
  grade: ReportGrade;
  halfLife: HalfLifeStatus;
  blindSpotScore: number;

  // Offline report content
  html: string;

  // Optional short tags (user-defined later; reserved for future)
  tags?: string[];

  /**
   * Optional compare bundle — stored as structured JSON for replay/audit.
   * (Not required for rendering HTML; HTML may embed a formatted version separately.)
   */
  compareBundle?: CompareBundle;
};
