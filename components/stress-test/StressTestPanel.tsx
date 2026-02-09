// components/stress-test/StressTestPanel.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// DEEP REASONER: STRESS TEST PANEL
// Main UI component for Devil's Advocate analysis
// Evolution of GeminiCriticPanel with Chain of Thought visualization
// ═══════════════════════════════════════════════════════════════════════════════
"use client";

import React, { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Brain,
  Swords,
  Shield,
  AlertTriangle,
  Target,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Settings2,
  Sparkles,
  RefreshCw,
  X,
  Info,
  Zap,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

import { ThinkingPath } from "./ThinkingPath";
import { BlindSpotList, type BlindSpot, type Mitigation } from "./BlindSpotCard";
import { ImpactMatrix } from "./ImpactMatrix";

/* ────────────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────────────── */

type AggressionLevel = "gentle" | "moderate" | "ruthless";

type ThinkingStep = {
  step: number;
  action: "analyze" | "correlate" | "challenge" | "synthesize" | "validate" | "hypothesize";
  target: string;
  reasoning: string;
  confidence: number;
};

type CriticalFlaw = {
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  explanation: string;
  affected_components: string[];
  failure_scenario: string;
  detection_method: string;
};

type HiddenDependency = {
  dependency: string;
  why_critical: string;
  current_status: "missing" | "partial" | "unverified" | "assumed";
  owner_suggestion?: string;
  risk_if_missing: string;
};

type DevilsAdvocateChallenge = {
  type: string;
  challenge: string;
  target: string;
  counter_argument: string;
  if_wrong_consequence: string;
  suggested_response: string;
};

type ProbabilityMatrix = {
  overall_failure_risk: number;
  risk_correlations: Array<{
    risk_a: string;
    risk_b: string;
    correlation_type: "amplifies" | "triggers" | "masks" | "independent";
    correlation_strength: number;
    cascade_effect: string;
    combined_probability: number;
  }>;
  highest_risk_cluster: string[];
  single_point_of_failures: string[];
  risk_diversity_score: number;
};

type Scores = {
  overall_robustness: number;
  assumption_strength: number;
  risk_coverage: number;
  evidence_quality: number;
  execution_readiness: number;
};

type PreAnalysis = {
  input_quality_score: number;
  red_flags: string[];
  suggestions: string[];
  can_proceed: boolean;
};

export type StressTestResult = {
  critical_flaw: CriticalFlaw | null;
  hidden_dependencies: HiddenDependency[];
  blind_spots: BlindSpot[];
  mitigation_strategies: Mitigation[];
  probability_matrix: ProbabilityMatrix;
  devils_advocate_challenges: DevilsAdvocateChallenge[];
  thinking_path: ThinkingStep[];
  scores: Scores;
  pre_analysis: PreAnalysis;
  meta: {
    request_id: string;
    model_used: string;
    thinking_tokens: number;
    processing_time_ms: number;
    api_version: string;
    timestamp_iso: string;
  };
  raw_text?: string;
};

type StressTestPanelProps = {
  // Decision input
  title: string;
  context: string;
  intent: string;
  options: string[];
  assumptions: string[];
  risks: string[];
  evidence: string[];
  outcome?: string;
  confidence?: "low" | "medium" | "high";
  
  className?: string;
  
  // Callbacks
  onToast?: (msg: string) => void;
  onResult?: (result: StressTestResult | null) => void;
  onAppendRisks?: (risks: string[]) => void;
  onAppendAssumptions?: (assumptions: string[]) => void;
};

/* ────────────────────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────────────────────── */

const AGGRESSION_CONFIG: Record<AggressionLevel, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
}> = {
  gentle: {
    label: "Gentle",
    description: "Constructive feedback, supportive tone",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    icon: Shield,
  },
  moderate: {
    label: "Moderate",
    description: "Direct and thorough analysis",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    icon: Target,
  },
  ruthless: {
    label: "Ruthless",
    description: "No-holds-barred stress test",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    icon: Swords,
  },
};

