// components/ui/AboutModal.tsx
// Complete About Grounds Modal with 7-step workflow, guided tour, creator info, and benefits
// FIXES: Smaller logo (w-10 h-10), thinner ring (inset-[2px]), X logo, Discord logo, all hover animations

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Sparkles, Brain, Search, BarChart3, FileText, CheckCircle2, ArrowRight,
  Zap, Target, Shield, Clock, Lightbulb, Play, ChevronRight, ChevronLeft,
  ExternalLink, Mic, FileSpreadsheet, SkipForward, MessageSquareText, User,
  Code, Music, Award, TrendingUp, Users, Briefcase, Heart, Building, 
  Stethoscope, DollarSign, GraduationCap, Plane, Home, Scale, Cpu, FlaskConical,
} from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

// X (Twitter) Logo SVG
const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// Discord Logo SVG
const DiscordLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

// GitHub Logo SVG
const GithubLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

// 8 Tour Steps with detailed explanations
const TOUR_STEPS = [
  {
    id: "welcome", title: "Welcome to Grounds",
    description: "Grounds is a decision intelligence workspace powered by Google Gemini 3. It turns messy inputs into structured, decision-grade briefs backed by explainable AI analysis.",
    icon: Target,
    details: ["Local-first: your data stays in your browser", "Reproducible: deterministic scoring you can audit", "Export-ready: HTML and PDF artifacts for stakeholders"],
  },
  {
    id: "guide", title: "Step 1: Guide",
    description: "Start here. Access all utilities: scan images with OCR, use templates for common decisions, open saved reports from Gallery, or start fresh with New Case.",
    icon: Lightbulb,
    details: ["Scan Image: extract text from photos or screenshots via OCR", "New Case: start a blank decision brief from scratch", "Template: choose from 11 industry-specific starting points", "Gallery: access your saved local reports anytime"],
  },
  {
    id: "input", title: "Step 2: Decision Input",
    description: "Write your decision context like a calm briefing. Fill in the Title, Context, Intent, Options, Assumptions, Risks, and Evidence.",
    icon: FileText,
    details: ["Title: short, specific decision statement", "Context: one or two paragraphs of background", "Intent: define what success looks like", "Options: at least two concrete alternatives", "Voice input available for hands-free entry"],
  },
  {
    id: "signals", title: "Step 3: Decision Signals (WASM)",
    description: "Real-time feedback powered by WebAssembly. The Rust scoring engine compiles to WASM and runs entirely in-browser with zero server calls, instant results, and complete privacy.",
    icon: Zap,
    details: ["Rust to WebAssembly: lib.rs compiled to WASM", "Readiness 0-100: measures completeness and actionability", "Half-life: predicts how long until the decision degrades", "Blind Spots: detects missing considerations automatically", "100% local computation, zero server latency"],
  },
  {
    id: "critic", title: "Step 4: Gemini Critic",
    description: "Gemini 3 Flash performs deep structural analysis. It flags missing hard edges, vague assumptions, and generic language, then suggests specific improvements to reach decision-grade quality.",
    icon: Search,
    details: ["Model: Gemini 3 Flash (fast, accurate, consistent)", "Detects missing hard edges that weaken decisions", "Flags generic language that reduces actionability", "Suggests specific improvements to reach Grade A", "Temperature 0.2 for focused, deterministic output"],
  },
  {
    id: "compare", title: "Step 5: Provider Compare",
    description: "Run your decision through multiple AI providers for diverse perspectives. Gemini 3 is the featured provider, with OpenAI, Groq, and OpenRouter available for cross-validation.",
    icon: BarChart3,
    details: ["Google Gemini 3 (Featured): primary analysis engine", "OpenAI GPT-4o: alternative perspective and validation", "Groq Llama: fast inference for quick comparison", "OpenRouter: access to 100+ additional models", "Consensus detection highlights agreement/disagreement"],
  },
  {
    id: "sentiment", title: "Step 6: Sentiment Analysis (ABSA)",
    description: "Aspect-Based Sentiment Analysis powered by Groq Llama 4 Scout. Detects emotional tone across decision aspects: stakeholders, risks, options, and outcomes, each with confidence scoring.",
    icon: MessageSquareText,
    details: ["Multi-aspect sentiment detection per topic", "Confidence scoring for each detected sentiment", "Key signal extraction with trigger phrases identified", "Correlation heatmap showing aspect relationships", "Overall sentiment summary with actionable insights"],
  },
  {
    id: "stress", title: "Step 7: Deep Reasoner Stress Test",
    description: "Adversarial AI analysis powered by Gemini 3 that challenges your decision from every angle. Finds critical flaws, uncovers hidden dependencies, and pressure-tests your assumptions against real-world conditions.",
    icon: Shield,
    details: ["Five-dimension robustness scoring (0 to 100 each)", "Devil's Advocate challenges with counter-arguments", "Hidden dependency detection with cascading failure risk", "Probability matrix: overall failure risk and risk correlation", "AI reasoning path: step-by-step transparency", "Results included in HTML and PDF reports with interpretation"],
  },
  {
    id: "export", title: "Step 8: Export Reports",
    description: "Generate professional PDF or HTML reports with full audit trails. Reports include every analysis, 15+ visualizations, and an executive conclusion with recommended next steps.",
    icon: FileSpreadsheet,
    details: ["HTML: interactive report with dark/light theme toggle", "PDF: print-ready, A4-optimized professional output", "JSON: raw data export for data scientists", "Gallery: save locally for future reference", "Share: send directly to stakeholders"],
  },
];

