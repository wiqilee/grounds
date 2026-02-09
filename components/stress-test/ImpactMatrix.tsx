// components/stress-test/ImpactMatrix.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// IMPACT MATRIX VISUALIZATION
// Shows probability vs impact matrix with risk correlations
// ═══════════════════════════════════════════════════════════════════════════════
"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  TrendingUp,
  Link2,
  Eye,
  EyeOff,
  Info,
  Zap,
  Target,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────────────── */

export type RiskCorrelation = {
  risk_a: string;
  risk_b: string;
  correlation_type: "amplifies" | "triggers" | "masks" | "independent";
  correlation_strength: number;
  cascade_effect: string;
  combined_probability: number;
};

export type ProbabilityMatrix = {
  overall_failure_risk: number;
  risk_correlations: RiskCorrelation[];
  highest_risk_cluster: string[];
  single_point_of_failures: string[];
  risk_diversity_score: number;
};

export type BlindSpot = {
  id: string;
  title: string;
  probability_score: number;
  impact_score: number;
  category: string;
};

type ImpactMatrixProps = {
  matrix: ProbabilityMatrix;
  blindSpots?: BlindSpot[];
  className?: string;
};

/* ────────────────────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────────────────────── */

const CORRELATION_COLORS: Record<RiskCorrelation["correlation_type"], {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  icon: React.ElementType;
}> = {
  amplifies: {
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    label: "Amplifies",
    icon: TrendingUp,
  },
  triggers: {
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    label: "Triggers",
    icon: Zap,
  },
  masks: {
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    label: "Masks",
    icon: EyeOff,
  },
  independent: {
    color: "text-white/40",
    bgColor: "bg-white/5",
    borderColor: "border-white/10",
    label: "Independent",
    icon: Layers,
  },
};

const QUADRANT_CONFIG = {
  critical: {
    label: "Monitor Closely",
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    description: "High probability + High impact",
  },
  high: {
    label: "Have Contingency",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    description: "Low probability + High impact",
  },
  medium: {
    label: "Watch & Reduce",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    description: "High probability + Low impact",
  },
  low: {
    label: "Accept or Delegate",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    description: "Low probability + Low impact",
  },
};

/* ────────────────────────────────────────────────────────────────────────────
   OVERALL RISK GAUGE
──────────────────────────────────────────────────────────────────────────── */

