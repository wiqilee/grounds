// components/GuidedTour.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Target,
  FileText,
  Brain,
  BarChart3,
  Sparkles,
  Search,
  Mic,
  Download,
  CheckCircle2,
  Play,
  SkipForward,
} from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  position: "center" | "top" | "bottom" | "left" | "right";
  icon: React.ElementType;
  action?: string; // Optional action hint
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Grounds! 👋",
    description: "This is your decision intelligence workspace. Let me show you how to make better decisions with AI assistance.",
    position: "center",
    icon: Target,
  },
  {
    id: "theme",
    title: "1. Choose Your Industry",
    description: "Select a theme that matches your decision context. Each theme has specialized prompts and 2025-2026 case studies.",
    target: "#theme-selector",
    position: "bottom",
    icon: Target,
    action: "Click the theme dropdown to explore options",
  },
  {
    id: "input",
    title: "2. Enter Decision Context",
    description: "Fill in your decision details: title, context, options, assumptions, risks, and evidence. Use 'Scan Image' to auto-fill from documents.",
    target: "#input-section",
    position: "right",
    icon: FileText,
    action: "Type or paste your decision context",
  },
  {
    id: "templates",
    title: "💡 Quick Start: Templates",
    description: "Click 'Templates' to browse pre-built decision scenarios. Perfect for testing or learning the workflow.",
    target: "#section-templates",
    position: "bottom",
    icon: FileText,
    action: "Try loading a template to see how it works",
  },
  {
    id: "analyze",
    title: "3. Analyze Your Decision",
    description: "Click 'Analyze' to get AI-powered insights: Readiness Score, Half-Life, Blind Spots, and recommendations.",
    target: "#analyze-button",
    position: "bottom",
    icon: Brain,
    action: "Click the Analyze button",
  },
  {
    id: "sentiment",
    title: "4. Sentiment Analysis",
    description: "Run ABSA (Aspect-Based Sentiment Analysis) to understand how your decision framing is perceived.",
    target: "#section-sentiment",
    position: "bottom",
    icon: BarChart3,
  },
  {
    id: "compare",
    title: "5. Multi-AI Comparison",
    description: "Compare responses from multiple AI providers. Google (Gemini 3) is pinned as the featured provider for this hackathon.",
    target: "#compare-section",
    position: "top",
    icon: Sparkles,
    action: "Scroll down to find the Compare panel",
  },
  {
    id: "critic",
    title: "6. Gemini Critic",
    description: "The Critic analyzes your decision structure, finding missing hard edges, generic language, and blind spots.",
    target: "#critic-section",
    position: "top",
    icon: Target,
  },
  {
    id: "research",
    title: "7. Auto-Research (Gemini Grounding)",
    description: "Enable Auto-Research to get real-time web search results synthesized by Gemini with source citations.",
    target: "#research-toggle",
    position: "left",
    icon: Search,
  },
  {
    id: "voice",
    title: "🎤 Voice Input",
    description: "Click the microphone icon to speak your decision context. Gemini supports multimodal input.",
    target: "#voice-input",
    position: "bottom",
    icon: Mic,
  },
  {
    id: "export",
    title: "8. Generate Reports",
    description: "Export professional PDF or HTML reports with all visualizations, charts, and recommendations included.",
    target: "#export-section",
    position: "top",
    icon: Download,
    action: "Click 'Preview PDF' or 'Preview HTML'",
  },
  {
    id: "complete",
    title: "You're Ready! 🎉",
    description: "You now know the Grounds workflow. Start making better decisions with AI-powered intelligence. Good luck!",
    position: "center",
    icon: CheckCircle2,
  },
];

