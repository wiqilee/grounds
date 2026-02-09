// components/visualizations/GoogleExport.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Table,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Download,
  Check,
} from "lucide-react";

interface AnalysisData {
  readiness?: {
    score: number;
    grade: string;
    highlights?: string[];
    warnings?: string[];
  };
  halfLife?: {
    status: string;
    score?: number;
    factors?: string[];
  };
  blindSpots?: {
    score: number;
    items?: string[];
  };
  completeness?: number;
  actionability?: number;
}

interface GoogleExportProps {
  title: string;
  content: {
    summary?: string;
    context?: string;
    intent?: string;
    options?: string[];
    assumptions?: string[];
    risks?: string[];
    evidence?: string[];
    outcome?: string;
    analysis?: AnalysisData;
    recommendations?: string[];
    conclusion?: {
      summary?: string;
      confidence?: string;
      keyTakeaways?: string[];
      nextSteps?: string[];
      recommendation?: string;
      reviewDate?: string;
    };
    sentiment?: {
      overall?: string;
      overallConfidence?: number;
      aspects?: Array<{
        aspect: string;
        sentiment: string;
        confidence: number;
        keySignals?: string[];
      }>;
    };
    compare?: {
      winner?: string;
      providers?: Array<{
        name: string;
        score: number;
        latency: number;
        model?: string;
        bestOption?: string;
      }>;
    };
    geminiCritic?: {
      hardEdgesMissing?: Array<{ missing: string; suggestedMetrics?: string[] }>;
      genericLanguage?: Array<{ phrase: string; rewriteConcrete?: string }>;
      blindSpots?: Array<{ blindSpot: string; whyItMatters?: string }>;
      nextActions?: Array<{ action: string; why?: string; timebox?: string }>;
      clarificationQuestions?: string[];
    };
    monteCarlo?: {
      readiness?: number;
      riskCoverage?: number;
      evidenceQuality?: number;
      assumptionClarity?: number;
      actionability?: number;
      confidence?: number;
      // Legacy fields
      mean?: number;
      median?: number;
      stdDev?: number;
      min?: number;
      max?: number;
      confidence95?: { low: number; high: number };
      iterations?: number;
    };
  };
  onClose?: () => void;
  onToast?: (msg: string) => void;
  className?: string;
}

type ExportType = "docs" | "sheets" | "drive";
type CopyStatus = "idle" | "copying" | "copied" | "error";