// 7 Workflow Steps matching Quick Actions
const WORKFLOW_STEPS = [
  { num: 1, icon: Lightbulb, title: "Guide", shortDesc: "Quick actions: Scan Image, Template, New Case, Gallery", details: ["Access all utilities in one place", "Scan images with OCR extraction", "11 industry-specific templates", "Open saved reports from Gallery"], color: "emerald" },
  { num: 2, icon: FileText, title: "Input", shortDesc: "Write the decision context: Title, Context, Intent, Options, Risks", details: ["Structured decision briefing format", "Voice input for hands-free entry", "Real-time validation feedback", "Draft, Solid, and Committed states"], color: "cyan" },
  { num: 3, icon: Zap, title: "Signals", shortDesc: "Rust WASM real-time analysis: Readiness, Half-life, Blind Spots", details: ["Rust compiled to WebAssembly", "Instant local computation", "No server round-trip needed", "Privacy-preserving analysis"], color: "yellow" },
  { num: 4, icon: Search, title: "Gemini Critic", shortDesc: "Gemini 3 Flash structural analysis for hard edges and clarity", details: ["Powered by Google Gemini 3", "Detects missing hard edges", "Flags generic language", "Suggests specific improvements"], color: "blue" },
  { num: 5, icon: BarChart3, title: "Compare", shortDesc: "Multi-provider AI comparison with Gemini 3 as the featured provider", details: ["Google Gemini 3 (featured)", "OpenAI, Groq, OpenRouter", "Consensus detection", "Disagreement analysis"], color: "purple" },
  { num: 6, icon: MessageSquareText, title: "Sentiment", shortDesc: "ABSA sentiment analysis across decision aspects", details: ["Aspect-based analysis", "Confidence scoring", "Correlation heatmap", "Key signal extraction"], color: "pink" },
  { num: 7, icon: Shield, title: "Stress Test", shortDesc: "Deep Reasoner adversarial analysis: robustness, flaws, dependencies", details: ["5-dimension robustness scoring", "Devil's Advocate challenges", "Hidden dependency detection", "Probability matrix & failure risk"], color: "violet" },
  { num: 8, icon: FileSpreadsheet, title: "Export", shortDesc: "Generate PDF/HTML reports with a full audit trail", details: ["Decision-grade PDF reports", "Interactive HTML export", "JSON data for analysis", "Local gallery storage"], color: "amber" },
];

// 15 Report Sections
const REPORT_SECTIONS = [
  { name: "Executive Brief", desc: "Quick summary with grade, readiness, half-life, and blind spots" },
  { name: "Decision Readiness Score", desc: "Animated gauge from 0 to 100 with a grade badge (A through F)" },
  { name: "Quality Distribution", desc: "Bar chart showing Readiness, Coverage, and Sentiment breakdown" },
  { name: "Confidence Intervals", desc: "95% confidence interval chart showing uncertainty ranges per metric" },
  { name: "Progress Timeline", desc: "Time series of decision quality over the evaluation period" },
  { name: "Context Word Cloud", desc: "Visual map of key terms from your input" },
  { name: "Radar Chart", desc: "Six-axis spider chart: Readiness, Risk, Evidence, Assumptions, Actionability, Confidence" },
  { name: "Priority Actions", desc: "Color-coded checklist: High (red), Medium (yellow), Low (green)" },
  { name: "Blind Spot Analysis", desc: "Identified gaps with suggested mitigations" },
  { name: "Provider Compare", desc: "Side-by-side AI provider analysis with consensus and disagreement" },
  { name: "Gemini Critic", desc: "Structural analysis: hard edges, generic language, and improvements" },
  { name: "Sentiment Heatmap", desc: "Correlation matrix across sentiment aspects" },
  { name: "ABSA Insights", desc: "Stakeholder sentiment breakdown with key signals" },
  { name: "Deep Reasoner Stress Test", desc: "Robustness scores, critical flaws, devil's advocate findings, hidden dependencies, and probability matrix" },
  { name: "Conclusion", desc: "AI-generated summary with a recommendation and next steps" },
  { name: "Data Export", desc: "JSON export for data scientists, stats summary for decision-makers" },
];

