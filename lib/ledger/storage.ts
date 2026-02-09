// lib/ledger/storage.ts
"use client";

import type { Ledger, LedgerEvent, LedgerEventType } from "./types";

const KEY = "grounds:ledger:v0";
const VERSION: Ledger["version"] = "0.1.0";

/* ---------------- utils ---------------- */

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isString(x: unknown): x is string {
  return typeof x === "string";
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === "string");
}

function uid() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

function isValidISO(s: unknown): s is string {
  if (!isString(s)) return false;
  // loose ISO check
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

const VALID_TYPES: LedgerEventType[] = ["INTENT_SNAPSHOT", "DECISION", "OUTCOME", "COMPARE_RUN"];

/**
 * Backwards compatibility:
 * Old type: "SNAPSHOT" -> new type: "INTENT_SNAPSHOT"
 */
function normalizeEventType(t: unknown): LedgerEventType | null {
  if (!isString(t)) return null;
  if (t === "SNAPSHOT") return "INTENT_SNAPSHOT";
  if ((VALID_TYPES as string[]).includes(t)) return t as LedgerEventType;
  return null;
}

/**
 * Best-effort migration/sanitization:
 * - ensures id, createdAtISO, type
 * - fixes arrays on snapshot-like events
 * - keeps extra properties (future-proof) by spreading
 */
function sanitizeEvent(raw: unknown): LedgerEvent | null {
  if (!isRecord(raw)) return null;

  const type = normalizeEventType(raw.type);
  if (!type) return null;

  const createdAtISO = isValidISO(raw.createdAtISO) ? raw.createdAtISO : new Date().toISOString();
  const id = isString(raw.id) && raw.id.trim().length ? raw.id : uid();

  // For the discriminated union from lib/ledger/types.ts,
  // we return "as LedgerEvent" only after guaranteeing minimal shape.
  // Extra fields are preserved to avoid losing future schema.
  const base: any = { ...raw, id, type, createdAtISO };

  // Fix common array fields if present on snapshot-ish event
  // (INTENT_SNAPSHOT stores these at top-level).
  if (type === "INTENT_SNAPSHOT") {
    base.title = isString(base.title) ? base.title : "";
    base.context = isString(base.context) ? base.context : "";
    base.intent = isString(base.intent) ? base.intent : "";

    base.options = isStringArray(base.options) ? base.options : [];
    base.assumptions = isStringArray(base.assumptions) ? base.assumptions : [];
    base.risks = isStringArray(base.risks) ? base.risks : [];
    base.evidence = isStringArray(base.evidence) ? base.evidence : [];

    const c = base.confidence;
    base.confidence = c === "low" || c === "medium" || c === "high" ? c : "medium";

    if (base.outcome != null && !isString(base.outcome)) base.outcome = String(base.outcome);
    return base as LedgerEvent;
  }

  // DECISION / OUTCOME / COMPARE_RUN:
  // We keep best-effort sanitation without being overly strict
  // so we don't drop user's data accidentally.
  // The app code should create correct payloads anyway.
  if (type === "DECISION") {
    if (!isRecord(base.decision)) base.decision = { selectedOptionIndex: 0, rationale: "" };
    if (!isRecord(base.input)) {
      // fallback: if input not present, try to reconstruct from top-level if exists
      base.input = {
        title: isString(base.title) ? base.title : "",
        context: isString(base.context) ? base.context : "",
        intent: isString(base.intent) ? base.intent : "",
        options: isStringArray(base.options) ? base.options : [],
        assumptions: isStringArray(base.assumptions) ? base.assumptions : [],
        risks: isStringArray(base.risks) ? base.risks : [],
        evidence: isStringArray(base.evidence) ? base.evidence : [],
        confidence: base.confidence === "low" || base.confidence === "medium" || base.confidence === "high" ? base.confidence : "medium",
        outcome: isString(base.outcome) ? base.outcome : undefined,
      };
    }
    return base as LedgerEvent;
  }

  if (type === "OUTCOME") {
    if (!isRecord(base.outcome)) base.outcome = { summary: "" };
    if (!isRecord(base.input)) {
      base.input = {
        title: isString(base.title) ? base.title : "",
        context: isString(base.context) ? base.context : "",
        intent: isString(base.intent) ? base.intent : "",
        options: isStringArray(base.options) ? base.options : [],
        assumptions: isStringArray(base.assumptions) ? base.assumptions : [],
        risks: isStringArray(base.risks) ? base.risks : [],
        evidence: isStringArray(base.evidence) ? base.evidence : [],
        confidence: base.confidence === "low" || base.confidence === "medium" || base.confidence === "high" ? base.confidence : "medium",
        outcome: isString(base.outcome) ? base.outcome : undefined,
      };
    }
    return base as LedgerEvent;
  }

  if (type === "COMPARE_RUN") {
    if (!isRecord(base.compare)) base.compare = { prompt: "", enabled: {}, models: {}, winnerProvider: null, results: [] };
    // ensure compare.results is array
    if (!Array.isArray(base.compare.results)) base.compare.results = [];
    if (!isString(base.compare.prompt)) base.compare.prompt = "";
    if (!isRecord(base.compare.enabled)) base.compare.enabled = {};
    if (!isRecord(base.compare.models)) base.compare.models = {};
    // winnerProvider can be string or null
    if (base.compare.winnerProvider != null && !isString(base.compare.winnerProvider)) base.compare.winnerProvider = null;
    return base as LedgerEvent;
  }

  return null;
}

function normalizeLedger(raw: unknown): Ledger {
  if (!isRecord(raw)) return { version: VERSION, events: [] };

  const version = raw.version === VERSION ? VERSION : VERSION;
  const eventsRaw = Array.isArray(raw.events) ? raw.events : [];

  const events = eventsRaw
    .map(sanitizeEvent)
    .filter((e): e is LedgerEvent => !!e);

  // Ensure newest-first (createdAtISO descending)
  events.sort((a, b) => {
    const ta = new Date(a.createdAtISO).getTime();
    const tb = new Date(b.createdAtISO).getTime();
    return tb - ta;
  });

  return { version, events };
}

/* ---------------- API ---------------- */

export function loadLedger(): Ledger {
  if (typeof window === "undefined") return { version: VERSION, events: [] };

  const parsed = safeParse<unknown>(localStorage.getItem(KEY));
  return normalizeLedger(parsed);
}

export function saveLedger(ledger: Ledger) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ledger));
  } catch {
    // ignore (quota / private mode)
  }
}

export function appendEvent(evt: LedgerEvent) {
  const ledger = loadLedger();

  // sanitize the event before storing
  const clean = sanitizeEvent(evt);
  if (!clean) return;

  ledger.events.unshift(clean);
  saveLedger(ledger);
}

export function clearLedger() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