export function GoogleExportModal({
  title,
  content,
  onClose,
  onToast,
  className = "",
}: GoogleExportProps) {
  const [selectedType, setSelectedType] = useState<ExportType>("docs");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const exportOptions = [
    {
      id: "docs" as ExportType,
      name: "Google Docs",
      icon: FileText,
      description: "Full formatted report (copy & paste)",
      color: "blue",
    },
    {
      id: "sheets" as ExportType,
      name: "Google Sheets",
      icon: Table,
      description: "Data tables as TSV (copy & paste)",
      color: "emerald",
    },
  ];

  // Format for Google Docs (clean plain text without markdown)
  const formatForDocs = (): string => {
    const lines: string[] = [];
    const divider = "────────────────────────────────────────";
    const heavyDivider = "════════════════════════════════════════";
    
    lines.push(heavyDivider);
    lines.push("        GROUNDS DECISION REPORT");
    lines.push(heavyDivider);
    lines.push("");
    lines.push(`TITLE: ${title}`);
    lines.push(`DATE: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`);
    lines.push("");

    // Summary Section
    if (content.summary || content.analysis?.readiness) {
      lines.push(divider);
      lines.push("EXECUTIVE SUMMARY");
      lines.push(divider);
      lines.push("");
      if (content.analysis?.readiness) {
        lines.push(`Readiness Score ........ ${content.analysis.readiness.score}/100 (Grade ${content.analysis.readiness.grade})`);
      }
      if (content.analysis?.completeness) {
        lines.push(`Completeness ........... ${content.analysis.completeness}%`);
      }
      if (content.analysis?.actionability) {
        lines.push(`Actionability .......... ${content.analysis.actionability}%`);
      }
      if (content.analysis?.halfLife) {
        lines.push(`Half-Life Status ....... ${content.analysis.halfLife.status}`);
      }
      if (content.analysis?.blindSpots) {
        lines.push(`Blind Spots Score ...... ${content.analysis.blindSpots.score}/100`);
      }
      lines.push("");
    }

    // Context
    if (content.context) {
      lines.push(divider);
      lines.push("CONTEXT");
      lines.push(divider);
      lines.push("");
      lines.push(content.context);
      lines.push("");
    }

    // Intent
    if (content.intent) {
      lines.push(divider);
      lines.push("INTENT");
      lines.push(divider);
      lines.push("");
      lines.push(content.intent);
      lines.push("");
    }

    // Options
    if (content.options?.length) {
      lines.push(divider);
      lines.push("OPTIONS");
      lines.push(divider);
      lines.push("");
      content.options.forEach((opt, i) => {
        lines.push(`  ${i + 1}. ${opt}`);
      });
      lines.push("");
    }

    // Assumptions
    if (content.assumptions?.length) {
      lines.push(divider);
      lines.push("ASSUMPTIONS");
      lines.push(divider);
      lines.push("");
      content.assumptions.forEach((a, i) => {
        lines.push(`  ${i + 1}. ${a}`);
      });
      lines.push("");
    }

    // Risks
    if (content.risks?.length) {
      lines.push(divider);
      lines.push("RISKS");
      lines.push(divider);
      lines.push("");
      content.risks.forEach((r, i) => {
        lines.push(`  ${i + 1}. ${r}`);
      });
      lines.push("");
    }

    // Evidence
    if (content.evidence?.length) {
      lines.push(divider);
      lines.push("EVIDENCE");
      lines.push(divider);
      lines.push("");
      content.evidence.forEach((e, i) => {
        lines.push(`  ${i + 1}. ${e}`);
      });
      lines.push("");
    }

    // Analysis Highlights
    if (content.analysis?.readiness?.highlights?.length) {
      lines.push(divider);
      lines.push("STRENGTHS");
      lines.push(divider);
      lines.push("");
      content.analysis.readiness.highlights.forEach((h) => {
        lines.push(`  • ${h}`);
      });
      lines.push("");
    }

    // Analysis Warnings
    if (content.analysis?.readiness?.warnings?.length) {
      lines.push(divider);
      lines.push("AREAS TO IMPROVE");
      lines.push(divider);
      lines.push("");
      content.analysis.readiness.warnings.forEach((w) => {
        lines.push(`  • ${w}`);
      });
      lines.push("");
    }

    // Blind Spots
    if (content.analysis?.blindSpots?.items?.length) {
      lines.push(divider);
      lines.push("BLIND SPOTS DETECTED");
      lines.push(divider);
      lines.push("");
      content.analysis.blindSpots.items.forEach((b) => {
        lines.push(`  • ${b}`);
      });
      lines.push("");
    }

    // Gemini Critic Results
    if (content.geminiCritic) {
      const critic = content.geminiCritic;
      
      if (critic.hardEdgesMissing?.length) {
        lines.push(divider);
        lines.push("GEMINI CRITIC: HARD EDGES MISSING");
        lines.push(divider);
        lines.push("");
        critic.hardEdgesMissing.forEach((item, i) => {
          lines.push(`  ${i + 1}. ${item.missing}`);
          if (item.suggestedMetrics?.length) {
            lines.push(`     Suggested: ${item.suggestedMetrics.join(", ")}`);
          }
        });
        lines.push("");
      }

      if (critic.genericLanguage?.length) {
        lines.push(divider);
        lines.push("GEMINI CRITIC: GENERIC LANGUAGE");
        lines.push(divider);
        lines.push("");
        critic.genericLanguage.forEach((item, i) => {
          lines.push(`  ${i + 1}. "${item.phrase}"`);
          if (item.rewriteConcrete) {
            lines.push(`     Better: ${item.rewriteConcrete}`);
          }
        });
        lines.push("");
      }

      if (critic.blindSpots?.length) {
        lines.push(divider);
        lines.push("GEMINI CRITIC: BLIND SPOTS");
        lines.push(divider);
        lines.push("");
        critic.blindSpots.forEach((item, i) => {
          lines.push(`  ${i + 1}. ${item.blindSpot}`);
          if (item.whyItMatters) {
            lines.push(`     Why: ${item.whyItMatters}`);
          }
        });
        lines.push("");
      }

      if (critic.nextActions?.length) {
        lines.push(divider);
        lines.push("GEMINI CRITIC: RECOMMENDED ACTIONS");
        lines.push(divider);
        lines.push("");
        critic.nextActions.forEach((item, i) => {
          lines.push(`  ${i + 1}. ${item.action}`);
          if (item.timebox) lines.push(`     Timebox: ${item.timebox}`);
          if (item.why) lines.push(`     Why: ${item.why}`);
        });
        lines.push("");
      }

      if (critic.clarificationQuestions?.length) {
        lines.push(divider);
        lines.push("GEMINI CRITIC: CLARIFICATION QUESTIONS");
        lines.push(divider);
        lines.push("");
        critic.clarificationQuestions.forEach((q, i) => {
          lines.push(`  ${i + 1}. ${q}`);
        });
        lines.push("");
      }
    }

    // Sentiment Analysis
    if (content.sentiment?.aspects?.length) {
      lines.push(divider);
      lines.push("SENTIMENT ANALYSIS");
      lines.push(divider);
      lines.push("");
      lines.push(`Overall Sentiment: ${content.sentiment.overall || "Mixed"}`);
      if (content.sentiment.overallConfidence) {
        lines.push(`Overall Confidence: ${content.sentiment.overallConfidence}%`);
      }
      lines.push("");
      lines.push("By Aspect:");
      content.sentiment.aspects.forEach((a) => {
        lines.push(`  • ${a.aspect}: ${a.sentiment} (${a.confidence}% confidence)`);
        if (a.keySignals?.length) {
          lines.push(`    Signals: ${a.keySignals.join(", ")}`);
        }
      });
      lines.push("");
    }

    // Monte Carlo / Radar Analysis
    if (content.monteCarlo) {
      const mc = content.monteCarlo;
      lines.push(divider);
      lines.push("DECISION RADAR ANALYSIS");
      lines.push(divider);
      lines.push("");
      
      // Radar metrics (from radarData)
      if (mc.readiness !== undefined) lines.push(`Readiness ............. ${mc.readiness}/100`);
      if (mc.riskCoverage !== undefined) lines.push(`Risk Coverage ......... ${mc.riskCoverage}/100`);
      if (mc.evidenceQuality !== undefined) lines.push(`Evidence Quality ...... ${mc.evidenceQuality}/100`);
      if (mc.assumptionClarity !== undefined) lines.push(`Assumption Clarity .... ${mc.assumptionClarity}/100`);
      if (mc.actionability !== undefined) lines.push(`Actionability ......... ${mc.actionability}/100`);
      if (mc.confidence !== undefined) lines.push(`Confidence ............ ${mc.confidence}/100`);
      
      // Legacy Monte Carlo fields (if present)
      if (mc.iterations) lines.push(`Iterations ............ ${mc.iterations.toLocaleString()}`);
      if (mc.mean !== undefined) lines.push(`Expected Value ........ ${mc.mean.toFixed(1)}`);
      if (mc.median !== undefined) lines.push(`Median ................ ${mc.median.toFixed(1)}`);
      if (mc.stdDev !== undefined) lines.push(`Std Deviation ......... ${mc.stdDev.toFixed(2)}`);
      if (mc.min !== undefined && mc.max !== undefined) {
        lines.push(`Range ................. ${mc.min.toFixed(1)} - ${mc.max.toFixed(1)}`);
      }
      if (mc.confidence95) {
        lines.push(`95% Confidence ........ ${mc.confidence95.low.toFixed(1)} - ${mc.confidence95.high.toFixed(1)}`);
      }
      lines.push("");
    }

    // Provider Comparison
    if (content.compare?.providers?.length) {
      lines.push(divider);
      lines.push("AI PROVIDER COMPARISON");
      lines.push(divider);
      lines.push("");
      if (content.compare.winner) {
        lines.push(`🏆 WINNER: ${content.compare.winner.toUpperCase()}`);
        lines.push("");
      }
      lines.push("Results by Provider:");
      content.compare.providers.forEach((p) => {
        lines.push(`  • ${p.name.toUpperCase()}`);
        lines.push(`    Score: ${p.score}/100 | Latency: ${p.latency}ms`);
        if (p.model) lines.push(`    Model: ${p.model}`);
        if (p.bestOption) lines.push(`    Best Option: ${p.bestOption}`);
        lines.push("");
      });
    }

    // Conclusion
    if (content.conclusion) {
      lines.push(divider);
      lines.push("EXECUTIVE CONCLUSION");
      lines.push(divider);
      lines.push("");
      if (content.conclusion.summary) {
        lines.push(content.conclusion.summary);
        lines.push("");
      }
      if (content.conclusion.recommendation) {
        lines.push(`Recommendation: ${content.conclusion.recommendation}`);
        lines.push("");
      }
      if (content.conclusion.confidence) {
        lines.push(`Confidence: ${content.conclusion.confidence}`);
        lines.push("");
      }
      if (content.conclusion.keyTakeaways?.length) {
        lines.push("Key Takeaways:");
        content.conclusion.keyTakeaways.forEach((t, i) => {
          lines.push(`  ${i + 1}. ${t}`);
        });
        lines.push("");
      }
      if (content.conclusion.nextSteps?.length) {
        lines.push("Next Steps:");
        content.conclusion.nextSteps.forEach((s, i) => {
          lines.push(`  ${i + 1}. ${s}`);
        });
        lines.push("");
      }
      if (content.conclusion.reviewDate) {
        lines.push(`Review Date: ${content.conclusion.reviewDate}`);
        lines.push("");
      }
    }

    // Recommendations
    if (content.recommendations?.length) {
      lines.push(divider);
      lines.push("RECOMMENDATIONS");
      lines.push(divider);
      lines.push("");
      content.recommendations.forEach((r, i) => {
        lines.push(`  ${i + 1}. ${r}`);
      });
      lines.push("");
    }

    // Outcome
    if (content.outcome) {
      lines.push(divider);
      lines.push("SELECTED OUTCOME");
      lines.push(divider);
      lines.push("");
      lines.push(content.outcome);
      lines.push("");
    }

    lines.push(heavyDivider);
    lines.push("");
    lines.push("Generated by Grounds - Decision Intelligence Workspace");
    lines.push("Powered by Google Gemini 3");
    lines.push("https://grounds.app");

    return lines.join("\n");
  };

  // Format for Google Sheets (TSV - Tab Separated Values)
  const formatForSheets = (): string => {
    const rows: string[][] = [];

    // Header row
    rows.push(["GROUNDS DECISION REPORT", "", ""]);
    rows.push(["Title", title, ""]);
    rows.push(["Generated", new Date().toISOString(), ""]);
    rows.push(["", "", ""]);

    // Metrics Section
    rows.push(["METRICS", "VALUE", "DETAILS"]);
    
    if (content.analysis?.readiness) {
      rows.push(["Readiness Score", String(content.analysis.readiness.score), `Grade ${content.analysis.readiness.grade}`]);
    }
    if (content.analysis?.completeness !== undefined) {
      rows.push(["Completeness", `${content.analysis.completeness}%`, ""]);
    }
    if (content.analysis?.actionability !== undefined) {
      rows.push(["Actionability", `${content.analysis.actionability}%`, ""]);
    }
    if (content.analysis?.halfLife) {
      rows.push(["Half-Life Status", content.analysis.halfLife.status, ""]);
    }
    if (content.analysis?.blindSpots) {
      rows.push(["Blind Spots Score", String(content.analysis.blindSpots.score), ""]);
    }

    rows.push(["", "", ""]);

    // Options Section
    if (content.options?.length) {
      rows.push(["OPTIONS", "", ""]);
      content.options.forEach((opt, i) => {
        rows.push([`Option ${i + 1}`, opt, ""]);
      });
      rows.push(["", "", ""]);
    }

    // Assumptions Section
    if (content.assumptions?.length) {
      rows.push(["ASSUMPTIONS", "", ""]);
      content.assumptions.forEach((a, i) => {
        rows.push([`Assumption ${i + 1}`, a, ""]);
      });
      rows.push(["", "", ""]);
    }

    // Risks Section
    if (content.risks?.length) {
      rows.push(["RISKS", "", ""]);
      content.risks.forEach((r, i) => {
        rows.push([`Risk ${i + 1}`, r, ""]);
      });
      rows.push(["", "", ""]);
    }

    // Evidence Section
    if (content.evidence?.length) {
      rows.push(["EVIDENCE", "", ""]);
      content.evidence.forEach((e, i) => {
        rows.push([`Evidence ${i + 1}`, e, ""]);
      });
      rows.push(["", "", ""]);
    }

    // Strengths
    if (content.analysis?.readiness?.highlights?.length) {
      rows.push(["STRENGTHS", "", ""]);
      content.analysis.readiness.highlights.forEach((h, i) => {
        rows.push([`Strength ${i + 1}`, h, ""]);
      });
      rows.push(["", "", ""]);
    }

    // Warnings
    if (content.analysis?.readiness?.warnings?.length) {
      rows.push(["AREAS TO IMPROVE", "", ""]);
      content.analysis.readiness.warnings.forEach((w, i) => {
        rows.push([`Area ${i + 1}`, w, ""]);
      });
      rows.push(["", "", ""]);
    }

    // Blind Spots
    if (content.analysis?.blindSpots?.items?.length) {
      rows.push(["BLIND SPOTS", "", ""]);
      content.analysis.blindSpots.items.forEach((b, i) => {
        rows.push([`Blind Spot ${i + 1}`, b, ""]);
      });
      rows.push(["", "", ""]);
    }

    // Gemini Critic
    if (content.geminiCritic) {
      const critic = content.geminiCritic;
      
      if (critic.hardEdgesMissing?.length) {
        rows.push(["GEMINI CRITIC: HARD EDGES", "", ""]);
        critic.hardEdgesMissing.forEach((item, i) => {
          rows.push([`Missing ${i + 1}`, item.missing, item.suggestedMetrics?.join(", ") || ""]);
        });
        rows.push(["", "", ""]);
      }

      if (critic.genericLanguage?.length) {
        rows.push(["GEMINI CRITIC: GENERIC LANGUAGE", "BETTER ALTERNATIVE", ""]);
        critic.genericLanguage.forEach((item, i) => {
          rows.push([item.phrase, item.rewriteConcrete || "", ""]);
        });
        rows.push(["", "", ""]);
      }

      if (critic.blindSpots?.length) {
        rows.push(["GEMINI CRITIC: BLIND SPOTS", "WHY IT MATTERS", ""]);
        critic.blindSpots.forEach((item, i) => {
          rows.push([item.blindSpot, item.whyItMatters || "", ""]);
        });
        rows.push(["", "", ""]);
      }

      if (critic.nextActions?.length) {
        rows.push(["GEMINI CRITIC: ACTIONS", "TIMEBOX", "WHY"]);
        critic.nextActions.forEach((item, i) => {
          rows.push([item.action, item.timebox || "", item.why || ""]);
        });
        rows.push(["", "", ""]);
      }

      if (critic.clarificationQuestions?.length) {
        rows.push(["GEMINI CRITIC: QUESTIONS", "", ""]);
        critic.clarificationQuestions.forEach((q, i) => {
          rows.push([`Question ${i + 1}`, q, ""]);
        });
        rows.push(["", "", ""]);
      }
    }

    // Sentiment Analysis
    if (content.sentiment?.aspects?.length) {
      rows.push(["SENTIMENT ANALYSIS", "SENTIMENT", "CONFIDENCE"]);
      rows.push(["Overall", content.sentiment.overall || "Mixed", content.sentiment.overallConfidence ? `${content.sentiment.overallConfidence}%` : ""]);
      content.sentiment.aspects.forEach((a) => {
        rows.push([a.aspect, a.sentiment, `${a.confidence}%`]);
      });
      rows.push(["", "", ""]);
    }

    // Decision Radar / Monte Carlo
    if (content.monteCarlo) {
      const mc = content.monteCarlo;
      rows.push(["DECISION RADAR", "SCORE", ""]);
      if (mc.readiness !== undefined) rows.push(["Readiness", String(mc.readiness), ""]);
      if (mc.riskCoverage !== undefined) rows.push(["Risk Coverage", String(mc.riskCoverage), ""]);
      if (mc.evidenceQuality !== undefined) rows.push(["Evidence Quality", String(mc.evidenceQuality), ""]);
      if (mc.assumptionClarity !== undefined) rows.push(["Assumption Clarity", String(mc.assumptionClarity), ""]);
      if (mc.actionability !== undefined) rows.push(["Actionability", String(mc.actionability), ""]);
      if (mc.confidence !== undefined) rows.push(["Confidence", String(mc.confidence), ""]);
      rows.push(["", "", ""]);
    }

    // Provider Comparison
    if (content.compare?.providers?.length) {
      rows.push(["AI PROVIDER COMPARISON", "SCORE", "LATENCY"]);
      if (content.compare.winner) {
        rows.push(["🏆 WINNER", content.compare.winner.toUpperCase(), ""]);
      }
      rows.push(["", "", ""]);
      rows.push(["PROVIDER", "SCORE", "BEST OPTION"]);
      content.compare.providers.forEach((p) => {
        rows.push([p.name.toUpperCase(), `${p.score}/100 (${p.latency}ms)`, p.bestOption || ""]);
      });
      rows.push(["", "", ""]);
    }

    // Conclusion
    if (content.conclusion) {
      rows.push(["CONCLUSION", "", ""]);
      if (content.conclusion.confidence) {
        rows.push(["Confidence", content.conclusion.confidence, ""]);
      }
      if (content.conclusion.keyTakeaways?.length) {
        content.conclusion.keyTakeaways.forEach((t, i) => {
          rows.push([`Takeaway ${i + 1}`, t, ""]);
        });
      }
      if (content.conclusion.nextSteps?.length) {
        content.conclusion.nextSteps.forEach((s, i) => {
          rows.push([`Next Step ${i + 1}`, s, ""]);
        });
      }
      rows.push(["", "", ""]);
    }

    // Recommendations
    if (content.recommendations?.length) {
      rows.push(["RECOMMENDATIONS", "", ""]);
      content.recommendations.forEach((r, i) => {
        rows.push([`Recommendation ${i + 1}`, r, ""]);
      });
      rows.push(["", "", ""]);
    }

    // Footer
    rows.push(["", "", ""]);
    rows.push(["Generated by", "Grounds - Decision Intelligence", ""]);
    rows.push(["Powered by", "Google Gemini 3", ""]);

    // Convert to TSV
    return rows.map(row => row.join("\t")).join("\n");
  };

  // Generate export URL
  const getExportUrl = (): string => {
    const timestamp = new Date().toISOString().split("T")[0];
    const fileName = `Grounds_${title.replace(/\s+/g, "_")}_${timestamp}`;
    
    if (selectedType === "docs") {
      return `https://docs.google.com/document/create?title=${encodeURIComponent(fileName)}`;
    } else if (selectedType === "sheets") {
      return `https://docs.google.com/spreadsheets/create?title=${encodeURIComponent(fileName)}`;
    } else {
      return `https://drive.google.com/drive/my-drive`;
    }
  };

  // Step 1: Copy to clipboard
  const handleCopy = async () => {
    if (selectedType === "drive") {
      // For Drive, just set URL and mark as ready
      setExportUrl(getExportUrl());
      setCopyStatus("copied");
      return;
    }
    
    setCopyStatus("copying");
    
    try {
      const text = selectedType === "sheets" ? formatForSheets() : formatForDocs();
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
      setExportUrl(getExportUrl());
      onToast?.("✓ Copied! Now click 'Open' button below.");
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      setCopyStatus("error");
      onToast?.("Copy failed - please try again");
    }
  };

  // Step 2: Open Google app (only enabled after copy)
  const handleOpen = () => {
    const url = exportUrl || getExportUrl();
    window.open(url, "_blank");
  };

  // Reset when changing type
  const handleTypeChange = (type: ExportType) => {
    setSelectedType(type);
    setCopyStatus("idle");
    setExportUrl(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-md rounded-2xl bg-[#0d0e16] border border-white/10 shadow-2xl overflow-hidden ${className}`}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path
                      d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"
                      fill="#4285F4"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Export to Google</h3>
                  <p className="text-xs text-white/50">Choose format & destination</p>
                </div>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Export Type Selection */}
            <div className="space-y-2">
              {exportOptions.map((option) => {
                const isSelected = selectedType === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleTypeChange(option.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isSelected
                        ? option.color === "blue"
                          ? "bg-blue-500/10 border-blue-500/30"
                          : option.color === "emerald"
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-amber-500/10 border-amber-500/30"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? option.color === "blue"
                            ? "bg-blue-500/20"
                            : option.color === "emerald"
                            ? "bg-emerald-500/20"
                            : "bg-amber-500/20"
                          : "bg-white/5"
                      }`}
                    >
                      <option.icon
                        className={`w-5 h-5 ${
                          isSelected
                            ? option.color === "blue"
                              ? "text-blue-400"
                              : option.color === "emerald"
                              ? "text-emerald-400"
                              : "text-amber-400"
                            : "text-white/50"
                        }`}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`font-medium ${isSelected ? "text-white" : "text-white/70"}`}>
                        {option.name}
                      </div>
                      <div className="text-xs text-white/40">{option.description}</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? option.color === "blue"
                            ? "border-blue-400 bg-blue-400"
                            : option.color === "emerald"
                            ? "border-emerald-400 bg-emerald-400"
                            : "border-amber-400 bg-amber-400"
                          : "border-white/20"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Two-Step Action Area */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  copyStatus === "copied" ? "bg-emerald-500 text-white" : "bg-white/20 text-white/70"
                }`}>
                  {copyStatus === "copied" ? "✓" : "1"}
                </span>
                <span className={copyStatus === "copied" ? "text-emerald-400" : ""}>
                  Copy report
                </span>
                <div className="flex-1 border-t border-white/10" />
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  copyStatus === "copied" ? "bg-white/20 text-white/70" : "bg-white/10 text-white/30"
                }`}>
                  2
                </span>
                <span className={copyStatus === "copied" ? "text-white/70" : "text-white/30"}>
                  Open & paste
                </span>
              </div>

              {/* Status Messages */}
              {copyStatus === "idle" && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-300">
                    Click "Copy Report" first, then you can open Google {selectedType === "docs" ? "Docs" : "Sheets"}.
                  </span>
                </div>
              )}

              {copyStatus === "copying" && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                  <span className="text-xs text-blue-300">Copying to clipboard...</span>
                </div>
              )}

              {copyStatus === "copied" && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-emerald-300">
                    Copied! Now click Open, then paste (Ctrl+V / ⌘+V).
                  </span>
                </div>
              )}

              {copyStatus === "error" && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs text-red-300">Copy failed. Please try again.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  disabled={copyStatus === "copying"}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    copyStatus === "copied"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:opacity-90"
                  }`}
                >
                  {copyStatus === "copying" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : copyStatus === "copied" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copyStatus === "copied" ? "Copied!" : "Copy Report"}
                </button>
                
                <button
                  onClick={handleOpen}
                  disabled={copyStatus !== "copied"}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    copyStatus === "copied"
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-white/10 text-white/30 cursor-not-allowed"
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open {selectedType === "docs" ? "Docs" : "Sheets"}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div className="text-xs text-white/60">
                  {selectedType === "docs" ? (
                    <>
                      <strong className="text-white/80">Google Docs:</strong> After copying, paste into a new 
                      Google Doc. The report will be formatted with sections and metrics.
                    </>
                  ) : (
                    <>
                      <strong className="text-white/80">Google Sheets:</strong> After copying, paste into 
                      Google Sheets. Data is tab-separated and columns will auto-align.
                    </>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-white/30 text-center">
              💡 For complete report with charts & visualizations, use PDF download from main screen.
            </p>
          </div>

          {/* Simple Footer */}
          <div className="px-5 py-3 border-t border-white/10 bg-white/5">
            <p className="text-[10px] text-white/40 text-center">
              Powered by Grounds • Decision Intelligence Workspace
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact export button for toolbar
export function GoogleExportButton({
  onClick,
  disabled = false,
  className = "",
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-all disabled:opacity-50 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <path
          d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"
          fill="currentColor"
        />
      </svg>
      Export to Google
    </button>
  );
}