// Target Users based on 11 themes
const TARGET_USERS = [
  { icon: Cpu, name: "Tech Leaders" }, { icon: Stethoscope, name: "Healthcare" },
  { icon: DollarSign, name: "Finance" }, { icon: Users, name: "HR Directors" },
  { icon: GraduationCap, name: "Educators" }, { icon: Scale, name: "Legal Teams" },
  { icon: Building, name: "Real Estate" }, { icon: Plane, name: "Travel" },
  { icon: Home, name: "Life Decisions" }, { icon: Briefcase, name: "Entrepreneurs" },
  { icon: FlaskConical, name: "Researchers" },
];

export function AboutModal({ isOpen, onClose, onStartTour }: AboutModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "workflow" | "reports" | "benefits" | "creator">("overview");
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") { showTour ? (setShowTour(false), setTourStep(0)) : onClose(); }
    };
    if (isOpen) { document.addEventListener("keydown", handleEscape); document.body.style.overflow = "hidden"; }
    return () => { document.removeEventListener("keydown", handleEscape); document.body.style.overflow = ""; };
  }, [isOpen, onClose, showTour]);

  const handleStartTour = useCallback(() => { setShowTour(true); setTourStep(0); }, []);
  const handleNextStep = useCallback(() => {
    if (tourStep < TOUR_STEPS.length - 1) setTourStep(tourStep + 1);
    else { setShowTour(false); setTourStep(0); onClose(); onStartTour?.(); }
  }, [tourStep, onClose, onStartTour]);
  const handlePrevStep = useCallback(() => { if (tourStep > 0) setTourStep(tourStep - 1); }, [tourStep]);

  const getColor = (c: string) => {
    const m: Record<string, { bg: string; text: string; border: string; hover: string }> = {
      emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", hover: "hover:bg-emerald-500/30 hover:border-emerald-400/50" },
      cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30", hover: "hover:bg-cyan-500/30 hover:border-cyan-400/50" },
      yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", hover: "hover:bg-yellow-500/30 hover:border-yellow-400/50" },
      blue: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", hover: "hover:bg-blue-500/30 hover:border-blue-400/50" },
      purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30", hover: "hover:bg-purple-500/30 hover:border-purple-400/50" },
      pink: { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30", hover: "hover:bg-pink-500/30 hover:border-pink-400/50" },
      amber: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", hover: "hover:bg-amber-500/30 hover:border-amber-400/50" },
    };
    return m[c] || m.emerald;
  };

  if (!isOpen) return null;
  const tabs = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "workflow", label: "Workflow", icon: ArrowRight },
    { id: "reports", label: "Reports", icon: FileSpreadsheet },
    { id: "benefits", label: "Benefits", icon: Award },
    { id: "creator", label: "Creator", icon: User },
  ] as const;
  const step = TOUR_STEPS[tourStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && !showTour && onClose()}>
          
          {showTour ? (
            /* Guided Tour */
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-lg bg-gradient-to-br from-[#0d0e16] via-[#0f1019] to-[#0d0e16] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-white/40">Step {tourStep + 1} of {TOUR_STEPS.length}</span>
                  <button onClick={() => { setShowTour(false); setTourStep(0); }} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors">
                    <SkipForward className="w-3 h-3" /> Skip
                  </button>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                    animate={{ width: `${((tourStep + 1) / TOUR_STEPS.length) * 100}%` }} />
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                    <step.icon className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{step.title}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
                {step.details && (
                  <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-white/40 mb-2 font-medium">Key Features:</div>
                    <ul className="space-y-1.5">
                      {step.details.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="px-6 pb-6 flex items-center justify-between">
                <button onClick={handlePrevStep} disabled={tourStep === 0}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tourStep === 0 ? "text-white/20" : "text-white/60 hover:bg-white/10"}`}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex gap-1">
                  {TOUR_STEPS.map((_, i) => (
                    <button key={i} onClick={() => setTourStep(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === tourStep ? "bg-emerald-400 w-6" : i < tourStep ? "bg-emerald-400/50" : "bg-white/20"}`} />
                  ))}
                </div>
                <button onClick={handleNextStep} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors">
                  {tourStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* Main Modal */
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl bg-gradient-to-br from-[#0d0e16] via-[#0f1019] to-[#0d0e16] border border-white/10 shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

              {/* Header */}
              <div className="flex-shrink-0 relative px-6 py-5 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Logo with vibrant animated gradient ring - larger color ring, smaller black center */}
                    <div className="relative w-10 h-10">
                      {/* Animated gradient ring - outer glow */}
                      <motion.div 
                        className="absolute -inset-1 rounded-full opacity-50 blur-md"
                        style={{ background: "conic-gradient(from 0deg, #67e8f9, #a855f7, #fb7185, #34d399, #67e8f9)" }}
                        animate={{ rotate: 360 }} 
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }} 
                      />
                      {/* Main gradient ring */}
                      <div className="absolute inset-0 rounded-full overflow-hidden">
                        <motion.div 
                          className="absolute inset-0 rounded-full"
                          style={{ background: "conic-gradient(from 0deg, #67e8f9, #a855f7, #fb7185, #fbbf24, #34d399, #67e8f9)" }}
                          animate={{ rotate: 360 }} 
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }} 
                        />
                      </div>
                      {/* Smaller inner circle with "G" - reduced size for more color visibility */}
                      <div className="absolute inset-[6px] rounded-full bg-[#0d0e16] flex items-center justify-center border border-white/10">
                        <span className="text-base font-black bg-gradient-to-br from-cyan-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">G</span>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">About Grounds</h2>
                      <p className="text-xs text-white/50">Decision Intelligence Workspace</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] font-semibold text-white/70">Powered by Google Gemini 3</span>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-1 mt-4 p-1 bg-white/5 rounded-xl w-fit overflow-x-auto">
                  {tabs.map((t) => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === t.id ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}>
                      <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 relative px-6 py-6 overflow-y-auto" style={{ minHeight: 0 }}>
                <AnimatePresence mode="wait">
                  {activeTab === "overview" && (
                    <motion.div key="overview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                      <div className="text-center py-4">
                        <h3 className="text-2xl font-bold text-white mb-2">Think Better, Not Faster</h3>
                        <p className="text-white/60 max-w-xl mx-auto text-sm">Grounds transforms messy decision inputs into structured, shareable, decision-grade briefs backed by explainable signals and professional artifacts.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[{ icon: Shield, title: "Local-First", desc: "Your data stays in your browser. Nothing stored on a server.", color: "emerald", hoverBg: "rgba(16,185,129,0.1)", hoverBorder: "rgba(16,185,129,0.4)" },
                          { icon: CheckCircle2, title: "Reproducible", desc: "Deterministic scoring you can audit and explain.", color: "cyan", hoverBg: "rgba(6,182,212,0.1)", hoverBorder: "rgba(6,182,212,0.4)" },
                          { icon: FileText, title: "Export-Ready", desc: "HTML and PDF artifacts ready for stakeholders.", color: "purple", hoverBg: "rgba(168,85,247,0.1)", hoverBorder: "rgba(168,85,247,0.4)" }].map((item, i) => (
                          <motion.div key={i} 
                            whileHover={{ scale: 1.03, y: -2, backgroundColor: item.hoverBg, borderColor: item.hoverBorder }} 
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center cursor-default transition-all duration-200">
                            <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-${item.color}-500/20 to-cyan-500/20 flex items-center justify-center`}>
                              <item.icon className={`w-6 h-6 text-${item.color}-400`} />
                            </div>
                            <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                            <p className="text-xs text-white/50">{item.desc}</p>
                          </motion.div>
                        ))}
                      </div>
                      {/* Gemini 3 Powers Core Features - with hover animations */}
                      <motion.div whileHover={{ scale: 1.01, borderColor: "rgba(59,130,246,0.4)" }}
                        className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-5 h-5 text-blue-400" />
                          <span className="font-semibold text-white">Gemini 3 Powers Core Features</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {[{ t: "Gemini Critic: structural hard-edge review", c: "blue" }, 
                            { t: "Provider Compare: multi-AI consensus", c: "emerald" }, 
                            { t: "Deep Reasoner: adversarial stress test", c: "pink" },
                            { t: "Monte Carlo: probability simulation", c: "amber" },
                            { t: "Smart Suggestions: fix recommendations", c: "cyan" }].map((f, i) => (
                            <motion.div key={i} whileHover={{ x: 4, color: "#fff" }} 
                              className="flex items-center gap-2 text-white/60 cursor-default transition-all">
                              <CheckCircle2 className={`w-3 h-3 text-${f.c}-400`} /> {f.t}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {activeTab === "workflow" && (
                    <motion.div key="workflow" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-white">7-Step Workflow</h3>
                        <span className="text-xs text-white/40">Click step for details</span>
                      </div>
                      {WORKFLOW_STEPS.map((s, i) => {
                        const c = getColor(s.color);
                        const exp = expandedStep === i;
                        return (
                          <div key={i} onClick={() => setExpandedStep(exp ? null : i)}
                            className={`cursor-pointer rounded-xl border transition-all duration-150 ${exp ? `${c.border} ${c.bg}` : `border-white/10 bg-white/5 hover:border-white/20`}`}>
                            <div className="flex items-start gap-3 p-3">
                              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center ${c.text} font-bold text-sm`}>{s.num}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <s.icon className={`w-3.5 h-3.5 ${c.text}`} />
                                  <h4 className="font-semibold text-white text-sm">{s.title}</h4>
                                </div>
                                <p className="text-xs text-white/50">{s.shortDesc}</p>
                                {exp && (
                                  <div className="mt-2 pt-2 border-t border-white/10">
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {s.details.map((d, j) => (
                                        <div key={j} className="flex items-center gap-1.5 text-[11px]">
                                          <CheckCircle2 className={`w-2.5 h-2.5 ${c.text}`} />
                                          <span className="text-white/70">{d}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <ChevronRight className={`w-4 h-4 text-white/30 transition-transform duration-150 ${exp ? "rotate-90" : ""}`} />
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}

                  {activeTab === "reports" && (
                    <motion.div key="reports" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <h3 className="text-lg font-bold text-white">What's in Your Report</h3>
                      <p className="text-sm text-white/50">Comprehensive decision-grade reports with 15+ sections:</p>
                      
                      {/* FIXED: Vertical list, bigger font */}
                      <div className="space-y-2">
                        {REPORT_SECTIONS.map((s, i) => (
                          <motion.div key={i} 
                            whileHover={{ scale: 1.01, x: 4, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(52,211,153,0.4)" }}
                            className="p-3 rounded-xl border border-white/10 cursor-default transition-all duration-200">
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-emerald-400">{i + 1}</span>
                              </div>
                              <div>
                                <h5 className="font-semibold text-white text-sm">{s.name}</h5>
                                <p className="text-xs text-white/50 mt-0.5">{s.desc}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Export formats with hover - FIXED: Match HTML button colors */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-sm text-white/60 mb-3 font-medium">Export Formats:</div>
                        <div className="flex flex-wrap gap-2">
                          {[{ n: "HTML", d: "Interactive, dark/light", bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", hoverBg: "hover:bg-cyan-500/20", hoverBorder: "hover:border-cyan-500/40" }, 
                            { n: "PDF", d: "Print-ready, A4", bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", hoverBg: "hover:bg-purple-500/20", hoverBorder: "hover:border-purple-500/40" }, 
                            { n: "JSON", d: "Raw data export", bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", hoverBg: "hover:bg-amber-500/20", hoverBorder: "hover:border-amber-500/40" }].map((f, i) => (
                            <motion.div key={i} 
                              whileHover={{ scale: 1.05, y: -2 }}
                              className={`px-4 py-2 rounded-lg ${f.bg} border ${f.border} ${f.hoverBg} ${f.hoverBorder} cursor-default transition-all duration-200`}>
                              <span className={`text-sm font-semibold ${f.text}`}>{f.n}</span>
                              <span className="text-xs text-white/40 ml-2">{f.d}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "benefits" && (
                    <motion.div key="benefits" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <h3 className="text-lg font-bold text-white">Why Grounds?</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[{ icon: Zap, title: "Rust → WASM Scoring", desc: "Readiness 0 to 100, half-life decay, and blind spot detection, all computed locally in-browser via WebAssembly. Zero server latency, full privacy.", hoverBg: "rgba(234,179,8,0.1)", hoverBorder: "rgba(234,179,8,0.3)", iconColor: "text-yellow-400" },
                          { icon: Search, title: "Gemini Critic Review", desc: "Flags missing hard edges, vague assumptions, and generic language. Returns targeted improvements with full model transparency.", hoverBg: "rgba(59,130,246,0.1)", hoverBorder: "rgba(59,130,246,0.3)", iconColor: "text-blue-400" },
                          { icon: BarChart3, title: "Provider Compare", desc: "Runs decisions through Gemini 3, OpenAI, Groq, and OpenRouter at the same time. Consensus detection highlights where models agree.", hoverBg: "rgba(168,85,247,0.1)", hoverBorder: "rgba(168,85,247,0.3)", iconColor: "text-purple-400" },
                          { icon: MessageSquareText, title: "ABSA Sentiment", desc: "Aspect-Based Sentiment Analysis across stakeholders, risks, and options. Per-aspect confidence scoring with a correlation heatmap.", hoverBg: "rgba(236,72,153,0.1)", hoverBorder: "rgba(236,72,153,0.3)", iconColor: "text-pink-400" },
                          { icon: Shield, title: "Deep Reasoner Stress Test", desc: "Five-dimension robustness scoring, devil's advocate challenges, hidden dependency detection, and a probability failure matrix.", hoverBg: "rgba(139,92,246,0.1)", hoverBorder: "rgba(139,92,246,0.3)", iconColor: "text-violet-400" },
                          { icon: Brain, title: "Monte Carlo Simulation", desc: "1,000 probabilistic simulations that produce a median outcome, success probability, and confidence intervals from input quality.", hoverBg: "rgba(16,185,129,0.1)", hoverBorder: "rgba(16,185,129,0.3)", iconColor: "text-emerald-400" },
                          { icon: FileText, title: "PDF & HTML Reports", desc: "15+ sections including gauges, radar charts, word clouds, heatmaps, box plots, and a Data Science Insights Summary with full audit trail.", hoverBg: "rgba(6,182,212,0.1)", hoverBorder: "rgba(6,182,212,0.3)", iconColor: "text-cyan-400" },
                          { icon: Lightbulb, title: "11 Industry Templates", desc: "Pre-built decision frameworks spanning Tech, Healthcare, Finance, Legal, HR, Education, Real Estate, Travel, Life, Entrepreneurship, and Research.", hoverBg: "rgba(245,158,11,0.1)", hoverBorder: "rgba(245,158,11,0.3)", iconColor: "text-amber-400" }].map((item, i) => (
                          <motion.div key={i} 
                            whileHover={{ scale: 1.02, y: -2, backgroundColor: item.hoverBg, borderColor: item.hoverBorder }}
                            className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-default transition-all duration-200">
                            <item.icon className={`w-5 h-5 ${item.iconColor} mt-0.5 flex-shrink-0`} />
                            <div>
                              <h4 className="font-medium text-white text-sm">{item.title}</h4>
                              <p className="text-[11px] text-white/50 leading-relaxed">{item.desc}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      <motion.div whileHover={{ scale: 1.01, borderColor: "rgba(168,85,247,0.4)" }}
                        className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 transition-all duration-200">
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-400" /> Built for Decision Makers Across 11 Domains
                        </h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {TARGET_USERS.map((u, i) => (
                            <motion.div key={i} whileHover={{ scale: 1.05, x: 2 }}
                              className="flex items-center gap-2 text-xs text-white/60 cursor-default transition-all hover:text-purple-300">
                              <u.icon className="w-3.5 h-3.5 text-purple-400" /> {u.name}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                      {/* What Makes Grounds Different */}
                      <motion.div whileHover={{ scale: 1.01, borderColor: "rgba(251,191,36,0.4)" }}
                        className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 transition-all duration-200">
                        <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                          <Award className="w-4 h-4" /> What Makes Grounds Different
                        </h4>
                        <ul className="space-y-1.5 text-xs text-white/60">
                          {["Not a chatbot. A structured workspace where every metric is explainable and auditable",
                            "Reproducible scoring: the Rust/WASM engine produces deterministic results. Same inputs, same outputs, every time",
                            "Seven-stage pipeline: WASM signals, Gemini Critic, ABSA sentiment, provider consensus, stress test, Monte Carlo, export",
                            "Local-first architecture: decision data stays in the browser. Only analysis calls go to Gemini 3",
                            "Decision-grade output: PDF reports with 15+ data visualizations that stakeholders can act on",
                            "Gemini 3 native: built specifically for structured critique and deep reasoning with adversarial stress testing"].map((t, i) => (
                            <motion.li key={i} whileHover={{ x: 4, color: "#fbbf24" }} 
                              className="flex items-start gap-2 cursor-default transition-all">
                              <span className="text-amber-400 mt-0.5">✦</span>
                              <span>{t}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    </motion.div>
                  )}

                  {activeTab === "creator" && (
                    <motion.div key="creator" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      {/* Creator Card with Animated Astronaut Avatar */}
                      <motion.div whileHover={{ borderColor: "rgba(103,232,249,0.4)" }}
                        className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-500/5 to-purple-500/5 border border-white/10 transition-all duration-200">
                        {/* Animated Astronaut Avatar */}
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <motion.div
                            animate={{ y: [0, -4, 0], rotate: [0, 3, -3, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-500/40 flex items-center justify-center overflow-hidden relative"
                          >
                            {/* Stars background */}
                            <div className="absolute inset-0">
                              {[...Array(6)].map((_, i) => (
                                <motion.div key={i}
                                  animate={{ opacity: [0.2, 1, 0.2] }}
                                  transition={{ duration: 1.5 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
                                  className="absolute w-0.5 h-0.5 bg-white rounded-full"
                                  style={{ top: `${15 + (i * 37) % 70}%`, left: `${10 + (i * 53) % 80}%` }}
                                />
                              ))}
                            </div>
                            {/* Astronaut SVG */}
                            <svg viewBox="0 0 64 64" className="w-12 h-12 relative z-10">
                              {/* Helmet */}
                              <circle cx="32" cy="24" r="14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5"/>
                              <circle cx="32" cy="24" r="10" fill="#1e293b"/>
                              {/* Visor reflection */}
                              <ellipse cx="29" cy="22" rx="4" ry="5" fill="#06b6d4" opacity="0.3"/>
                              <ellipse cx="28" cy="20" rx="2" ry="3" fill="#67e8f9" opacity="0.5"/>
                              {/* Body */}
                              <rect x="22" y="37" width="20" height="16" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1"/>
                              {/* Backpack */}
                              <rect x="19" y="39" width="4" height="10" rx="2" fill="#cbd5e1"/>
                              <rect x="41" y="39" width="4" height="10" rx="2" fill="#cbd5e1"/>
                              {/* Belt */}
                              <rect x="24" y="43" width="16" height="2" rx="1" fill="#06b6d4" opacity="0.8"/>
                              {/* Flag on arm */}
                              <line x1="42" y1="40" x2="48" y2="36" stroke="#94a3b8" strokeWidth="1"/>
                              <rect x="46" y="33" width="6" height="4" rx="0.5" fill="#a855f7" opacity="0.8"/>
                            </svg>
                          </motion.div>
                          {/* Floating orbital ring */}
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-[-3px] rounded-full border border-dashed border-cyan-500/20"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white">Wiqi Lee</h3>
                          <p className="text-sm text-white/50 mb-3">Data Scientist • AI/ML Researcher • Software Engineer • Cellist</p>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {["Python", "Rust", "Java", "Julia", "TypeScript", "React"].map((t, i) => (
                              <span key={i} className="px-2 py-0.5 text-[10px] rounded bg-white/10 text-white/60">{t}</span>
                            ))}
                          </div>
                          <div className="flex gap-3">
                            <motion.a href="https://twitter.com/wiqi_lee" target="_blank" rel="noopener noreferrer"
                              whileHover={{ scale: 1.05, y: -2, backgroundColor: "#059669" }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:text-white text-xs font-medium transition-all">
                              <XLogo className="w-3.5 h-3.5" /> @wiqi_lee
                            </motion.a>
                            <motion.a href="https://github.com/wiqilee" target="_blank" rel="noopener noreferrer"
                              whileHover={{ scale: 1.05, y: -2, backgroundColor: "#ec4899" }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-400 hover:text-white text-xs font-medium transition-all">
                              <GithubLogo className="w-3.5 h-3.5" /> wiqilee
                            </motion.a>
                            <motion.a href="https://discord.com/users/209385020912173066" target="_blank" rel="noopener noreferrer"
                              whileHover={{ scale: 1.05, y: -2, backgroundColor: "#5865f2" }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5865F2]/15 border border-[#5865F2]/30 text-[#5865F2] hover:text-white text-xs font-medium transition-all">
                              <DiscordLogo className="w-3.5 h-3.5" /> Discord
                            </motion.a>
                          </div>
                        </div>
                      </motion.div>

                      {/* Why I Built Grounds - Problem → Solution Hook */}
                      <motion.div whileHover={{ borderColor: "rgba(239,68,68,0.4)", scale: 1.01 }}
                        className="p-4 rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-orange-500/5 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base">🔥</span>
                          <h4 className="font-semibold text-red-400 text-sm">The Problem</h4>
                        </div>
                        <div className="space-y-2">
                          {[
                            { icon: "🎲", text: "Most decisions are driven by gut feelings, scattered notes, and zero audit trail." },
                            { icon: "⏳", text: "Teams burn hours in meetings debating opinions instead of analyzing data." },
                            { icon: "🕳️", text: "When things go wrong, nobody can trace why a decision was made or what blind spots were missed." },
                            { icon: "📉", text: <>Roughly <strong className="text-white/80">70% of strategic initiatives fail to hit their goals</strong> (McKinsey).</> },
                            { icon: "🧠", text: "The root causes are cognitive bias, poor problem framing, and a lack of structured debate, not poor execution." },
                          ].map((item, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-white/60 leading-relaxed">
                              <span className="flex-shrink-0 mt-0.5">{item.icon}</span>
                              <span>{item.text}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>

                      <motion.div whileHover={{ borderColor: "rgba(16,185,129,0.4)", scale: 1.01 }}
                        className="p-4 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">✅</span>
                          <h4 className="font-semibold text-emerald-400 text-sm">Grounds: The Solution</h4>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed mb-3">
                          Grounds brings <strong className="text-white/80">statistical rigor to everyday decision-making</strong>. Instead of guessing, you get 
                          reproducible scores, confidence intervals, blind spot detection, adversarial stress tests, and multi-AI consensus, 
                          all in one workspace. Every analysis is exportable as a professional PDF report with a full audit trail.
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 mb-3">
                          {[
                            { icon: "🎯", text: "Readiness scoring (0-100) with grade" },
                            { icon: "🧠", text: "Gemini 3 blind spot detection" },
                            { icon: "⚔️", text: "Devil's Advocate stress testing" },
                            { icon: "📊", text: "Monte Carlo probability simulation" },
                            { icon: "💬", text: "ABSA Sentiment aspect analysis" },
                            { icon: "⚖️", text: "Provider Compare (multi-AI consensus)" },
                            { icon: "🔬", text: "Gemini Critic hard-edge review" },
                            { icon: "📄", text: "Professional PDF + HTML reports" },
                          ].map((item, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[10px] text-white/50">
                              <span>{item.icon}</span>
                              <span>{item.text}</span>
                            </div>
                          ))}
                        </div>
                        {/* 11 Theme Templates */}
                        <div className="pt-2 border-t border-emerald-500/10">
                          <p className="text-[10px] text-emerald-400/70 font-medium mb-1.5">11 Industry Templates</p>
                          <div className="flex flex-wrap gap-1">
                            {TARGET_USERS.map((u, i) => {
                              const Icon = u.icon;
                              return (
                                <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded bg-white/5 text-white/40 border border-white/5">
                                  <Icon className="w-2.5 h-2.5" />{u.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>

                      <motion.div whileHover={{ borderColor: "rgba(255,255,255,0.2)", scale: 1.01 }}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">💡</span>
                          <h4 className="font-semibold text-white text-sm">Why This Matters</h4>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">
                          As a data scientist, I kept running into the same problem: making good decisions under uncertainty is 
                          surprisingly hard. When Google announced Gemini 3, I saw a chance to build something meaningful: a <strong className="text-white/80">decision intelligence 
                          workspace</strong> that combines local-first privacy, reproducible WASM scoring, and cutting-edge AI analysis. 
                          Grounds turns messy inputs into decision-grade briefs you can defend, share, and revisit.
                        </p>
                      </motion.div>

                      <motion.div whileHover={{ borderColor: "rgba(236,72,153,0.4)", scale: 1.01 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-pink-500/5 border border-pink-500/20 transition-all duration-200">
                        <Music className="w-5 h-5 text-pink-400" />
                        <div>
                          <span className="text-sm font-medium text-white">When not coding:</span>
                          <span className="text-sm text-white/50 ml-2">I play the cello, dig into music theory, and share open-source work on X.</span>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 relative px-6 py-4 border-t border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <a href="https://github.com/wiqilee/grounds" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors">
                      <GithubLogo className="w-3 h-3" /> GitHub
                    </a>
                    <span className="text-xs text-white/30">Google Gemini 3 Hackathon 2026</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleStartTour}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 border border-emerald-500/20 transition-all">
                      <Play className="w-3 h-3" /> Guided Tour
                    </button>
                    <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/15 transition-all">Close</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
