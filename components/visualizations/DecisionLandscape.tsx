// components/visualizations/DecisionLandscape.tsx
// 3D-inspired decision landscape visualization using CSS transforms and gradients
// No external 3D libraries needed - pure CSS/React approach with Framer Motion

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DecisionMetrics {
  readiness: number;
  blindSpotCoverage: number;
  confidence: number;
  riskScore: number;
  evidenceQuality: number;
  actionability: number;
}

interface DecisionLandscapeProps {
  metrics: DecisionMetrics;
  title?: string;
  showLabels?: boolean;
  animated?: boolean;
  className?: string;
}

export function DecisionLandscape({
  metrics,
  title = "Decision Landscape",
  showLabels = true,
  animated = true,
  className = "",
}: DecisionLandscapeProps) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Check if all metrics are essentially empty/zero (new case state)
  const isEmpty = useMemo(() => {
    const values = Object.values(metrics);
    // If all values are 0 or very low, consider empty
    const total = values.reduce((a, b) => a + b, 0);
    const allZero = values.every(v => v === 0);
    return allZero || total <= 0;
  }, [metrics]);

  // Don't render anything if empty - completely hide
  if (isEmpty) {
    return null;
  }

  // Convert metrics to tower heights (normalized 0-100)
  // Simple horizontal layout with equal spacing - no 3D perspective overlap
  const towers = useMemo(() => [
    { id: "readiness", label: "Readiness", value: metrics.readiness, color: "#10b981", x: 8 },
    { id: "blindSpot", label: "Coverage", value: metrics.blindSpotCoverage, color: "#3b82f6", x: 25 },
    { id: "evidence", label: "Evidence", value: metrics.evidenceQuality, color: "#06b6d4", x: 42 },
    { id: "confidence", label: "Confidence", value: metrics.confidence, color: "#8b5cf6", x: 58 },
    { id: "action", label: "Actionable", value: metrics.actionability, color: "#ec4899", x: 75 },
    { id: "risk", label: "Risk Mgmt", value: 100 - metrics.riskScore, color: "#f59e0b", x: 92 },
  ], [metrics]);

  // Calculate overall health
  const overallHealth = useMemo(() => {
    const values = Object.values(metrics);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [metrics]);

  const getHealthColor = (health: number) => {
    if (health >= 80) return "#10b981";
    if (health >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className={`relative ${className}`}>
      {/* Title */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">🏔️</span>
            {title}
          </h3>
          <div 
            className="px-3 py-1 rounded-full text-sm font-semibold"
            style={{ 
              backgroundColor: `${getHealthColor(overallHealth)}20`,
              color: getHealthColor(overallHealth)
            }}
          >
            {overallHealth}% Health
          </div>
        </div>
      )}

      {/* 3D Landscape Container */}
      <div 
        className="relative w-full h-[320px] rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0a0f1a 0%, #0d1117 50%, #131b27 100%)",
          perspective: "1000px",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Animated grid floor */}
        <motion.div 
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(90deg, rgba(52,211,153,0.05) 1px, transparent 1px),
              linear-gradient(rgba(52,211,153,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            transform: "rotateX(60deg) translateY(100px)",
            transformOrigin: "center center",
          }}
          animate={animated ? {
            backgroundPosition: ["0px 0px", "40px 40px"],
          } : {}}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Floating particles */}
        {animated && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-emerald-400/30"
                initial={{ 
                  x: `${Math.random() * 100}%`, 
                  y: `${Math.random() * 100}%`,
                  opacity: 0 
                }}
                animate={{ 
                  y: [null, "-100%"],
                  opacity: [0, 0.5, 0]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                  ease: "linear"
                }}
              />
            ))}
          </div>
        )}

        {/* Metric Towers */}
        <div className="absolute inset-x-4 bottom-16 top-20 flex items-end justify-between">
          {towers.map((tower, i) => {
            const height = Math.max(30, (tower.value / 100) * 140);
            const isHovered = hoveredMetric === tower.id;
            
            return (
              <motion.div
                key={tower.id}
                className="flex flex-col items-center cursor-pointer"
                style={{ width: "50px" }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: isVisible ? (isHovered ? 1.05 : 1) : 0,
                  opacity: isVisible ? 1 : 0
                }}
                transition={{ 
                  delay: i * 0.1,
                  type: "spring",
                  stiffness: 200,
                  damping: 15
                }}
                onMouseEnter={() => setHoveredMetric(tower.id)}
                onMouseLeave={() => setHoveredMetric(null)}
              >
                {/* Value label on top */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-2 whitespace-nowrap"
                >
                  <div 
                    className="px-2 py-1 rounded-lg text-xs font-bold text-white shadow-lg"
                    style={{ backgroundColor: tower.color }}
                  >
                    {tower.value}%
                  </div>
                </motion.div>

                {/* Tower body */}
                <div 
                  className="relative w-10 rounded-t-lg transition-all duration-300"
                  style={{
                    height: `${height}px`,
                    background: `linear-gradient(180deg, ${tower.color} 0%, ${tower.color}88 50%, ${tower.color}44 100%)`,
                    boxShadow: isHovered 
                      ? `0 0 20px ${tower.color}66, 0 0 40px ${tower.color}33, inset 0 0 20px ${tower.color}33`
                      : `0 0 10px ${tower.color}33, inset 0 0 10px ${tower.color}22`,
                  }}
                >
                  {/* Shine effect */}
                  <div 
                    className="absolute inset-y-0 left-0 w-1/3 rounded-tl-lg"
                    style={{ 
                      background: `linear-gradient(90deg, rgba(255,255,255,0.3) 0%, transparent 100%)` 
                    }}
                  />
                </div>

                {/* Label below */}
                <div className="mt-2 text-[10px] text-white/70 font-medium text-center whitespace-nowrap">
                  {tower.label}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Central health orb */}
        <motion.div
          className="absolute top-4 right-4"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: isVisible ? 1 : 0, opacity: isVisible ? 1 : 0 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
        >
          <motion.div 
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle, ${getHealthColor(overallHealth)}33 0%, transparent 70%)`,
            }}
            animate={animated ? {
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8],
            } : {}}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ 
                backgroundColor: getHealthColor(overallHealth),
                color: "white",
                boxShadow: `0 0 30px ${getHealthColor(overallHealth)}66`
              }}
            >
              {overallHealth}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {towers.map((tower) => (
          <motion.div 
            key={tower.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer transition-all"
            whileHover={{ scale: 1.05, borderColor: tower.color }}
            onMouseEnter={() => setHoveredMetric(tower.id)}
            onMouseLeave={() => setHoveredMetric(null)}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tower.color }}
            />
            <span className="text-xs text-white/70">{tower.label}</span>
            <span 
              className="text-xs font-semibold"
              style={{ color: tower.color }}
            >
              {tower.value}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Interactive Decision Flow Diagram
interface FlowStep {
  id: string;
  title: string;
  status: "complete" | "current" | "pending";
  metrics?: { label: string; value: number }[];
}

interface DecisionFlowProps {
  steps: FlowStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function DecisionFlow({ steps, currentStep, onStepClick }: DecisionFlowProps) {
  return (
    <div className="relative">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-xl">🔄</span>
        Decision Flow
      </h3>
      
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-8 left-8 right-8 h-1 bg-white/10 rounded-full">
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, i) => {
            const isComplete = step.status === "complete";
            const isCurrent = step.status === "current";
            
            return (
              <motion.div
                key={step.id}
                className="flex flex-col items-center cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => onStepClick?.(i)}
              >
                {/* Step circle */}
                <motion.div
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    isComplete 
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                      : isCurrent
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 ring-4 ring-cyan-500/30"
                        : "bg-white/10 text-white/50"
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isComplete ? "✓" : i + 1}
                </motion.div>

                {/* Step title */}
                <div className={`mt-3 text-sm font-medium text-center ${
                  isCurrent ? "text-cyan-400" : isComplete ? "text-emerald-400" : "text-white/50"
                }`}>
                  {step.title}
                </div>

                {/* Metrics (if current) */}
                <AnimatePresence>
                  {isCurrent && step.metrics && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 flex flex-col gap-1"
                    >
                      {step.metrics.map((m, j) => (
                        <div key={j} className="text-[10px] text-white/40">
                          {m.label}: <span className="text-cyan-400">{m.value}%</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Animated Score Ring
interface ScoreRingProps {
  score: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  showAnimation?: boolean;
}

export function ScoreRing({ 
  score, 
  label, 
  size = 120, 
  strokeWidth = 8,
  showAnimation = true 
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return "#10b981";
    if (s >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: showAnimation ? offset : circumference }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 8px ${getColor(score)}66)`
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-2xl font-bold"
          style={{ color: getColor(score) }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-white/50">{label}</span>
      </div>
    </div>
  );
}

// Export all components
export default DecisionLandscape;
