"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Download, FileText, Search, Trash2, Loader2, X, ExternalLink, Printer } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";

import type { StoredReport } from "@/lib/gallery/types";
import { deleteReport, listReports } from "@/lib/gallery/storage";

/**
 * ✅ Premium button FX — NO GREEN
 * - clipped, premium, no bleed
 * - hover lift + sheen sweep
 * - neutral/cyan glow only (very subtle)
 */
function btnFx(extra = "") {
  return [
    "relative overflow-hidden isolate",
    "transition-[transform,background,box-shadow,border-color,opacity] duration-150 ease-out",
    "hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99]",
    "ring-1 ring-white/10 hover:ring-white/15",
    // ✅ neutral inset glow (no emerald/green)
    "hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.08),inset_0_0_18px_rgba(103,232,249,.08),0_0_0_1px_rgba(255,255,255,.04)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/25",
    // ✅ sheen sweep (clipped)
    "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-150",
    "after:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.12),transparent)]",
    "after:translate-x-[-35%] hover:after:translate-x-[35%] after:transition-transform after:duration-500",
    extra,
  ].join(" ");
}

function safeSlug(s: string) {
  return (s || "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);
}

async function fetchPDFBytes(html: string, filename: string) {
  const res = await fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename }),
  });

  if (!res.ok) {
    const msg = await res.json().catch(() => null);
    throw new Error(msg?.error ?? "PDF export failed.");
  }

  return new Uint8Array(await res.arrayBuffer());
}

type PreviewKind = "html" | "pdf";

type PreviewState = {
  open: boolean;
  kind: PreviewKind;
  report: StoredReport | null;
  url: string | null;
  downloadName: string;
  loading: boolean;
  error: string | null;
};

