// lib/ledger/types.ts

export type LedgerEventType = "INTENT_SNAPSHOT" | "DECISION" | "OUTCOME" | "COMPARE_RUN";

export type Confidence = "low" | "medium" | "high";

/* ---------------- Base event ---------------- */

export type LedgerEventBase = {
  id: string;
  type: LedgerEventType;
  createdAtISO: string;

  /** Optional: helps grouping / future UX */
  projectId?: string;

  /** Optional: stable “session” scope (e.g. one decision workflow run) */
  sessionId?: string;
};

/* ---------------- Compare helper types ---------------- */

export type CompareProviderId = "openai" | "groq" | "google" | "openrouter";

export type CompareItem = {
  provider: CompareProviderId;
  model: string;
  ok: boolean;

  text?: string;
  latencyMs?: number;
  usage?: Record<string, unknown>;
  error?: { message: string };
};

/* ---------------- Shared payload: decision input snapshot ---------------- */

export type DecisionSnapshotPayload = {
  title: string;
  context: string;
  intent: string;
  options: string[];
  assumptions: string[];
  risks: string[];
  evidence: string[];
  confidence: Confidence;
  outcome?: string;
};

/* ---------------- Event: INTENT_SNAPSHOT ----------------
 * Raw snapshot of the current decision input (Step 8 saveSnapshot).
 * This matches exactly what page.tsx writes.
 */

export type IntentSnapshotEvent = LedgerEventBase &
  DecisionSnapshotPayload & {
    type: "INTENT_SNAPSHOT";

    /** optional: why this snapshot was recorded (manual, process click, etc) */
    reason?: string;
  };

/* ---------------- Event: DECISION ----------------
 * Captures the commit point (Process click).
 * Matches page.tsx appendDecisionEvent().
 */

export type DecisionEvent = LedgerEventBase & {
  type: "DECISION";

  /** convenience: allow filtering by title without loading snapshot */
  title: string;

  /** chosen option index (defaults to 0 in current page.tsx) */
  selectedOptionIndex: number;

  /** selected option text (can be null if not known) */
  selectedOption: string | null;

  /** short rationale */
  rationale: string;

  /** confidence at decision time */
  confidence: Confidence;

  /** optional links or references */
  links: string[];

  /** freeform metadata (e.g. compare winner) */
  meta?: {
    compareWinner?: CompareProviderId | null;
    [k: string]: unknown;
  };
};

/* ---------------- Event: OUTCOME ----------------
 * Records what happened after execution.
 * Matches page.tsx OUTCOME event writer (debounced in useEffect).
 */

export type OutcomeEvent = LedgerEventBase & {
  type: "OUTCOME";

  /** convenience: allow filtering by title */
  title: string;

  /** outcome narrative / observation */
  outcome: string;

  /** optional last evidence line hint */
  evidenceHint: string | null;

  /** who/what wrote this outcome */
  source: "manual_or_compare";
};

/* ---------------- Event: COMPARE_RUN ----------------
 * Audit trail of /api/compare run.
 * Matches page.tsx runCompare() event exactly.
 */

export type CompareRunEvent = LedgerEventBase & {
  type: "COMPARE_RUN";

  /** convenience: allow filtering by title */
  title: string;

  prompt: string;
  system: string;

  /** enabled providers at run time */
  enabled: Partial<Record<CompareProviderId, boolean>>;

  /** model selected per provider at run time */
  models: Partial<Record<CompareProviderId, string>>;

  temperature: number;
  maxTokens: number;

  /** raw compare results */
  results: CompareItem[];

  /** winner (or null if none usable) */
  winnerProvider: CompareProviderId | null;
};

/* ---------------- Union ---------------- */

export type LedgerEvent = IntentSnapshotEvent | DecisionEvent | OutcomeEvent | CompareRunEvent;

/* ---------------- Ledger ---------------- */

export type Ledger = {
  version: "0.1.0";
  events: LedgerEvent[];
};
