"use client";

import type { CompareBundle, StoredReport } from "./types";

const KEY = "grounds:reports:v0";
const MAX_ITEMS = 200;

// Legacy keys (from earlier iterations / fallback)
const LEGACY_KEYS = [
  "grounds.gallery.reports",
  "grounds_reports",
  "gallery_reports",
  "reports",
  "grounds:reports",
] as const;

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/**
 * Minimal runtime guard:
 * - prevents crashes if legacy keys contain junk
 * - avoids silently "accepting" nonsense that breaks UI later
 */
function isStoredReport(x: unknown): x is StoredReport {
  if (!x || typeof x !== "object") return false;
  const r = x as any;

  return (
    typeof r.id === "string" &&
    typeof r.title === "string" &&
    typeof r.createdAtISO === "string" &&
    typeof r.generatedAtISO === "string" &&
    typeof r.readinessScore === "number" &&
    (r.grade === "A" || r.grade === "B" || r.grade === "C" || r.grade === "D") &&
    (r.halfLife === "stable" || r.halfLife === "degrading" || r.halfLife === "expired") &&
    typeof r.blindSpotScore === "number" &&
    typeof r.html === "string"
  );
}

function uniqById(items: StoredReport[]) {
  const map = new Map<string, StoredReport>();
  for (const r of items) {
    if (r?.id) map.set(r.id, r);
  }
  return Array.from(map.values());
}

function sortByGeneratedDesc(items: StoredReport[]) {
  return items
    .slice()
    .sort((a, b) => (b.generatedAtISO || "").localeCompare(a.generatedAtISO || ""));
}

function pruneAndSort(items: StoredReport[]) {
  return sortByGeneratedDesc(uniqById(items)).slice(0, MAX_ITEMS);
}

function loadFromKey(key: string): StoredReport[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  const parsed = safeParse<unknown>(raw);

  // Accept arrays, but filter strictly to valid StoredReport items.
  if (Array.isArray(parsed)) {
    return (parsed as unknown[]).filter(isStoredReport) as StoredReport[];
  }

  return [];
}

function saveToKey(key: string, items: StoredReport[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Quota / private mode / blocked storage — ignore to avoid crashing UI.
  }
}

/**
 * Load all reports from the canonical KEY.
 * If empty, try legacy keys and migrate them into KEY.
 */
function loadAll(): StoredReport[] {
  if (typeof window === "undefined") return [];

  const current = loadFromKey(KEY);
  if (current.length > 0) return pruneAndSort(current);

  // Migrate from legacy keys (first time only)
  const legacyCombined: StoredReport[] = [];
  for (const k of LEGACY_KEYS) legacyCombined.push(...loadFromKey(k));

  if (legacyCombined.length > 0) {
    const migrated = pruneAndSort(legacyCombined);
    saveToKey(KEY, migrated);
    return migrated;
  }

  return [];
}

function saveAll(items: StoredReport[]) {
  saveToKey(KEY, pruneAndSort(items));
}

export function listReports(): StoredReport[] {
  return sortByGeneratedDesc(loadAll());
}

export function getReport(id: string): StoredReport | null {
  return loadAll().find((r) => r.id === id) ?? null;
}

export function saveReport(report: StoredReport) {
  const items = loadAll();
  const next = [report, ...items.filter((x) => x.id !== report.id)];
  saveAll(next);
}

export function deleteReport(id: string) {
  const items = loadAll().filter((x) => x.id !== id);
  saveAll(items);
}

export function clearReports() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(KEY);
    // Also clear legacy keys so “Clear” truly clears.
    for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

/**
 * Optional helper:
 * Attach/replace compare bundle for an existing report.
 * Useful when you generate compare first, then later "Process" and want to persist it.
 */
export function attachCompareBundle(reportId: string, bundle: CompareBundle) {
  const items = loadAll();
  const idx = items.findIndex((r) => r.id === reportId);
  if (idx === -1) return;

  const updated: StoredReport = {
    ...items[idx],
    compareBundle: bundle,
  };

  const next = [updated, ...items.filter((x) => x.id !== reportId)];
  saveAll(next);
}
