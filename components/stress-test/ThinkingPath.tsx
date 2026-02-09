// components/stress-test/ThinkingPath.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// THINKING PATH VISUALIZATION
// Shows AI reasoning steps with animated Chain of Thought display
// This is the "WOW factor" component for hackathon judges
// ═══════════════════════════════════════════════════════════════════════════════
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  Search, 
  Link2, 
  Swords, 
  FlaskConical, 
  CheckCircle2, 
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────────────── */

export type ThinkingAction = 
  | "analyze" 
  | "correlate" 
  | "challenge" 
  | "synthesize" 
  | "validate" 
  | "hypothesize";

export type ThinkingStep = {
  step: number;
  action: ThinkingAction;
  target: string;
  reasoning: string;
  confidence: number;
  duration_ms?: number;
};

type ThinkingPathProps = {
  steps: ThinkingStep[];
  isStreaming?: boolean;
  totalDurationMs?: number;
  className?: string;
  defaultExpanded?: boolean;
};

/* ────────────────────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────────────────────── */

const ACTION_CONFIG: Record<ThinkingAction, {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}> = {
  analyze: {
    icon: Search,
    label: "Analyzing",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    glowColor: "shadow-cyan-500/20",
  },
  correlate: {
    icon: Link2,
    label: "Correlating",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    glowColor: "shadow-purple-500/20",
  },
  challenge: {
    icon: Swords,
    label: "Challenging",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    glowColor: "shadow-pink-500/20",
  },
  synthesize: {
    icon: FlaskConical,
    label: "Synthesizing",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    glowColor: "shadow-violet-500/20",
  },
  validate: {
    icon: CheckCircle2,
    label: "Validating",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    glowColor: "shadow-emerald-500/20",
  },
  hypothesize: {
    icon: Lightbulb,
    label: "Hypothesizing",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    glowColor: "shadow-blue-500/20",
  },
};

/* ────────────────────────────────────────────────────────────────────────────
   CONFIDENCE BAR COMPONENT
──────────────────────────────────────────────────────────────────────────── */

function ConfidenceBar({ confidence }: { confidence: number }) {
  const getColor = (c: number) => {
    if (c >= 80) return "bg-emerald-500";
    if (c >= 60) return "bg-cyan-500";
    if (c >= 40) return "bg-purple-500";
    return "bg-pink-500";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getColor(confidence)} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className="text-[10px] text-white/50 font-mono">{confidence}%</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   SINGLE STEP COMPONENT
──────────────────────────────────────────────────────────────────────────── */

function ThinkingStepCard({ 
  step, 
  index, 
  isLast,
  isStreaming 
}: { 
  step: ThinkingStep; 
  index: number;
  isLast: boolean;
  isStreaming?: boolean;
}) {
  const config = ACTION_CONFIG[step.action];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="relative"
    >
      {/* Connection line */}
      {!isLast && (
        <div className="absolute left-[19px] top-[40px] w-0.5 h-[calc(100%-24px)] bg-gradient-to-b from-white/20 to-transparent" />
      )}

      <div className="flex gap-3">
        {/* Step indicator */}
        <div className="relative flex-shrink-0">
          <motion.div
            className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${config.bgColor} ${config.borderColor} border
              shadow-lg ${config.glowColor}
            `}
            whileHover={{ scale: 1.05 }}
            animate={isLast && isStreaming ? {
              boxShadow: [
                `0 0 0 0 ${config.glowColor}`,
                `0 0 20px 4px ${config.glowColor}`,
                `0 0 0 0 ${config.glowColor}`,
              ],
            } : {}}
            transition={isLast && isStreaming ? {
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            } : {}}
          >
            <Icon className={`w-5 h-5 ${config.color}`} />
          </motion.div>
          
          {/* Step number badge */}
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center">
            <span className="text-[9px] text-white/70 font-bold">{step.step}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${config.color}`}>
                {config.label}
              </span>
              <span className="text-[10px] text-white/40">→</span>
              <span className="text-[11px] text-white/60 font-medium truncate max-w-[200px]">
                {step.target}
              </span>
            </div>
            <ConfidenceBar confidence={step.confidence} />
          </div>

          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className={`
              text-[11px] text-white/70 leading-relaxed
              p-2.5 rounded-lg ${config.bgColor} border ${config.borderColor}
              mt-1.5
            `}
          >
            {step.reasoning}
          </motion.div>

          {step.duration_ms && (
            <div className="flex items-center gap-1 mt-1.5 text-[9px] text-white/40">
              <Clock className="w-3 h-3" />
              <span>{step.duration_ms}ms</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   STREAMING INDICATOR
──────────────────────────────────────────────────────────────────────────── */

function StreamingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30"
    >
      <motion.div
        className="flex gap-1"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-purple-400"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </motion.div>
      <span className="text-[11px] text-purple-300 font-medium">
        Deep thinking in progress...
      </span>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────────────────────── */

export function ThinkingPath({
  steps,
  isStreaming = false,
  totalDurationMs,
  className = "",
  defaultExpanded = false,
}: ThinkingPathProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [visibleSteps, setVisibleSteps] = useState<ThinkingStep[]>([]);

  // Animate steps appearing one by one when streaming
  useEffect(() => {
    if (isStreaming) {
      setVisibleSteps([]);
      steps.forEach((step, index) => {
        setTimeout(() => {
          setVisibleSteps(prev => [...prev, step]);
        }, index * 300);
      });
    } else {
      setVisibleSteps(steps);
    }
  }, [steps, isStreaming]);

  if (steps.length === 0 && !isStreaming) {
    return null;
  }

  return (
    <div className={`rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-slate-900/50 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="w-5 h-5 text-purple-400" />
            {isStreaming && (
              <motion.div
                className="absolute inset-0 rounded-full"
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
            Chain of Thought
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
            {steps.length} steps
          </span>
          {isStreaming && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-medium flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Live
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {totalDurationMs && (
            <span className="text-[10px] text-white/40 font-mono">
              {(totalDurationMs / 1000).toFixed(1)}s
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-white/50" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/50" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1">
              {/* Streaming indicator at top */}
              {isStreaming && visibleSteps.length === 0 && (
                <StreamingIndicator />
              )}

              {/* Steps */}
              {visibleSteps.map((step, index) => (
                <ThinkingStepCard
                  key={`${step.step}-${index}`}
                  step={step}
                  index={index}
                  isLast={index === visibleSteps.length - 1}
                  isStreaming={isStreaming && index === visibleSteps.length - 1}
                />
              ))}

              {/* Streaming indicator at bottom when there are steps */}
              {isStreaming && visibleSteps.length > 0 && visibleSteps.length < steps.length && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="ml-[52px]"
                >
                  <StreamingIndicator />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   COMPACT VERSION (for inline display)
──────────────────────────────────────────────────────────────────────────── */

export function ThinkingPathCompact({ steps }: { steps: ThinkingStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((step, index) => {
        const config = ACTION_CONFIG[step.action];
        const Icon = config.icon;
        
        return (
          <React.Fragment key={step.step}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`
                flex items-center gap-1 px-1.5 py-0.5 rounded
                ${config.bgColor} ${config.borderColor} border
              `}
              title={`${config.label}: ${step.target}`}
            >
              <Icon className={`w-3 h-3 ${config.color}`} />
              <span className="text-[9px] text-white/60 font-mono">
                {step.confidence}%
              </span>
            </motion.div>
            {index < steps.length - 1 && (
              <span className="text-white/20 text-[10px]">→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default ThinkingPath;