const SEVERITY_COLORS = {
  critical: { color: "text-pink-400", bg: "bg-pink-500/20", border: "border-pink-500/40" },
  high: { color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/40" },
  medium: { color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/40" },
  low: { color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/40" },
};

/* ────────────────────────────────────────────────────────────────────────────
   HELPER COMPONENTS
──────────────────────────────────────────────────────────────────────────── */

function ScoreGauge({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const getColor = (v: number) => {
    if (v >= 75) return "text-emerald-400";
    if (v >= 50) return "text-cyan-400";
    if (v >= 25) return "text-purple-400";
    return "text-pink-400";
  };

  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 ${getColor(value)}`} />
      <span className="text-[10px] text-white/60 w-24">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getColor(value).replace("text-", "bg-")}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className={`text-[10px] font-mono ${getColor(value)}`}>{value}</span>
    </div>
  );
}

function ChallengeCard({ challenge, index }: { challenge: DevilsAdvocateChallenge; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-lg border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-slate-900/50 overflow-hidden"
    >
      <button
        className="w-full p-3 text-left hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-2">
          <Swords className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-white/90 leading-relaxed">
              {challenge.challenge}
            </p>
            <span className="text-[9px] text-white/40 mt-1 block">
              Targeting: {challenge.target}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-white/40 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 ml-6">
              <div className="p-2 rounded bg-pink-500/10 border border-pink-500/20">
                <span className="text-[9px] text-pink-400 uppercase tracking-wider font-medium">
                  Devil's Position
                </span>
                <p className="text-[10px] text-white/70 mt-1">
                  {challenge.counter_argument}
                </p>
              </div>
              <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                <span className="text-[9px] text-purple-400 uppercase tracking-wider font-medium">
                  If You're Wrong
                </span>
                <p className="text-[10px] text-white/70 mt-1">
                  {challenge.if_wrong_consequence}
                </p>
              </div>
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[9px] text-emerald-400 uppercase tracking-wider font-medium">
                  How to Address
                </span>
                <p className="text-[10px] text-white/70 mt-1">
                  {challenge.suggested_response}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HiddenDependencyCard({ dep, index }: { dep: HiddenDependency; index: number }) {
  const statusColors = {
    missing: { color: "text-pink-400", bg: "bg-pink-500/20" },
    partial: { color: "text-purple-400", bg: "bg-purple-500/20" },
    unverified: { color: "text-cyan-400", bg: "bg-cyan-500/20" },
    assumed: { color: "text-white/60", bg: "bg-white/10" },
  };
  const config = statusColors[dep.current_status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-3 rounded-lg bg-white/5 border border-white/10"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[11px] text-white/80 font-medium">{dep.dependency}</p>
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
          {dep.current_status}
        </span>
      </div>
      <p className="text-[10px] text-white/50 mb-2">{dep.why_critical}</p>
      {dep.risk_if_missing && (
        <div className="flex items-start gap-1.5 text-[9px] text-pink-400/80">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span>{dep.risk_if_missing}</span>
        </div>
      )}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────────────────────── */

export function StressTestPanel(props: StressTestPanelProps) {
  const {
    title,
    context,
    intent,
    options,
    assumptions,
    risks,
    evidence,
    outcome,
    confidence = "medium",
    className,
    onToast,
    onResult,
    onAppendRisks,
    onAppendAssumptions,
  } = props;

  // State
  const [aggressionLevel, setAggressionLevel] = useState<AggressionLevel>("moderate");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StressTestResult | null>(null);
  const [error, setError] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "blindspots" | "matrix" | "challenges">("overview");

  // Check if we have minimum input
  const hasInput = Boolean(title.trim() || context.trim() || intent.trim());

  // Build request payload
  const requestPayload = useMemo(() => ({
    decision: {
      title,
      context,
      intent,
      options,
      assumptions,
      risks,
      evidence,
      outcome,
      confidence,
      createdAtISO: new Date().toISOString(),
    },
    config: {
      aggression_level: aggressionLevel,
      include_thinking_path: true,
      max_blind_spots: 6,
      max_challenges: 5,
    },
  }), [title, context, intent, options, assumptions, risks, evidence, outcome, confidence, aggressionLevel]);

  // Run stress test
  const runStressTest = useCallback(async () => {
    if (!hasInput) {
      setError("Please provide at least title, context, or intent");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/deep-reasoner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Deep Reasoner failed");
      }

      setResult((data.result || data) as StressTestResult);
      onResult?.((data.result || data) as StressTestResult);
      onToast?.("Stress test complete ✓");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
      onToast?.(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [hasInput, requestPayload, onResult, onToast]);

  // Clear results
  const clearResults = () => {
    setResult(null);
    setError("");
    onResult?.(null);
  };

  // Copy to clipboard
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast?.("Copied ✓");
    } catch {}
  };

  return (
    <div className={`rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-slate-900/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="w-5 h-5 text-purple-400" />
              {loading && (
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(168, 85, 247, 0)",
                      "0 0 0 8px rgba(168, 85, 247, 0.3)",
                      "0 0 0 0 rgba(168, 85, 247, 0)",
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
            <span className="text-sm font-semibold text-white/90">
              Deep Reasoner
            </span>
            <Chip label="Stress Test" tone="info" />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
             
              className="h-7 px-2"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
            
            {result && (
              <Button
                variant="ghost"
               
                className="h-7 px-2 text-white/50 hover:text-white/80"
                onClick={clearResults}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Settings panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-white/10">
                <span className="text-[10px] text-white/50 uppercase tracking-wider mb-2 block">
                  Aggression Level
                </span>
                <div className="flex gap-2">
                  {(Object.entries(AGGRESSION_CONFIG) as [AggressionLevel, typeof AGGRESSION_CONFIG[AggressionLevel]][]).map(([level, config]) => {
                    const Icon = config.icon;
                    const isSelected = aggressionLevel === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setAggressionLevel(level)}
                        className={`
                          flex-1 p-2 rounded-lg border transition-all
                          ${isSelected 
                            ? `${config.bgColor} border-current ${config.color}` 
                            : "border-white/10 hover:border-white/20"
                          }
                        `}
                      >
                        <Icon className={`w-4 h-4 mx-auto mb-1 ${isSelected ? config.color : "text-white/40"}`} />
                        <span className={`text-[10px] block ${isSelected ? config.color : "text-white/50"}`}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-6">
        {/* Input status */}
        {!hasInput && (
          <div className="text-center py-6 text-white/40">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-[11px]">
              Fill in the decision inputs to run stress test
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-pink-500/10 border border-pink-500/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-pink-400" />
              <span className="text-[11px] text-pink-300">{error}</span>
            </div>
          </div>
        )}

        {/* Run button */}
        {hasInput && !result && (
          <div className="pt-2">
          <Button
            onClick={runStressTest}
            disabled={loading}
            className="w-full h-10 bg-purple-600 hover:bg-purple-500 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Stress Test...
              </>
            ) : (
              <>
                <Swords className="w-4 h-4 mr-2" />
                Run Stress Test
              </>
            )}
          </Button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-white/50">Overall Robustness</span>
                  <span className={`text-lg font-bold ${
                    result.scores.overall_robustness >= 70 ? "text-emerald-400" :
                    result.scores.overall_robustness >= 40 ? "text-cyan-400" : "text-pink-400"
                  }`}>
                    {result.scores.overall_robustness}
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      result.scores.overall_robustness >= 70 ? "bg-emerald-500" :
                      result.scores.overall_robustness >= 40 ? "bg-cyan-500" : "bg-pink-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${result.scores.overall_robustness}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-white/50">Failure Risk</span>
                  <span className={`text-lg font-bold ${
                    result.probability_matrix.overall_failure_risk <= 30 ? "text-emerald-400" :
                    result.probability_matrix.overall_failure_risk <= 60 ? "text-cyan-400" : "text-pink-400"
                  }`}>
                    {result.probability_matrix.overall_failure_risk}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      result.probability_matrix.overall_failure_risk <= 30 ? "bg-emerald-500" :
                      result.probability_matrix.overall_failure_risk <= 60 ? "bg-cyan-500" : "bg-pink-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${result.probability_matrix.overall_failure_risk}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Critical Flaw */}
            {result.critical_flaw && (
              <div className={`p-4 rounded-xl border ${SEVERITY_COLORS[result.critical_flaw.severity].border} ${SEVERITY_COLORS[result.critical_flaw.severity].bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`w-5 h-5 ${SEVERITY_COLORS[result.critical_flaw.severity].color}`} />
                  <span className={`text-sm font-bold ${SEVERITY_COLORS[result.critical_flaw.severity].color}`}>
                    Critical Flaw: {result.critical_flaw.title}
                  </span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed mb-3">
                  {result.critical_flaw.explanation}
                </p>
                <div className="p-2 rounded bg-black/20 border border-white/10">
                  <span className="text-[9px] text-white/40 uppercase tracking-wider">
                    If not addressed:
                  </span>
                  <p className="text-[10px] text-white/60 mt-1">
                    {result.critical_flaw.failure_scenario}
                  </p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-white/5">
              {[
                { id: "overview", label: "Overview", icon: Eye },
                { id: "blindspots", label: `Blind Spots (${result.blind_spots.length})`, icon: Target },
                { id: "matrix", label: "Risk Matrix", icon: Zap },
                { id: "challenges", label: `Challenges (${result.devils_advocate_challenges.length})`, icon: Swords },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] transition-colors
                    ${activeTab === tab.id 
                      ? "bg-purple-500/20 text-purple-300" 
                      : "text-white/50 hover:text-white/70"
                    }
                  `}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Scores */}
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">
                      Analysis Scores
                    </span>
                    <ScoreGauge label="Robustness" value={result.scores.overall_robustness} icon={Shield} />
                    <ScoreGauge label="Assumptions" value={result.scores.assumption_strength} icon={Target} />
                    <ScoreGauge label="Risk Coverage" value={result.scores.risk_coverage} icon={Eye} />
                    <ScoreGauge label="Evidence" value={result.scores.evidence_quality} icon={Sparkles} />
                    <ScoreGauge label="Execution Ready" value={result.scores.execution_readiness} icon={Zap} />
                  </div>

                  {/* Thinking Path */}
                  {result.thinking_path.length > 0 && (
                    <ThinkingPath
                      steps={result.thinking_path}
                      totalDurationMs={result.meta.processing_time_ms}
                      defaultExpanded={false}
                    />
                  )}

                  {/* Hidden Dependencies */}
                  {result.hidden_dependencies.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-white/70 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-purple-400" />
                        Hidden Dependencies ({result.hidden_dependencies.length})
                      </span>
                      {result.hidden_dependencies.map((dep, index) => (
                        <HiddenDependencyCard key={index} dep={dep} index={index} />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "blindspots" && (
                <motion.div
                  key="blindspots"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <BlindSpotList
                    blindSpots={result.blind_spots}
                    mitigations={result.mitigation_strategies}
                    onCopy={handleCopy}
                    onApplyMitigation={(m) => {
                      // Could add to risks or create task
                      onToast?.(`Mitigation noted: ${m.action.slice(0, 50)}...`);
                    }}
                  />
                </motion.div>
              )}

              {activeTab === "matrix" && (
                <motion.div
                  key="matrix"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ImpactMatrix
                    matrix={result.probability_matrix}
                    blindSpots={result.blind_spots}
                  />
                </motion.div>
              )}

              {activeTab === "challenges" && (
                <motion.div
                  key="challenges"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  {result.devils_advocate_challenges.map((challenge, index) => (
                    <ChallengeCard key={index} challenge={challenge} index={index} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Meta info */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-white/40">
              <span>
                Model: {result.meta.model_used} • {result.meta.processing_time_ms}ms
              </span>
              <Button
                variant="ghost"
               
                className="h-6 px-2 text-[9px]"
                onClick={runStressTest}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Rerun
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StressTestPanel;