function OverallRiskGauge({ risk, diversity }: { risk: number; diversity: number }) {
  const getColor = (r: number) => {
    if (r >= 75) return { ring: "text-pink-500", text: "text-pink-400", label: "Critical" };
    if (r >= 50) return { ring: "text-purple-500", text: "text-purple-400", label: "High" };
    if (r >= 25) return { ring: "text-cyan-500", text: "text-cyan-400", label: "Moderate" };
    return { ring: "text-emerald-500", text: "text-emerald-400", label: "Low" };
  };

  const config = getColor(risk);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (risk / 100) * circumference;

  return (
    <div className="flex items-center gap-6">
      {/* Main gauge */}
      <div className="relative">
        <svg className="transform -rotate-90" width="128" height="128">
          {/* Background */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-white/10"
          />
          {/* Progress */}
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={config.ring}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${config.text}`}>{risk}</span>
          <span className="text-[10px] text-white/50 uppercase tracking-wider">
            Failure Risk
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${config.text}`} />
            <span className={`text-sm font-semibold ${config.text}`}>
              {config.label} Risk
            </span>
          </div>
          <p className="text-[11px] text-white/50">
            Overall probability of plan failure
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white/80">
              Diversity Score: {diversity}%
            </span>
          </div>
          <p className="text-[11px] text-white/50">
            {diversity >= 70 ? "Risks are independent (good)" : 
             diversity >= 40 ? "Some risk correlation (moderate)" :
             "High correlation (concerning)"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   QUADRANT MATRIX VISUALIZATION
──────────────────────────────────────────────────────────────────────────── */

function QuadrantMatrix({ blindSpots }: { blindSpots: BlindSpot[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Position blind spots on the matrix
  const positionedSpots = useMemo(() => {
    return blindSpots.map(bs => ({
      ...bs,
      x: bs.probability_score,
      y: 100 - bs.impact_score, // Invert Y for visual (high impact at top)
      quadrant: getQuadrant(bs.probability_score, bs.impact_score),
    }));
  }, [blindSpots]);

  function getQuadrant(prob: number, impact: number): keyof typeof QUADRANT_CONFIG {
    if (prob >= 50 && impact >= 50) return "critical";
    if (prob < 50 && impact >= 50) return "high";
    if (prob >= 50 && impact < 50) return "medium";
    return "low";
  }

  return (
    <div className="relative">
      {/* Matrix grid */}
      <div className="relative w-full aspect-square max-w-[300px] mx-auto">
        {/* Background quadrants */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {/* High Impact / High Probability */}
          <div className="bg-pink-500/10 border-r border-b border-white/10 relative">
            <span className="absolute top-2 right-2 text-[8px] text-pink-400/60 uppercase">
              Critical
            </span>
          </div>
          {/* High Impact / Low Probability */}
          <div className="bg-purple-500/10 border-b border-white/10 relative">
            <span className="absolute top-2 left-2 text-[8px] text-purple-400/60 uppercase">
              Contingency
            </span>
          </div>
          {/* Low Impact / High Probability */}
          <div className="bg-cyan-500/10 border-r border-white/10 relative">
            <span className="absolute bottom-2 right-2 text-[8px] text-cyan-400/60 uppercase">
              Watch
            </span>
          </div>
          {/* Low Impact / Low Probability */}
          <div className="bg-emerald-500/10 relative">
            <span className="absolute bottom-2 left-2 text-[8px] text-emerald-400/60 uppercase">
              Accept
            </span>
          </div>
        </div>

        {/* Axis labels */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-white/40 flex items-center gap-1">
          <Target className="w-3 h-3" />
          Probability →
        </div>
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-white/40 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Impact →
        </div>

        {/* Plot points */}
        {positionedSpots.map((spot, index) => {
          const quadrantConfig = QUADRANT_CONFIG[spot.quadrant];
          return (
            <motion.div
              key={spot.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="absolute"
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              onMouseEnter={() => setHoveredId(spot.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <motion.div
                className={`
                  w-4 h-4 rounded-full cursor-pointer
                  ${quadrantConfig.bgColor} border-2
                  ${hoveredId === spot.id ? "border-white" : `border-current ${quadrantConfig.color}`}
                `}
                whileHover={{ scale: 1.5 }}
                animate={hoveredId === spot.id ? {
                  boxShadow: [
                    "0 0 0 0 rgba(255,255,255,0.4)",
                    "0 0 0 8px rgba(255,255,255,0)",
                  ],
                } : {}}
                transition={{ duration: 0.5 }}
              />

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredId === spot.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 w-48"
                  >
                    <div className="bg-slate-800 border border-white/20 rounded-lg p-2 shadow-xl">
                      <p className="text-[11px] font-medium text-white truncate">
                        {spot.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/50">
                        <span>P: {spot.probability_score}%</span>
                        <span>I: {spot.impact_score}%</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 gap-2">
        {(Object.entries(QUADRANT_CONFIG) as [keyof typeof QUADRANT_CONFIG, typeof QUADRANT_CONFIG[keyof typeof QUADRANT_CONFIG]][]).map(([key, config]) => {
          const count = positionedSpots.filter(s => s.quadrant === key).length;
          return (
            <div key={key} className={`flex items-center gap-2 p-2 rounded-lg ${config.bgColor}`}>
              <div className={`w-2 h-2 rounded-full ${config.color.replace("text-", "bg-")}`} />
              <span className={`text-[10px] ${config.color}`}>{config.label}</span>
              <span className="text-[9px] text-white/40 ml-auto">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   RISK CORRELATION CARD
──────────────────────────────────────────────────────────────────────────── */

function CorrelationCard({ correlation }: { correlation: RiskCorrelation }) {
  const config = CORRELATION_COLORS[correlation.correlation_type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-medium text-white/80 truncate max-w-[120px]">
              {correlation.risk_a}
            </span>
            <span className={`text-[9px] ${config.color}`}>
              {config.label.toLowerCase()}
            </span>
            <span className="text-[10px] font-medium text-white/80 truncate max-w-[120px]">
              {correlation.risk_b}
            </span>
          </div>
          <p className="text-[10px] text-white/50 leading-relaxed">
            {correlation.cascade_effect}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[9px] text-white/40">
              Strength: <span className={config.color}>{correlation.correlation_strength}%</span>
            </span>
            <span className="text-[9px] text-white/40">
              Combined P: <span className="text-white/60">{correlation.combined_probability}%</span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   SINGLE POINT OF FAILURE LIST
──────────────────────────────────────────────────────────────────────────── */

function SinglePointOfFailures({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-pink-400" />
        <span className="text-[11px] font-semibold text-pink-400">
          Single Points of Failure
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-2 p-2 rounded-lg bg-pink-500/10 border border-pink-500/30"
          >
            <span className="text-[10px] text-pink-400 font-mono flex-shrink-0">
              #{index + 1}
            </span>
            <span className="text-[11px] text-white/70">{item}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────────────────────── */

export function ImpactMatrix({
  matrix,
  blindSpots = [],
  className = "",
}: ImpactMatrixProps) {
  const [showCorrelations, setShowCorrelations] = useState(true);
  const [showMatrix, setShowMatrix] = useState(true);

  const significantCorrelations = matrix.risk_correlations.filter(
    c => c.correlation_type !== "independent" && c.correlation_strength >= 30
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with overall risk */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10">
        <OverallRiskGauge 
          risk={matrix.overall_failure_risk} 
          diversity={matrix.risk_diversity_score}
        />
      </div>

      {/* Quadrant Matrix */}
      {blindSpots.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10">
          <button
            className="w-full flex items-center justify-between mb-4"
            onClick={() => setShowMatrix(!showMatrix)}
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white/90">
                Risk Quadrant Matrix
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                {blindSpots.length} risks
              </span>
            </div>
            {showMatrix ? (
              <ChevronUp className="w-4 h-4 text-white/50" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/50" />
            )}
          </button>

          <AnimatePresence>
            {showMatrix && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <QuadrantMatrix blindSpots={blindSpots} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Risk Correlations */}
      {matrix.risk_correlations.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10">
          <button
            className="w-full flex items-center justify-between mb-4"
            onClick={() => setShowCorrelations(!showCorrelations)}
          >
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white/90">
                Risk Correlations
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                {significantCorrelations.length} linked
              </span>
            </div>
            {showCorrelations ? (
              <ChevronUp className="w-4 h-4 text-white/50" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/50" />
            )}
          </button>

          <AnimatePresence>
            {showCorrelations && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2"
              >
                {significantCorrelations.length > 0 ? (
                  significantCorrelations.map((corr, index) => (
                    <CorrelationCard key={index} correlation={corr} />
                  ))
                ) : (
                  <div className="text-center py-4 text-[11px] text-white/40">
                    No significant risk correlations detected
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Single Points of Failure */}
      {matrix.single_point_of_failures.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/5 to-slate-900/50 border border-pink-500/20">
          <SinglePointOfFailures items={matrix.single_point_of_failures} />
        </div>
      )}

      {/* Risk Cluster */}
      {matrix.highest_risk_cluster.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-slate-900/50 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-[11px] font-semibold text-purple-400">
              Highest Risk Cluster
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matrix.highest_risk_cluster.map((risk, index) => (
              <span
                key={index}
                className="text-[10px] px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30"
              >
                {risk}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-white/40 mt-2 flex items-start gap-1">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
            These risks form a cluster — if one materializes, others are more likely to follow.
          </p>
        </div>
      )}
    </div>
  );
}

export default ImpactMatrix;