export default function GalleryPage() {
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<StoredReport[]>([]);

  // Theme state for preview modal
  const [previewTheme, setPreviewTheme] = useState<"dark" | "light">("dark");

  // cache object URLs per report id
  const htmlUrlMapRef = useRef<Map<string, string>>(new Map());
  const pdfUrlMapRef = useRef<Map<string, string>>(new Map());

  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const [preview, setPreview] = useState<PreviewState>({
    open: false,
    kind: "html",
    report: null,
    url: null,
    downloadName: "grounds-report.html",
    loading: false,
    error: null,
  });

  // Apply theme to iframe content
  function applyThemeToIframe(theme: "dark" | "light") {
    try {
      const frame = frameRef.current;
      if (frame?.contentDocument?.documentElement) {
        frame.contentDocument.documentElement.setAttribute("data-theme", theme);
        frame.contentDocument.documentElement.style.colorScheme = theme;
      }
    } catch {
      // Cross-origin or PDF - silently ignore
    }
  }

  function togglePreviewTheme() {
    const next = previewTheme === "dark" ? "light" : "dark";
    setPreviewTheme(next);
    applyThemeToIframe(next);
  }

  function cleanupAllUrls() {
    try {
      for (const [, url] of htmlUrlMapRef.current) URL.revokeObjectURL(url);
      for (const [, url] of pdfUrlMapRef.current) URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      htmlUrlMapRef.current.clear();
      pdfUrlMapRef.current.clear();
    }
  }

  useEffect(() => {
    try {
      setItems(listReports());
    } catch {
      setItems([]);
    }

    return () => {
      cleanupAllUrls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((r) => {
      const hay = `${r.title} ${r.grade} ${r.halfLife} ${r.readinessScore}`.toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  function refresh() {
    try {
      setItems(listReports());
    } catch {
      setItems([]);
    }
  }

  function remove(id: string) {
    deleteReport(id);

    const hu = htmlUrlMapRef.current.get(id);
    if (hu) {
      URL.revokeObjectURL(hu);
      htmlUrlMapRef.current.delete(id);
    }
    const pu = pdfUrlMapRef.current.get(id);
    if (pu) {
      URL.revokeObjectURL(pu);
      pdfUrlMapRef.current.delete(id);
    }

    // if the deleted one is open in preview, close it
    setPreview((p) => (p.open && p.report?.id === id ? { ...p, open: false } : p));

    refresh();
  }

  function ensureHTMLUrl(report: StoredReport) {
    const existing = htmlUrlMapRef.current.get(report.id);
    if (existing) return existing;

    const blob = new Blob([report.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    htmlUrlMapRef.current.set(report.id, url);
    return url;
  }

  async function ensurePDFUrl(report: StoredReport) {
    const existing = pdfUrlMapRef.current.get(report.id);
    if (existing) return existing;

    const bytes = await fetchPDFBytes(report.html, report.title || "grounds-report");
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    pdfUrlMapRef.current.set(report.id, url);
    return url;
  }

  function openPreviewHTML(report: StoredReport) {
    const url = ensureHTMLUrl(report);
    const name = `grounds-${safeSlug(report.title) || report.id}.html`;

    setPreview({
      open: true,
      kind: "html",
      report,
      url,
      downloadName: name,
      loading: false,
      error: null,
    });
  }

  async function openPreviewPDF(report: StoredReport) {
    const name = `grounds-${safeSlug(report.title) || report.id}.pdf`;

    // open modal first for responsive UI
    setPreview({
      open: true,
      kind: "pdf",
      report,
      url: null,
      downloadName: name,
      loading: true,
      error: null,
    });

    try {
      const url = await ensurePDFUrl(report);
      setPreview((p) => {
        if (!p.open || p.report?.id !== report.id) return p;
        return { ...p, url, loading: false, error: null };
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "PDF preview failed.";
      setPreview((p) => {
        if (!p.open || p.report?.id !== report.id) return p;
        return { ...p, url: null, loading: false, error: msg };
      });
    }
  }

  function closePreview() {
    setPreview((p) => ({ ...p, open: false, loading: false }));
  }

  function downloadFromPreview() {
    if (!preview.url || !preview.downloadName) return;
    try {
      const a = document.createElement("a");
      a.href = preview.url;
      a.download = preview.downloadName;
      a.rel = "noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      // ignore
    }
  }

  function openRawInTab() {
    if (!preview.url) return;
    try {
      window.open(preview.url, "_blank", "noopener,noreferrer");
    } catch {
      // ignore
    }
  }

  function printPdf() {
    if (preview.kind !== "pdf") return;
    try {
      const w = frameRef.current?.contentWindow;
      if (w) {
        w.focus();
        w.print();
        return;
      }
    } catch {
      // ignore
    }
    try {
      window.print();
    } catch {
      // ignore
    }
  }

  // close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && preview.open) closePreview();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview.open]);

  // ✅ shared border class (biar konsisten)
  const borderCls = "border border-white/10";

  return (
    <div className="space-y-6">
      {/* ✅ Inline Preview Modal - FULL SCREEN */}
      {preview.open ? (
        <div className="fixed inset-0 z-50">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/80" onClick={closePreview} aria-hidden="true" />

          {/* panel - FULL SCREEN */}
          <div className="absolute inset-0 flex flex-col">
            <div
              className={[
                "w-full h-full flex flex-col overflow-hidden",
                "bg-[#0b0c14]",
              ].join(" ")}
            >
              {/* top bar - compact */}
              <div className={["flex items-center justify-between gap-3 px-4 md:px-5 py-2.5", borderCls, "border-x-0 border-t-0 bg-white/5 shrink-0"].join(" ")}>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-white/85 truncate">
                    {preview.report?.title || "Report"}{" "}
                    <span className="text-white/45">· {preview.kind === "pdf" ? "PDF Review" : "HTML Review"}</span>
                  </div>
                  <div className="text-[11px] text-white/45">Review first. Download only from here.</div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Theme toggle (HTML only) */}
                  {preview.kind === "html" && (
                    <Button
                      variant="ghost"
                      onClick={togglePreviewTheme}
                      title={`Switch to ${previewTheme === "dark" ? "light" : "dark"} mode`}
                      className={btnFx()}
                    >
                      {previewTheme === "dark" ? "🌙" : "☀️"} {previewTheme === "dark" ? "Dark" : "Light"}
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    onClick={downloadFromPreview}
                    disabled={!preview.url || preview.loading}
                    title="Download from preview"
                    className={btnFx()}
                  >
                    <Download className="h-4 w-4" /> Download
                  </Button>

                  {preview.kind === "pdf" ? (
                    <Button
                      variant="secondary"
                      onClick={printPdf}
                      disabled={!preview.url || preview.loading}
                      title="Print PDF"
                      className={btnFx()}
                    >
                      <Printer className="h-4 w-4" /> Print
                    </Button>
                  ) : null}

                  <Button
                    variant="ghost"
                    onClick={openRawInTab}
                    disabled={!preview.url || preview.loading}
                    title="Open raw in new tab"
                    className={btnFx()}
                  >
                    <ExternalLink className="h-4 w-4" /> Open raw
                  </Button>

                  <Button variant="danger" onClick={closePreview} title="Close (Esc)" className={btnFx()}>
                    <X className="h-4 w-4" /> Close
                  </Button>
                </div>
              </div>

              {/* body - FULL HEIGHT */}
              <div className="relative flex-1 bg-[#0b0c14] overflow-hidden">
                {preview.loading ? (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="flex flex-col items-center gap-4">
                      {/* Animated loading spinner with gradient */}
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full border-2 border-white/10" />
                        <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
                      </div>
                      <div className="text-[13px] text-white/60 animate-pulse">Preparing preview…</div>
                    </div>
                  </div>
                ) : preview.error ? (
                  <div className="absolute inset-0 grid place-items-center p-6">
                    <div className="max-w-xl rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4">
                      <div className="text-[13px] font-medium text-rose-50">Preview failed</div>
                      <div className="mt-1 text-[12px] text-rose-100/70">{preview.error}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => preview.report && openPreviewHTML(preview.report)}
                          disabled={!preview.report}
                          title="Fallback to HTML preview"
                          className={btnFx()}
                        >
                          <FileText className="h-4 w-4" /> Open as HTML
                        </Button>
                        <Button variant="danger" onClick={closePreview} className={btnFx()}>
                          <X className="h-4 w-4" /> Close
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : preview.url ? (
                  <iframe
                    ref={frameRef}
                    className="absolute inset-0 h-full w-full border-0 bg-[#0b0c14]"
                    src={preview.url}
                    title="Report preview"
                    referrerPolicy="no-referrer"
                    onLoad={() => applyThemeToIframe(previewTheme)}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-[12px] text-white/50">No preview asset.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={reduce ? false : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-start justify-between gap-3"
      >
        <div>
          <div className="text-[28px] md:text-[34px] font-semibold tracking-tight leading-[1.1]">Report Gallery</div>
          <div className="mt-2 text-[13px] text-dim max-w-2xl">
            Your saved reports (local to this browser). Search, preview HTML/PDF, then download from inside the review panel.
          </div>
        </div>

        <div className="flex gap-2">
          <a href="/" className="inline-flex">
            <Button variant="secondary" className={btnFx()}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </a>
        </div>
      </motion.div>

      <Card>
        <CardHeader title="Search" subtitle="Type to filter by title, grade, or status." right={<Chip label={`${filtered.length} items`} tone="info" />} />
        <CardContent>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45">
              <Search className="h-4 w-4" />
            </div>
            <Input value={q} onChange={setQ} placeholder="Search reports…" className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((r) => (
          <motion.div key={r.id} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Card className="h-full">
              <CardHeader
                title={r.title}
                subtitle={new Date(r.generatedAtISO).toLocaleString()}
                right={
                  <div className="flex gap-2">
                    <Chip
                      label={`Grade ${r.grade}`}
                      tone={r.grade === "A" ? "good" : r.grade === "B" ? "info" : r.grade === "C" ? "warn" : "bad"}
                    />
                  </div>
                }
              />
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    label={`Readiness ${r.readinessScore}/100`}
                    tone={
                      r.readinessScore >= 80 ? "good" : r.readinessScore >= 65 ? "info" : r.readinessScore >= 50 ? "warn" : "bad"
                    }
                  />
                  <Chip label={`Half-life ${r.halfLife}`} tone={r.halfLife === "stable" ? "good" : r.halfLife === "degrading" ? "warn" : "bad"} />
                  <Chip label={`Blind spots ${r.blindSpotScore}/100`} tone={r.blindSpotScore >= 80 ? "good" : r.blindSpotScore >= 60 ? "warn" : "bad"} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    onClick={() => openPreviewHTML(r)}
                    title="Preview HTML (download only inside preview)"
                    className={btnFx("w-auto")}
                  >
                    <FileText className="h-4 w-4" /> HTML
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => openPreviewPDF(r)}
                    title="Preview PDF (download/print only inside preview)"
                    className={btnFx("w-auto")}
                  >
                    <Download className="h-4 w-4" /> PDF
                  </Button>

                  <Button variant="danger" onClick={() => remove(r.id)} title="Delete this saved report" className={btnFx("w-auto")}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>

                <div className="mt-3 text-[12px] text-faint">
                  Tip 💡 Review it in the panel first, then download from there (so you don’t spam downloads).
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {!filtered.length ? (
        <div className="text-[13px] text-faint">
          No reports yet. Go back and click <span className="text-white/80 font-medium">Generate Report</span> to create your first one.
        </div>
      ) : null}
    </div>
  );
}