interface GuidedTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function GuidedTour({ isActive, onComplete, onSkip }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  // Update highlight position when step changes
  useEffect(() => {
    if (!isActive || !step.target) {
      setHighlightRect(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(step.target!);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
        
        // Scroll element into view
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setHighlightRect(null);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isActive, step.target, currentStep]);

  const nextStep = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [isLast, onComplete]);

  const prevStep = useCallback(() => {
    if (!isFirst) {
      setCurrentStep((s) => s - 1);
    }
  }, [isFirst]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") nextStep();
      else if (e.key === "ArrowLeft") prevStep();
      else if (e.key === "Escape") onSkip();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, nextStep, prevStep, onSkip]);

  if (!isActive) return null;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!highlightRect || step.position === "center") {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const padding = 20;
    const tooltipWidth = 360;
    const tooltipHeight = 200;

    switch (step.position) {
      case "top":
        return {
          position: "fixed",
          top: highlightRect.top - tooltipHeight - padding,
          left: Math.max(padding, Math.min(highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
        };
      case "bottom":
        return {
          position: "fixed",
          top: highlightRect.bottom + padding,
          left: Math.max(padding, Math.min(highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
        };
      case "left":
        return {
          position: "fixed",
          top: highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2,
          left: highlightRect.left - tooltipWidth - padding,
        };
      case "right":
        return {
          position: "fixed",
          top: highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2,
          left: highlightRect.right + padding,
        };
      default:
        return {};
    }
  };

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] pointer-events-none"
            style={{
              background: highlightRect
                ? `radial-gradient(circle at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent ${Math.max(highlightRect.width, highlightRect.height) / 2 + 20}px, rgba(0,0,0,0.8) ${Math.max(highlightRect.width, highlightRect.height) / 2 + 60}px)`
                : "rgba(0,0,0,0.85)",
            }}
          />

          {/* Highlight box */}
          {highlightRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed z-[9991] pointer-events-none"
              style={{
                top: highlightRect.top - 8,
                left: highlightRect.left - 8,
                width: highlightRect.width + 16,
                height: highlightRect.height + 16,
                border: "3px solid #10b981",
                borderRadius: "16px",
                boxShadow: "0 0 0 4px rgba(16, 185, 129, 0.3), 0 0 30px rgba(16, 185, 129, 0.4)",
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="z-[9992] w-[360px] rounded-2xl bg-[#0d0e16] border border-white/20 shadow-2xl overflow-hidden"
            style={getTooltipStyle()}
          >
            {/* Decorative header gradient */}
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-teal-500" />

            <div className="p-5">
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <step.icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs text-white/40">
                    Step {currentStep + 1} of {TOUR_STEPS.length}
                  </span>
                </div>
                <button
                  onClick={onSkip}
                  className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1"
                >
                  <SkipForward className="w-3 h-3" />
                  Skip tour
                </button>
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{step.description}</p>

              {step.action && (
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400/80 bg-emerald-500/10 px-3 py-2 rounded-lg">
                  <Play className="w-3 h-3" />
                  {step.action}
                </div>
              )}

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mt-4 mb-4">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentStep
                        ? "bg-emerald-400 w-6"
                        : i < currentStep
                        ? "bg-emerald-400/40"
                        : "bg-white/20"
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prevStep}
                  disabled={isFirst}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isFirst
                      ? "text-white/20 cursor-not-allowed"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  onClick={nextStep}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                >
                  {isLast ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Finish
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to manage tour state with localStorage persistence
export function useTour() {
  const [isTourActive, setIsTourActive] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(true); // Default true to prevent flash

  useEffect(() => {
    const seen = localStorage.getItem("grounds-tour-completed");
    setHasSeenTour(seen === "true");
  }, []);

  const startTour = useCallback(() => {
    setIsTourActive(true);
  }, []);

  const completeTour = useCallback(() => {
    setIsTourActive(false);
    setHasSeenTour(true);
    localStorage.setItem("grounds-tour-completed", "true");
  }, []);

  const skipTour = useCallback(() => {
    setIsTourActive(false);
    setHasSeenTour(true);
    localStorage.setItem("grounds-tour-completed", "true");
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem("grounds-tour-completed");
    setHasSeenTour(false);
  }, []);

  return {
    isTourActive,
    hasSeenTour,
    startTour,
    completeTour,
    skipTour,
    resetTour,
  };
}
