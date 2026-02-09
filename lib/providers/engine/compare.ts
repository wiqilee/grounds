// lib/providers/engine/compare.ts
import type { ProviderId, ChatResponseNormalized } from "../types";
import { PROVIDERS } from "../index";

export type CompareRequest = {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  models?: Partial<Record<ProviderId, string>>;
  enabled?: Partial<Record<ProviderId, boolean>>;
};

export type CompareResponse = {
  results: ChatResponseNormalized[];
};

/* ---------------- utils ---------------- */

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message || "Unknown error";
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const anyE = e as any;
    if (typeof anyE.message === "string" && anyE.message.trim()) return anyE.message;

    const nested =
      anyE?.error?.message ??
      anyE?.error ??
      anyE?.data?.error?.message ??
      anyE?.data?.error ??
      anyE?.response?.data?.error?.message ??
      anyE?.response?.data?.error;

    if (typeof nested === "string" && nested.trim()) return nested;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeWs(s?: string) {
  return String(s ?? "").replace(/\r\n/g, "\n").replace(/\t/g, " ").trim();
}

function normKey(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[`"'“”‘’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Bullet-like lines (used by your UI scorer) */
function countBullets(text?: string): number {
  const t = String(text ?? "");
  if (!t) return 0;
  const lines = t.split("\n");
  let n = 0;
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    if (/^[-*•]\s+/.test(l)) n++;
    else if (/^\d+\.\s+/.test(l)) n++;
  }
  return n;
}

function normalizeHeaderText(s?: string) {
  return String(s ?? "")
    .trim()
    .replace(/^#{1,6}\s*/g, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/:$/g, "")
    .trim()
    .toUpperCase();
}

function isHeading(line: string): boolean {
  const l = line.trim();
  if (!l) return false;
  if (/^#{1,6}\s+/.test(l)) return true; // markdown headings
  if (/^[A-Z0-9][A-Z0-9 _-]{3,}:$/.test(l)) return true; // ALL CAPS:
  if (/^\*\*[A-Z0-9][A-Z0-9 _-]{2,}\*\*$/.test(l)) return true; // **TITLE**
  if (/^[A-Z][A-Z _-]{2,}$/.test(l)) return true; // ALL CAPS
  return false;
}

function isBulletLine(line: string): boolean {
  const l = line.trim();
  return /^[-*•]\s+/.test(l) || /^\d+\.\s+/.test(l);
}

const REQUIRED_HEADERS = [
  "BEST OPTION",
  "RATIONALE",
  "TOP RISKS",
  "ASSUMPTIONS TO VALIDATE",
  "HALF-LIFE",
  "BLIND SPOTS",
  "NEXT ACTIONS",
] as const;

type RequiredHeader = (typeof REQUIRED_HEADERS)[number];

const REQUIRED_HEADER_SET = new Set<string>(REQUIRED_HEADERS);

function isRequiredHeaderLine(line: string): boolean {
  const t = String(line || "").trim();
  if (!t) return false;
  if (!isHeading(t)) return false;
  const h = normalizeHeaderText(t);
  return REQUIRED_HEADER_SET.has(h);
}

/**
 * IMPORTANT PATCH:
 * Providers (esp. Google/Groq) sometimes repeat headers inside content.
 * If we treat those header lines as content bullets, we get garbage like:
 * - Risk: BEST OPTION
 * - Blind spot: RATIONALE
 * This helper strips header-only lines anywhere we "harvest" body text.
 */
function isHeaderOnlyContentLine(line: string): boolean {
  const t = String(line || "").trim();
  if (!t) return false;

  // If it's a heading and equals one of our required headers, drop it.
  if (isRequiredHeaderLine(t)) return true;

  // Also drop variants like "## BEST OPTION" or "**BEST OPTION**" or "BEST OPTION:"
  const h = normalizeHeaderText(t);
  if (REQUIRED_HEADER_SET.has(h)) return true;

  return false;
}

function findMissingHeaders(text?: string): RequiredHeader[] {
  const raw = normalizeWs(text);
  if (!raw) return [...REQUIRED_HEADERS];

  const lines = raw.split("\n");
  const seen = new Set<string>();

  for (const line of lines) {
    if (!isHeading(line)) continue;
    const h = normalizeHeaderText(line);
    for (const req of REQUIRED_HEADERS) {
      if (h === req) seen.add(req);
    }
  }

  const missing: RequiredHeader[] = [];
  for (const req of REQUIRED_HEADERS) if (!seen.has(req)) missing.push(req);
  return missing;
}

/* ---------------- semantic validation (NEXT ACTIONS) ---------------- */

type NextActionBlock = {
  actionLineIdx: number;
  actionText: string;
  hasOwner: boolean;
  hasTimebox: boolean;
};

function isActionLine(line: string) {
  const t = line.trim();
  return /^[-*•]?\s*\**\s*ACTION\s*:\s*/i.test(t);
}

function isOwnerLine(line: string) {
  const t = line.trim();
  return /^[-*•]?\s*\**\s*OWNER\s*:\s*/i.test(t);
}

function isTimeboxLine(line: string) {
  const t = line.trim();
  return /^[-*•]?\s*\**\s*TIMEBOX\s*:\s*/i.test(t);
}

function extractAfterColon(line: string): string {
  const idx = line.indexOf(":");
  if (idx < 0) return "";
  return line.slice(idx + 1).replace(/^\s+/, "").trim();
}

function sliceSection(text: string, header: RequiredHeader): string[] {
  const raw = normalizeWs(text);
  if (!raw) return [];
  const lines = raw.split("\n");

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (!isHeading(lines[i])) continue;
    if (normalizeHeaderText(lines[i]) === header) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return [];

  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (!isHeading(lines[i])) continue;
    end = i;
    break;
  }

  return lines.slice(start, end);
}

function parseNextActionsBlocks(text?: string): NextActionBlock[] {
  const src = normalizeWs(text);
  if (!src) return [];

  const sectionLines = sliceSection(src, "NEXT ACTIONS");
  if (!sectionLines.length) return [];

  const blocks: NextActionBlock[] = [];
  let current: NextActionBlock | null = null;

  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Defensive: if provider repeats required headers inside section, ignore.
    if (isHeaderOnlyContentLine(trimmed)) continue;
    if (isHeading(trimmed)) break;

    if (isActionLine(trimmed)) {
      const actionText = extractAfterColon(trimmed);
      current = {
        actionLineIdx: i,
        actionText,
        hasOwner: false,
        hasTimebox: false,
      };
      blocks.push(current);
      continue;
    }

    if (current) {
      if (isOwnerLine(trimmed)) {
        const v = extractAfterColon(trimmed);
        current.hasOwner = Boolean(v);
        continue;
      }
      if (isTimeboxLine(trimmed)) {
        const v = extractAfterColon(trimmed);
        current.hasTimebox = Boolean(v);
        continue;
      }
    }
  }

  return blocks;
}

function nextActionsSemantics(text?: string): {
  actionBlocks: number;
  emptyActionBlocks: number;
  missingOwnerBlocks: number;
  missingTimeboxBlocks: number;
  validBlocks: number;
} {
  const blocks = parseNextActionsBlocks(text);
  if (!blocks.length) {
    return {
      actionBlocks: 0,
      emptyActionBlocks: 0,
      missingOwnerBlocks: 0,
      missingTimeboxBlocks: 0,
      validBlocks: 0,
    };
  }

  let empty = 0;
  let missOwner = 0;
  let missTime = 0;
  let valid = 0;

  for (const b of blocks) {
    const actionOk = Boolean(b.actionText && b.actionText.trim());
    if (!actionOk) empty++;
    if (!b.hasOwner) missOwner++;
    if (!b.hasTimebox) missTime++;
    if (actionOk && b.hasOwner && b.hasTimebox) valid++;
  }

  return {
    actionBlocks: blocks.length,
    emptyActionBlocks: empty,
    missingOwnerBlocks: missOwner,
    missingTimeboxBlocks: missTime,
    validBlocks: valid,
  };
}

/* ---------------- BLIND SPOTS: selective enforcement + dedupe ---------------- */

type BlindSpotBlock = { spotLine: string; questionLine?: string };

function isBlindSpotLine(line: string) {
  const t = line.trim();
  return /^[-*•]\s*(blind\s*spot)\s*:\s*/i.test(t) || /^[-*•]\s*(blindspot)\s*:\s*/i.test(t);
}

function isQuestionLine(line: string) {
  const t = line.trim();
  return /^(\s{0,2}[-*•]?\s*)question\s*:\s*/i.test(t);
}

function cleanBlindSpotText(line: string) {
  return normKey(
    line
      .trim()
      .replace(/^[-*•]\s*/g, "")
      .replace(/^blind\s*spot\s*:\s*/i, "")
      .replace(/^blindspot\s*:\s*/i, "")
  );
}

function parseBlindSpotBlocksFromSection(sectionLines: string[]): BlindSpotBlock[] {
  const blocks: BlindSpotBlock[] = [];
  let cur: BlindSpotBlock | null = null;

  for (let i = 0; i < sectionLines.length; i++) {
    const raw = sectionLines[i];
    const line = raw.trim();
    if (!line) continue;

    // Defensive: ignore repeated headers inside section.
    if (isHeaderOnlyContentLine(line)) continue;
    if (isHeading(line)) break;

    if (isBlindSpotLine(line)) {
      if (cur) blocks.push(cur);
      cur = { spotLine: line };
      continue;
    }

    if (cur && isQuestionLine(line)) {
      if (!cur.questionLine)
        cur.questionLine = line.startsWith("Question:") ? line : line.replace(/^[-*•]\s*/, "");
      continue;
    }

    if (isBulletLine(line) && !cur) {
      const candidate = line.replace(/^[-*•]\s+/, "").trim();
      if (!candidate || isHeaderOnlyContentLine(candidate)) continue;
      cur = { spotLine: `- Blind spot: ${candidate}` };
      continue;
    }

    if (cur && isBulletLine(line) && !isQuestionLine(line)) {
      continue;
    }
  }

  if (cur) blocks.push(cur);
  return blocks;
}

function enforceBlindSpotsSemantics(text?: string): string {
  const src = normalizeWs(text);
  if (!src) return src;

  const lines = src.split("\n");

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isHeading(lines[i]) && normalizeHeaderText(lines[i]) === "BLIND SPOTS") {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return src;

  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (isHeading(lines[i])) {
      endIdx = i;
      break;
    }
  }

  const before = lines.slice(0, headerIdx + 1);
  const section = lines.slice(headerIdx + 1, endIdx);
  const after = lines.slice(endIdx);

  const missingHeaders = findMissingHeaders(src);
  const headersComplete = missingHeaders.length === 0;

  let blocks = parseBlindSpotBlocksFromSection(section);

  const seen = new Set<string>();
  blocks = blocks.filter((b) => {
    const k = cleanBlindSpotText(b.spotLine);
    if (!k) return false;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const allHaveQuestion =
    blocks.length > 0 && blocks.every((b) => Boolean(b.questionLine && b.questionLine.trim()));

  if (headersComplete && blocks.length >= 3 && allHaveQuestion) {
    return src;
  }

  for (const b of blocks) {
    if (!b.questionLine || !b.questionLine.trim()) {
      b.questionLine = "Question: What would invalidate this assumption or change the ranking?";
    }
  }

  const MIN_BLOCKS = 3;
  const fillers: Array<{ spot: string; q: string }> = [
    {
      spot: "Unknown dependency or hidden constraint that changes cost/timeline.",
      q: "Question: Which dependency (vendor, approval, policy, integration) could block launch — and how do we confirm it this week?",
    },
    {
      spot: "Second-order effects on users/ops that aren't in the stated success metrics.",
      q: "Question: What downstream team (support, ops, sales) pays the hidden cost — and what signal would reveal it early?",
    },
    {
      spot: "Data quality or measurement gap that makes the ‘win’ ambiguous.",
      q: "Question: Which metric could be gamed or misread — and what is the simplest audit to validate it?",
    },
  ];

  let fi = 0;
  while (blocks.length < MIN_BLOCKS && fi < fillers.length) {
    const candidateKey = normKey(fillers[fi].spot);
    if (!seen.has(candidateKey)) {
      seen.add(candidateKey);
      blocks.push({
        spotLine: `- Blind spot: ${fillers[fi].spot}`,
        questionLine: fillers[fi].q,
      });
    }
    fi++;
  }

  const rebuilt: string[] = [];
  for (const b of blocks) {
    const spot = b.spotLine.trim().startsWith("-") ? b.spotLine.trim() : `- ${b.spotLine.trim()}`;
    rebuilt.push(spot.startsWith("- Blind spot:") ? spot : `- Blind spot: ${spot.replace(/^[-*•]\s+/, "")}`);
    const q = String(b.questionLine || "").trim();
    if (q) {
      rebuilt.push(q.startsWith("Question:") ? `  ${q}` : `  Question: ${q.replace(/^question\s*:\s*/i, "")}`);
    }
    rebuilt.push("");
  }

  while (rebuilt.length && !rebuilt[rebuilt.length - 1].trim()) rebuilt.pop();

  return [...before, ...rebuilt, ...after].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ---------------- ASSUMPTIONS TO VALIDATE: fix Groq-style duplicate Validation bullets ---------------- */

function enforceAssumptionsToValidateSemantics(text?: string): string {
  const src = normalizeWs(text);
  if (!src) return src;

  const lines = src.split("\n");

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isHeading(lines[i]) && normalizeHeaderText(lines[i]) === "ASSUMPTIONS TO VALIDATE") {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return src;

  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (isHeading(lines[i])) {
      endIdx = i;
      break;
    }
  }

  const before = lines.slice(0, headerIdx + 1);
  const section = lines.slice(headerIdx + 1, endIdx);
  const after = lines.slice(endIdx);

  const isAssumptionLine = (l: string) => /^[-*•]\s*(assumption)\s*:\s*/i.test(l.trim());
  const isValidationLine = (l: string) =>
    /^[-*•]\s*(validation)\s*:\s*/i.test(l.trim()) || /^\s{0,2}validation\s*:\s*/i.test(l.trim());

  type Block = { assumption: string; validation: string };
  const blocks: Block[] = [];
  let cur: Block | null = null;

  const pushCur = () => {
    if (!cur) return;

    const a = (cur.assumption || "").trim();
    const v = (cur.validation || "").trim();

    blocks.push({
      assumption: a || "Assumption: (missing — inferred from context)",
      validation: v || "Validation: Define a quick test or data check to confirm.",
    });

    cur = null;
  };

  // Dedupe repeated identical validations (very common on Groq outputs)
  const seenValidation = new Set<string>();

  for (const raw of section) {
    const line = raw.trim();
    if (!line) continue;

    // Ignore accidental headings / repeated required headers inside section
    if (isHeading(line) || isHeaderOnlyContentLine(line)) continue;

    if (isAssumptionLine(line)) {
      pushCur();
      cur = { assumption: line.replace(/^[-*•]\s*/g, "").trim(), validation: "" };
      continue;
    }

    if (isValidationLine(line)) {
      const v = line
        .replace(/^[-*•]\s*/g, "")
        .replace(/^validation\s*:\s*/i, "Validation: ")
        .trim();

      const key = normKey(v);
      if (key && seenValidation.has(key)) continue;
      if (key) seenValidation.add(key);

      if (!cur) cur = { assumption: "Assumption: (missing — inferred from context)", validation: v };
      else if (!cur.validation) cur.validation = v;
      else {
        // If the block already has a validation, ignore extras (keeps output clean)
      }
      continue;
    }

    // If we see a bullet that isn't labeled, treat as an assumption
    if (isBulletLine(line)) {
      pushCur();
      cur = { assumption: `Assumption: ${line.replace(/^[-*•]\s+/, "").trim()}`, validation: "" };
      continue;
    }
  }

  pushCur();

  // If we ended up with nothing, do not change the text.
  if (!blocks.length) return src;

  const rebuilt: string[] = [];
  for (const b of blocks) {
    const a = b.assumption.startsWith("Assumption:") ? b.assumption : `Assumption: ${b.assumption}`;
    const v = b.validation.startsWith("Validation:") ? b.validation : `Validation: ${b.validation}`;

    rebuilt.push(`- ${a}`);
    rebuilt.push(`  ${v}`);
    rebuilt.push("");
  }

  while (rebuilt.length && !rebuilt[rebuilt.length - 1].trim()) rebuilt.pop();

  return [...before, ...rebuilt, ...after].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ---------------- completion + repair policy ---------------- */

function looksComplete(text?: string): boolean {
  const raw = normalizeWs(text);
  if (!raw) return false;

  const missing = findMissingHeaders(raw);
  const bullets = countBullets(raw);
  const na = nextActionsSemantics(raw);

  const nextActionsOk =
    na.actionBlocks >= 6 &&
    na.emptyActionBlocks === 0 &&
    na.missingOwnerBlocks === 0 &&
    na.missingTimeboxBlocks === 0;

  return missing.length === 0 && bullets >= 18 && raw.length >= 900 && nextActionsOk;
}

function isStructureBroken(provider: ProviderId, text?: string): boolean {
  const raw = normalizeWs(text);
  if (!raw) return true;

  const missing = findMissingHeaders(raw);
  if (missing.length > 0) return true;

  const na = nextActionsSemantics(raw);

  if (provider === "google") {
    if (na.validBlocks < 4) return true;
    if (raw.length < 650) return true;
    return false;
  }

  if (na.validBlocks < 6) return true;
  if (raw.length < 800) return true;
  return false;
}

/* ---------------- Rust score_engine hook ---------------- */

type RustDiagnostics = {
  score: number;
  must_repair: boolean;
  finish_reason_hint: string;
  missing_headers: string[];
  empty_sections: string[];
  duplicate_headers: string[];
  next_actions_count: number;
  next_actions_ok: boolean;
  truncation_suspected: boolean;
  notes: string[];
};

function normalizeRustHeader(h: string): string {
  const up = normalizeHeaderText(h);
  if (up === "ASSUMPTIONS") return "ASSUMPTIONS TO VALIDATE";
  return up;
}

function rustMissingRequired(diag: RustDiagnostics | null | undefined): RequiredHeader[] {
  if (!diag) return [];
  const missing = new Set<string>((diag.missing_headers || []).map(normalizeRustHeader));
  const out: RequiredHeader[] = [];
  for (const req of REQUIRED_HEADERS) {
    if (missing.has(req)) out.push(req);
  }
  return out;
}

/**
 * IMPORTANT: No static import here.
 * We lazy-import scoreWithRust so this file can load even when wasm pkg isn't present during tooling.
 */
async function safeScoreWithRust(text: string): Promise<RustDiagnostics | null> {
  try {
    const mod = await import("@/lib/scoring/scoreEngine");
    const fn = (mod as any)?.scoreWithRust;
    if (typeof fn !== "function") return null;

    const d = (await fn(text)) as any;
    if (!d || typeof d !== "object") return null;
    if (typeof d.score !== "number" || typeof d.must_repair !== "boolean") return null;

    return d as RustDiagnostics;
  } catch {
    return null;
  }
}

function shouldRepairFromRust(diag: RustDiagnostics | null | undefined): boolean {
  if (!diag) return false;
  const missing = rustMissingRequired(diag);
  if (missing.length > 0) return true;
  if (!diag.next_actions_ok) return true;
  if (diag.must_repair) return true;
  if (diag.truncation_suspected && diag.score < 92) return true;
  return false;
}

/* ---------------- bulletize / template enforcement ---------------- */

function bulletizeIfNeeded(text?: string): string {
  const src = normalizeWs(text);
  if (!src) return src;

  if (countBullets(src) > 0) return src;

  const wantedSections = new Set<string>([
    "BEST OPTION",
    "RATIONALE",
    "TOP RISKS",
    "ASSUMPTIONS TO VALIDATE",
    "ASSUMPTIONS",
    "HALF-LIFE",
    "BLIND SPOTS",
    "NEXT ACTIONS",
  ]);

  const lines = src.split("\n");
  const out: string[] = [];
  let inSection = false;

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (!trimmed) {
      out.push("");
      continue;
    }

    if (isHeading(trimmed)) {
      const up = normalizeHeaderText(trimmed);
      if (REQUIRED_HEADER_SET.has(up)) {
        inSection = wantedSections.has(up);
        out.push(up);
        continue;
      }

      inSection = wantedSections.has(up);
      out.push(trimmed.replace(/^#{1,6}\s+/, "").replace(/^\*\*(.*)\*\*$/, "$1").trim());
      continue;
    }

    if (isBulletLine(trimmed)) {
      out.push(trimmed);
      continue;
    }

    if (isHeaderOnlyContentLine(trimmed)) {
      out.push(normalizeHeaderText(trimmed));
      continue;
    }

    if (inSection) {
      out.push(`- ${trimmed}`);
      continue;
    }

    out.push(trimmed);
  }

  return out.join("\n").trim() || src;
}

/* ---------------- NEXT ACTIONS enforcement ---------------- */

const ACTION_GARBAGE_KEYS = new Set<string>([
  ...REQUIRED_HEADERS.map((h) => normKey(h)),
  normKey("risk"),
  normKey("mitigation"),
  normKey("assumption"),
  normKey("validation"),
  normKey("trigger"),
  normKey("question"),
  normKey("owner"),
  normKey("timebox"),
]);

function isGarbageActionText(action: string): boolean {
  const t = String(action || "").trim();
  if (!t) return true;

  if (isHeading(t)) return true;
  if (/^#{1,6}\s+/.test(t)) return true;

  const h = normalizeHeaderText(t);
  if (REQUIRED_HEADER_SET.has(h)) return true;

  const k = normKey(t);
  if (!k) return true;
  if (ACTION_GARBAGE_KEYS.has(k)) return true;

  for (const req of REQUIRED_HEADERS) {
    const rk = normKey(req);
    if (k === rk) return true;
    if (k.startsWith(rk + " ")) return true;
    if (k.endsWith(" " + rk)) return true;
  }

  if (k.split(" ").length === 1 && k.length <= 10) {
    if (ACTION_GARBAGE_KEYS.has(k)) return true;
  }

  return false;
}

function enforceNextActionsSemantics(text?: string): string {
  const src = normalizeWs(text);
  if (!src) return src;

  const lines = src.split("\n");

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isHeading(lines[i]) && normalizeHeaderText(lines[i]) === "NEXT ACTIONS") {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return src;

  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (isHeading(lines[i])) {
      endIdx = i;
      break;
    }
  }

  const before = lines.slice(0, headerIdx + 1);
  const section = lines.slice(headerIdx + 1, endIdx);
  const after = lines.slice(endIdx);

  type Block = { action: string; owner: string; timebox: string };
  const blocks: Block[] = [];

  let cur: Block | null = null;

  const flush = () => {
    if (!cur) return;

    const action = (cur.action || "").trim();
    const owner = (cur.owner || "").trim();
    const timebox = (cur.timebox || "").trim();

    if (!action || isGarbageActionText(action)) {
      cur = null;
      return;
    }

    blocks.push({
      action,
      owner: owner || "Assign a person/team",
      timebox: timebox || "24–48h",
    });

    cur = null;
  };

  for (const raw of section) {
    const line = raw.trim();
    if (!line) continue;

    if (isHeading(line) || isHeaderOnlyContentLine(line)) continue;

    if (isActionLine(line)) {
      flush();
      const v = extractAfterColon(line);

      if (!v || isGarbageActionText(v)) {
        cur = null;
        continue;
      }

      cur = { action: v, owner: "", timebox: "" };
      continue;
    }

    if (!cur) {
      if (isBulletLine(line)) {
        const v = line.replace(/^[-*•]\s+/, "").trim();
        if (!v || isGarbageActionText(v)) continue;

        flush();
        cur = { action: v, owner: "", timebox: "" };
        continue;
      }
      continue;
    }

    if (isOwnerLine(line)) {
      const v = extractAfterColon(line);
      if (v) cur.owner = v;
      continue;
    }

    if (isTimeboxLine(line)) {
      const v = extractAfterColon(line);
      if (v) cur.timebox = v;
      continue;
    }
  }

  flush();

  const MIN_ACTION_BLOCKS = 6;
  const fillers = [
    "Confirm success criteria and scoring thresholds with the demo rubric.",
    "Run a 10-minute compare benchmark and log failures + latencies.",
    "Tighten template rules for Mitigation/Validation/Trigger/Question/Owner/Timebox lines.",
    "Add a deterministic post-check that rejects empty Action/Owner/Timebox and triggers repair.",
    "Validate HTML/PDF export parity on one real scenario and one edge-case scenario.",
    "Do a final UI pass: highlight Best option + make Next actions scannable (checklist style).",
  ];

  let fi = 0;
  while (blocks.length < MIN_ACTION_BLOCKS) {
    blocks.push({
      action: fillers[fi % fillers.length],
      owner: "Assign a person/team",
      timebox: "24–48h",
    });
    fi++;
  }

  const rebuilt: string[] = [];
  for (const b of blocks) {
    rebuilt.push(`- Action: ${b.action}`);
    rebuilt.push(`  Owner: ${b.owner}`);
    rebuilt.push(`  Timebox: ${b.timebox}`);
  }

  return [...before, ...rebuilt, ...after].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ---------------- template wrapper if missing ---------------- */

function enforceTemplateIfMissing(text?: string): string {
  const src = normalizeWs(text);
  if (!src) return src;

  const missing = findMissingHeaders(src);
  if (missing.length === 0) return src;

  const bodyLines = src
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !isHeaderOnlyContentLine(l))
    .filter((l) => !REQUIRED_HEADER_SET.has(normalizeHeaderText(l)))
    .slice(0, 140);

  const bodyBullets = bodyLines.map((l) => (isBulletLine(l) ? l : `- ${l}`));

  const takeBullets = (n: number) => {
    const picked: string[] = [];
    for (const b of bodyBullets) {
      if (picked.length >= n) break;
      const clean = b.trim();
      if (!clean) continue;

      const asPlain = clean.replace(/^[-*•]\s+/, "").trim();
      if (!asPlain || isHeaderOnlyContentLine(asPlain)) continue;

      picked.push(clean.startsWith("-") || /^\d+\./.test(clean) ? clean : `- ${clean}`);
    }
    return picked;
  };

  const best = takeBullets(2);
  const rationale = takeBullets(8);
  const risks = takeBullets(5);
  const assumptions = takeBullets(5);
  const halfLife = takeBullets(4);
  const blindRaw = takeBullets(8);
  const next = takeBullets(8);

  const ensure = (arr: string[], fallback: string) => (arr.length ? arr : [fallback]);

  const chunks: string[] = [];

  chunks.push("BEST OPTION");
  chunks.push(...ensure(best, "- Choose the option that best matches the stated constraints and timeline."));
  chunks.push("");

  chunks.push("RATIONALE");
  chunks.push(...ensure(rationale, "- Ground the decision in constraints, trade-offs, and measurable outcomes."));
  chunks.push("");

  chunks.push("TOP RISKS");
  for (const r of ensure(
    risks,
    "- Risk: Execution or integration slip\n  Mitigation: Add a hard cutoff, scope guardrails, and a rollback plan."
  )) {
    const s = String(r).trim();
    const plain = s.replace(/^[-*•]\s+/, "").trim();
    if (!plain || isHeaderOnlyContentLine(plain)) continue;

    if (plain.toLowerCase().includes("risk:")) {
      chunks.push(s);
      if (!plain.toLowerCase().includes("mitigation:"))
        chunks.push("  Mitigation: Add a clear mitigation step and an owner.");
    } else {
      chunks.push(`- Risk: ${plain}`);
      chunks.push("  Mitigation: Add a concrete mitigation step and an owner.");
    }
  }
  chunks.push("");

  chunks.push("ASSUMPTIONS TO VALIDATE");
  for (const a of ensure(
    assumptions,
    "- Assumption: The key constraint is accurate\n  Validation: Confirm with the owner and verify against real data."
  )) {
    const s = String(a).trim();
    const plain = s.replace(/^[-*•]\s+/, "").trim();
    if (!plain || isHeaderOnlyContentLine(plain)) continue;

    if (plain.toLowerCase().includes("assumption:")) {
      chunks.push(s);
      if (!plain.toLowerCase().includes("validation:"))
        chunks.push("  Validation: Define what evidence would confirm or falsify this.");
    } else {
      chunks.push(`- Assumption: ${plain}`);
      chunks.push("  Validation: Define a quick test or data check to confirm.");
    }
  }
  chunks.push("");

  chunks.push("HALF-LIFE");
  for (const h of ensure(
    halfLife,
    "- What could change: New constraint or stakeholder priority shift\n  Trigger: Re-check when scope, deadline, or budget changes."
  )) {
    const s = String(h).trim();
    const plain = s.replace(/^[-*•]\s+/, "").trim();
    if (!plain || isHeaderOnlyContentLine(plain)) continue;

    if (plain.toLowerCase().includes("trigger:")) {
      chunks.push(s);
    } else if (plain.toLowerCase().includes("what could change:")) {
      chunks.push(s);
      chunks.push("  Trigger: Define the event that would force a revisit.");
    } else {
      chunks.push(`- What could change: ${plain}`);
      chunks.push("  Trigger: Define the event that would force a revisit.");
    }
  }
  chunks.push("");

  chunks.push("BLIND SPOTS");

  const blocks: BlindSpotBlock[] = [];
  let cur: BlindSpotBlock | null = null;

  for (const raw of blindRaw) {
    const line = String(raw || "").trim();
    if (!line) continue;

    const plain = line.replace(/^[-*•]\s+/, "").trim();
    if (!plain || isHeaderOnlyContentLine(plain)) continue;

    if (isQuestionLine(plain) || /^question\s*:\s*/i.test(plain)) {
      if (cur && !cur.questionLine) {
        const q = plain.replace(/^question\s*:\s*/i, "").trim();
        cur.questionLine = `Question: ${q || "What would invalidate the plan or change the ranking?"}`;
      }
      continue;
    }

    if (cur) blocks.push(cur);
    cur = {
      spotLine: plain.toLowerCase().includes("blind spot:") ? `- ${plain}` : `- Blind spot: ${plain}`,
    };
  }
  if (cur) blocks.push(cur);

  const ensuredBlocks = blocks.length
    ? blocks
    : [
        {
          spotLine: "- Blind spot: Unknown dependency or hidden cost",
          questionLine: "Question: What would invalidate the plan or change the ranking?",
        },
      ];

  for (const b of ensuredBlocks.slice(0, 5)) {
    const spot = b.spotLine.trim().startsWith("-") ? b.spotLine.trim() : `- ${b.spotLine.trim()}`;
    chunks.push(
      spot.toLowerCase().includes("blind spot:")
        ? spot
        : `- Blind spot: ${spot.replace(/^[-*•]\s+/, "")}`
    );

    const q = String(b.questionLine || "").trim();
    if (q) chunks.push(`  ${q.startsWith("Question:") ? q : `Question: ${q}`}`);
    else chunks.push("  Question: What would invalidate the plan or change the ranking?");
  }
  chunks.push("");

  chunks.push("NEXT ACTIONS");
  for (const n of ensure(next, "- Action: Define the next step\n  Owner: Assign a person/team\n  Timebox: 24–48h")) {
    const line = String(n).trim();
    const plain = line.replace(/^[-*•]\s+/, "").trim();
    if (!plain || isHeaderOnlyContentLine(plain)) continue;

    if (plain.toLowerCase().includes("owner:") || plain.toLowerCase().includes("timebox:")) {
      chunks.push(line);
      if (!plain.toLowerCase().includes("owner:")) chunks.push("  Owner: Assign a person/team");
      if (!plain.toLowerCase().includes("timebox:")) chunks.push("  Timebox: 24–48h");
      continue;
    }

    if (isActionLine(line)) {
      const v = extractAfterColon(line) || "Define the next step";
      if (!v || isGarbageActionText(v)) continue;
      chunks.push(`- Action: ${v}`);
      chunks.push("  Owner: Assign a person/team");
      chunks.push("  Timebox: 24–48h");
      continue;
    }

    const action = line.replace(/^[-*•]\s+/, "").trim();
    if (!action || isGarbageActionText(action)) continue;

    chunks.push(`- Action: ${action}`);
    chunks.push("  Owner: Assign a person/team");
    chunks.push("  Timebox: 24–48h");
  }
  chunks.push("");

  return chunks.join("\n").trim();
}

/* ---------------- prompt building ---------------- */

function buildCompareSystem(userSystem?: string): string {
  const base = [
    "You are a decision-grade synthesis engine.",
    "Return a structured report with STRICT section headers and bullet points.",
    `Use EXACT headers: ${REQUIRED_HEADERS.join(" | ")}.`,
    "Do NOT include a preamble like 'DECISION REPORT', greetings, or meta commentary.",
    "Do NOT output JSON. Output plain text only.",
    "Be concrete: include numbers, constraints, and verification steps when possible.",
    "Assume the reader will act on this next week (so include owners + timeboxes).",
  ].join("\n");

  const extra = String(userSystem || "").trim();
  return extra ? `${base}\n\nAdditional system context:\n${extra}` : base;
}

function buildComparePrompt(userPrompt: string): string {
  const task = normalizeWs(userPrompt);

  return [
    "Write the report in the EXACT order and headers below.",
    "Each section MUST contain bullet points (use '-' bullets).",
    "",
    "Minimum content rules (strict):",
    "- Total length: at least 900 characters (aim ~1100–1800).",
    "- BEST OPTION: 1–3 bullets (name the option clearly).",
    "- RATIONALE: at least 6 bullets.",
    "- TOP RISKS: at least 4 bullets; each MUST include Mitigation on the next line.",
    "- ASSUMPTIONS TO VALIDATE: at least 4 bullets; each MUST include Validation on the next line.",
    "- HALF-LIFE: at least 3 bullets; each MUST include Trigger on the next line.",
    "- BLIND SPOTS: at least 3 bullets; each MUST include Question on the next line.",
    "- NEXT ACTIONS: at least 6 action blocks; each MUST include Owner + Timebox on the next lines.",
    "",
    "Output format (STRICT):",
    "BEST OPTION",
    "- ...",
    "",
    "RATIONALE",
    "- ...",
    "",
    "TOP RISKS",
    "- Risk: ...",
    "  Mitigation: ...",
    "",
    "ASSUMPTIONS TO VALIDATE",
    "- Assumption: ...",
    "  Validation: ...",
    "",
    "HALF-LIFE",
    "- What could change: ...",
    "  Trigger: ...",
    "",
    "BLIND SPOTS",
    "- Blind spot: ...",
    "  Question: ...",
    "",
    "NEXT ACTIONS",
    "- Action: ...",
    "  Owner: ...",
    "  Timebox: ...",
    "",
    "Task to analyze:",
    task || "(empty task)",
  ].join("\n");
}

function buildRepairPrompt(originalTask: string, draft?: string): string {
  return [
    "Rewrite the draft into the STRICT template.",
    `Use EXACT headers: ${REQUIRED_HEADERS.join(" | ")}.`,
    "No preamble. No greetings. No meta commentary.",
    "Every section must have bullets as required, and follow the Mitigation/Validation/Trigger/Question/Owner/Timebox sub-lines.",
    "IMPORTANT: In NEXT ACTIONS, each action MUST be a full Action block with Owner + Timebox. No empty 'Action:'.",
    "IMPORTANT: In BLIND SPOTS, do NOT repeat the same blind spot. Each blind spot must have exactly one Question line.",
    "",
    "Original task:",
    normalizeWs(originalTask),
    "",
    "Draft to rewrite:",
    normalizeWs(draft).slice(0, 8000),
    "",
    "Now output ONLY the corrected final report in the strict format.",
  ].join("\n");
}

/* ---------------- normalization ---------------- */

function normalizeResult(x: any, fallbackProvider: ProviderId, fallbackModel: string): ChatResponseNormalized {
  const ok = Boolean(x?.ok);

  const latencyMs = typeof x?.latencyMs === "number" && Number.isFinite(x.latencyMs) ? x.latencyMs : 0;

  const provider = (x?.provider ?? fallbackProvider) as ProviderId;
  const model = String(x?.model ?? fallbackModel);

  const rawText = typeof x?.text === "string" ? x.text : String(x?.text ?? "");
  let text = normalizeWs(rawText);

  if (!ok) {
    return {
      ok,
      provider,
      model,
      text,
      latencyMs,
      usage: x?.usage,
      finishReason: x?.finishReason,
      error: x?.error,
      raw: x?.raw,
    };
  }

  text = bulletizeIfNeeded(text);
  text = enforceTemplateIfMissing(text);

  // FIX: prevent duplicate "- Validation: ..." bullets in ASSUMPTIONS TO VALIDATE (common in Groq)
  text = enforceAssumptionsToValidateSemantics(text);

  text = enforceNextActionsSemantics(text);
  text = enforceBlindSpotsSemantics(text);

  return {
    ok,
    provider,
    model,
    text,
    latencyMs,
    usage: x?.usage,
    finishReason: x?.finishReason,
    error: x?.error,
    raw: x?.raw,
  };
}

/* ---------------- provider tuning ---------------- */

function tunedMaxTokens(provider: ProviderId, base: number): number {
  if (provider === "google") return clamp(Math.round(base * 1.8), 1500, 3200);
  return clamp(Math.round(base * 0.95), 600, 1700);
}

function tunedMaxTokensRepair(provider: ProviderId, base: number): number {
  if (provider === "google") return clamp(Math.round(base * 2.0), 2000, 4096);
  return clamp(Math.round(base * 1.25), 900, 2200);
}

function tunedTemperature(provider: ProviderId, base?: number): number | undefined {
  const t = typeof base === "number" ? base : undefined;
  if (provider === "google") return typeof t === "number" ? clamp(t, 0, 0.3) : 0.18;
  return t;
}

function pickModelForRepair(provider: ProviderId, usedModel: string): string {
  if (provider !== "google") return usedModel;

  const m = String(usedModel || "").trim().toLowerCase();
  if (m.includes("pro")) return usedModel;
  if (m.includes("flash")) return "gemini-3-pro";
  return usedModel;
}

/* ---------------- main ---------------- */

export async function runCompare(req: CompareRequest): Promise<CompareResponse> {
  const allIds = Object.keys(PROVIDERS) as ProviderId[];

  const ids = allIds.filter((id) => {
    const flag = req.enabled?.[id];
    return flag === undefined ? true : Boolean(flag);
  });

  if (!ids.length) return { results: [] };

  const system = buildCompareSystem(req.system);
  const prompt = buildComparePrompt(req.prompt);

  const baseMaxTokens = typeof req.maxTokens === "number" ? Math.max(1, Math.floor(req.maxTokens)) : 1200;

  const settled = await Promise.allSettled(
    ids.map(async (id) => {
      const client = PROVIDERS[id];
      const model = (req.models?.[id] ?? client?.defaultModel ?? "").trim();

      if (!client || typeof client.run !== "function") {
        const bad: ChatResponseNormalized = {
          ok: false,
          provider: id,
          model: model || "(missing client)",
          text: "",
          latencyMs: 0,
          error: { message: `Provider "${id}" is not registered in PROVIDERS` },
        };
        return bad;
      }

      const usedModel = (model || client.defaultModel || "").trim();
      const maxTokens = tunedMaxTokens(id, baseMaxTokens);
      const temperature = tunedTemperature(id, req.temperature);

      try {
        const res1 = await client.run({
          system,
          prompt,
          temperature,
          maxTokens,
          model: usedModel,
        });

        const norm1 = normalizeResult(res1, id, usedModel);
        const t1 = String(norm1.text ?? "");

        const diag1 = norm1.ok ? await safeScoreWithRust(t1) : null;

        if (diag1) {
          const anyNorm = norm1 as any;
          anyNorm.raw = anyNorm.raw ?? {};
          anyNorm.raw.__scoreEngine = diag1;
        }

        const mustRepair = norm1.ok && (isStructureBroken(id, t1) || shouldRepairFromRust(diag1));

        if (mustRepair) {
          const repairPrompt = buildRepairPrompt(req.prompt, t1);
          const repairModel = pickModelForRepair(id, usedModel);

          const res2 = await client.run({
            system,
            prompt: repairPrompt,
            temperature,
            maxTokens: tunedMaxTokensRepair(id, baseMaxTokens),
            model: repairModel,
          });

          const norm2 = normalizeResult(res2, id, repairModel);
          const t2 = String(norm2.text ?? "");

          const na1 = nextActionsSemantics(t1);
          const na2 = nextActionsSemantics(t2);

          const diag2 = norm2.ok ? await safeScoreWithRust(t2) : null;

          if (diag2) {
            const anyNorm = norm2 as any;
            anyNorm.raw = anyNorm.raw ?? {};
            anyNorm.raw.__scoreEngine = diag2;
          }

          const score1 = diag1?.score ?? 0;
          const score2 = diag2?.score ?? 0;

          const missing1 = findMissingHeaders(t1).length;
          const missing2 = findMissingHeaders(t2).length;

          const pick2 =
            norm2.ok &&
            (looksComplete(t2) ||
              (missing2 === 0 && missing1 > 0) ||
              missing2 < missing1 ||
              na2.validBlocks > na1.validBlocks ||
              score2 >= score1 + 6 ||
              t2.length > t1.length + 220) &&
            !(score2 < score1 - 10 && missing2 > missing1);

          return pick2 ? norm2 : norm1;
        }

        return norm1;
      } catch (e: unknown) {
        const message = toErrorMessage(e);
        const err = new Error(message);
        (err as any).provider = id;
        (err as any).model = usedModel;
        throw err;
      }
    })
  );

  const results: ChatResponseNormalized[] = settled.map((s, i) => {
    const id = ids[i];
    const client = PROVIDERS[id];
    const fallbackModel = (req.models?.[id] ?? client?.defaultModel ?? "").trim() || client?.defaultModel || "";

    if (s.status === "fulfilled") {
      return s.value;
    }

    const reason = s.reason;
    const message = toErrorMessage(reason);

    const reasonProvider = (reason && typeof reason === "object" ? (reason as any).provider : null) as ProviderId | null;
    const reasonModel = (reason && typeof reason === "object" ? (reason as any).model : null) as string | null;

    return {
      ok: false,
      provider: reasonProvider ?? id,
      model: (reasonModel ?? fallbackModel) || "(unknown model)",
      text: "",
      latencyMs: 0,
      error: { message },
    };
  });

  results.sort((a, b) => a.provider.localeCompare(b.provider));

  return { results };
}
