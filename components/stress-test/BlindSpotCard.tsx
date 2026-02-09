// components/stress-test/BlindSpotCard.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// BLIND SPOT CARD
// Displays individual blind spots with severity indicators and mitigations
// ═══════════════════════════════════════════════════════════════════════════════
"use client";

import React, { useState, type MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  DollarSign,
  Cog,
  Scale,
  Wrench,
  Users,
  Clock,
  Package,
  Globe,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Target,
  Zap,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ────────────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────────────── */

export type BlindSpotCategory = 
  | "security" | "financial" | "operational" | "legal" 
  | "technical" | "stakeholder" | "timeline" | "resource" | "external";

export type SeverityLevel = "critical" | "high" | "medium" | "low";

export type BlindSpot = {
  id: string;
  category: BlindSpotCategory;
  title: string;
  description: string;
  potential_impact: string;
  probability_score: number;
  impact_score: number;
  detection_difficulty: "easy" | "medium" | "hard";
  related_assumptions?: string[];
  related_risks?: string[];
};

export type Mitigation = {
  for_blind_spot_id: string;
  action: string;
  rationale: string;
  effort: "low" | "medium" | "high";
  timeline: string;
  owner_hint?: string;
  success_criteria: string;
  fallback_if_failed?: string;
};

type BlindSpotCardProps = {
  blindSpot: BlindSpot;
  mitigation?: Mitigation;
  index: number;
  onCopy?: (text: string) => void;
  onApplyMitigation?: (mitigation: Mitigation) => void;
};

/* ────────────────────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────────────────────── */

const CATEGORY_CONFIG: Record<BlindSpotCategory, {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  security: {
    icon: Shield,
    label: "Security",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
  },
  financial: {
    icon: DollarSign,
    label: "Financial",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  operational: {
    icon: Cog,
    label: "Operational",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
  },
  legal: {
    icon: Scale,
    label: "Legal",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
  technical: {
    icon: Wrench,
    label: "Technical",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  stakeholder: {
    icon: Users,
    label: "Stakeholder",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
  },
  timeline: {
    icon: Clock,
    label: "Timeline",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
  },
  resource: {
    icon: Package,
    label: "Resource",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
  },
  external: {
    icon: Globe,
    label: "External",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
  },
};

const SEVERITY_CONFIG: Record<SeverityLevel, {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  critical: {
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    borderColor: "border-pink-500/40",
    label: "Critical",
  },
  high: {
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/40",
    label: "High",
  },
  medium: {
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    borderColor: "border-cyan-500/40",
    label: "Medium",
  },
  low: {
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
    label: "Low",
  },
};

const EFFORT_CONFIG: Record<"low" | "medium" | "high", {
  color: string;
  label: string;
}> = {
  low: { color: "text-emerald-400", label: "Low effort" },
  medium: { color: "text-cyan-400", label: "Medium effort" },
  high: { color: "text-purple-400", label: "High effort" },
};

/* ────────────────────────────────────────────────────────────────────────────
   HELPER FUNCTIONS
──────────────────────────────────────────────────────────────────────────── */

function getSeverityFromScores(probability: number, impact: number): SeverityLevel {
  const combined = (probability + impact) / 2;
  if (combined >= 75) return "critical";
  if (combined >= 55) return "high";
  if (combined >= 35) return "medium";
  return "low";
}

function getRiskQuadrant(probability: number, impact: number): string {
  if (probability >= 50 && impact >= 50) return "Monitor closely";
  if (probability >= 50 && impact < 50) return "Watch for escalation";
  if (probability < 50 && impact >= 50) return "Have contingency ready";
  return "Accept or delegate";
}

/* ────────────────────────────────────────────────────────────────────────────
   RISK SCORE GAUGE
──────────────────────────────────────────────────────────────────────────── */

function RiskGauge({ 
  probability, 
  impact,
  size = "normal"
}: { 
  probability: number; 
  impact: number;
  size?: "normal" | "small";
}) {
  const severity = getSeverityFromScores(probability, impact);
  const config = SEVERITY_CONFIG[severity];
  const combined = Math.round((probability + impact) / 2);
  
  const dimensions = size === "small" 
    ? { width: 48, height: 48, strokeWidth: 4, fontSize: "text-[10px]" }
    : { width: 64, height: 64, strokeWidth: 5, fontSize: "text-xs" };
  
  const radius = (dimensions.width - dimensions.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (combined / 100) * circumference;

  return (
    <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
      <svg className="transform -rotate-90" width={dimensions.width} height={dimensions.height}>
        {/* Background circle */}
        <circle
          cx={dimensions.width / 2}
          cy={dimensions.height / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={dimensions.strokeWidth}
          className="text-white/10"
        />
        {/* Progress circle */}
        <motion.circle
          cx={dimensions.width / 2}
          cy={dimensions.height / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={dimensions.strokeWidth}
          strokeLinecap="round"
          className={config.color}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${dimensions.fontSize} font-bold ${config.color}`}>
          {combined}
        </span>
        {size === "normal" && (
          <span className="text-[8px] text-white/40 uppercase tracking-wider">
            Risk
          </span>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   PROBABILITY/IMPACT BARS
──────────────────────────────────────────────────────────────────────────── */

function ScoreBar({ 
  label, 
  value, 
  icon: Icon 
}: { 
  label: string; 
  value: number; 
  icon: React.ElementType;
}) {
  const getColor = (v: number) => {
    if (v >= 75) return "bg-pink-500";
    if (v >= 50) return "bg-purple-500";
    if (v >= 25) return "bg-cyan-500";
    return "bg-emerald-500";
  };

  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 text-white/40 flex-shrink-0" />
      <span className="text-[10px] text-white/50 w-16">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getColor(value)} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        />
      </div>
      <span className="text-[10px] text-white/60 font-mono w-8 text-right">{value}%</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────────────────────── */

export function BlindSpotCard({
  blindSpot,
  mitigation,
  index,
  onCopy,
  onApplyMitigation,
}: BlindSpotCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[blindSpot.category];
  const severity = getSeverityFromScores(blindSpot.probability_score, blindSpot.impact_score);
  const severityConfig = SEVERITY_CONFIG[severity];
  const CategoryIcon = categoryConfig.icon;

  const handleCopy = async () => {
    const text = `
Blind Spot: ${blindSpot.title}
Category: ${categoryConfig.label}
Description: ${blindSpot.description}
Potential Impact: ${blindSpot.potential_impact}
Probability: ${blindSpot.probability_score}%
Impact: ${blindSpot.impact_score}%
${mitigation ? `\nMitigation: ${mitigation.action}` : ""}
    `.trim();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.(text);
    } catch {
      // Clipboard access denied - silently fail
    }
  };

  const handleCopyClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    handleCopy();
  };

  const handleApplyClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (mitigation && onApplyMitigation) {
      onApplyMitigation(mitigation);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`
        rounded-xl border overflow-hidden
        bg-gradient-to-br from-slate-800/50 to-slate-900/50
        ${severityConfig.borderColor}
      `}
    >
      {/* Header */}
      <div
        className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left side */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Category icon */}
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
              ${categoryConfig.bgColor} ${categoryConfig.borderColor} border
            `}>
              <CategoryIcon className={`w-5 h-5 ${categoryConfig.color}`} />
            </div>

            {/* Title and meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-white/90 truncate">
                  {blindSpot.title}
                </h4>
                <span className={`
                  text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider
                  ${severityConfig.bgColor} ${severityConfig.color}
                `}>
                  {severityConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] ${categoryConfig.color}`}>
                  {categoryConfig.label}
                </span>
                <span className="text-white/20">•</span>
                <span className="text-[10px] text-white/40">
                  {blindSpot.detection_difficulty} to detect
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Risk gauge */}
          <div className="flex items-center gap-2">
            <RiskGauge 
              probability={blindSpot.probability_score} 
              impact={blindSpot.impact_score}
              size="small"
            />
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-white/40" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/40" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Description */}
              <div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  {blindSpot.description}
                </p>
              </div>

              {/* Scores */}
              <div className="space-y-2">
                <ScoreBar 
                  label="Probability" 
                  value={blindSpot.probability_score} 
                  icon={Target}
                />
                <ScoreBar 
                  label="Impact" 
                  value={blindSpot.impact_score} 
                  icon={Zap}
                />
              </div>

              {/* Potential Impact */}
              <div className={`p-3 rounded-lg ${severityConfig.bgColor} border ${severityConfig.borderColor}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className={`w-3.5 h-3.5 ${severityConfig.color}`} />
                  <span className={`text-[10px] font-semibold ${severityConfig.color} uppercase tracking-wider`}>
                    Potential Impact
                  </span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  {blindSpot.potential_impact}
                </p>
              </div>

              {/* Recommendation */}
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <span className="text-[10px] text-white/50">
                  Recommendation: <span className="text-white/70">{getRiskQuadrant(blindSpot.probability_score, blindSpot.impact_score)}</span>
                </span>
              </div>

              {/* Related items */}
              {(blindSpot.related_assumptions?.length || blindSpot.related_risks?.length) ? (
                <div className="space-y-2">
                  {blindSpot.related_assumptions?.length ? (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] text-white/40 uppercase tracking-wider mr-1">
                        Related assumptions:
                      </span>
                      {blindSpot.related_assumptions.slice(0, 2).map((a, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 truncate max-w-[150px]">
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {blindSpot.related_risks?.length ? (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] text-white/40 uppercase tracking-wider mr-1">
                        Related risks:
                      </span>
                      {blindSpot.related_risks.slice(0, 2).map((r, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-300 truncate max-w-[150px]">
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Mitigation */}
              {mitigation && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-[11px] font-semibold text-emerald-400">
                        Mitigation Strategy
                      </span>
                    </div>
                    <span className={`text-[9px] ${EFFORT_CONFIG[mitigation.effort].color}`}>
                      {EFFORT_CONFIG[mitigation.effort].label}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/70 mb-2">
                    {mitigation.action}
                  </p>
                  <div className="flex items-center gap-4 text-[9px] text-white/50">
                    {mitigation.timeline && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {mitigation.timeline}
                      </span>
                    )}
                    {mitigation.owner_hint && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {mitigation.owner_hint}
                      </span>
                    )}
                  </div>
                  {mitigation.success_criteria && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/20">
                      <span className="text-[9px] text-white/40">Success criteria: </span>
                      <span className="text-[9px] text-white/60">{mitigation.success_criteria}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-white/50 hover:text-white/80"
                  onClick={handleCopyClick}
                >
                  {copied ? (
                    <Check className="w-3 h-3 mr-1 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                {mitigation && onApplyMitigation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    onClick={handleApplyClick}
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Apply
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   BLIND SPOT LIST
──────────────────────────────────────────────────────────────────────────── */

export function BlindSpotList({
  blindSpots,
  mitigations,
  onCopy,
  onApplyMitigation,
}: {
  blindSpots: BlindSpot[];
  mitigations?: Mitigation[];
  onCopy?: (text: string) => void;
  onApplyMitigation?: (mitigation: Mitigation) => void;
}) {
  const getMitigation = (blindSpotId: string) => 
    mitigations?.find(m => m.for_blind_spot_id === blindSpotId);

  return (
    <div className="space-y-3">
      {blindSpots.map((bs, index) => (
        <BlindSpotCard
          key={bs.id}
          blindSpot={bs}
          mitigation={getMitigation(bs.id)}
          index={index}
          onCopy={onCopy}
          onApplyMitigation={onApplyMitigation}
        />
      ))}
    </div>
  );
}

export default BlindSpotCard;
