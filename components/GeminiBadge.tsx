// components/GeminiBadge.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface GeminiBadgeProps {
  variant?: "header" | "footer" | "compact" | "showcase";
  className?: string;
  animated?: boolean;
}

// Gemini logo SVG
function GeminiLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <linearGradient id="gemini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="25%" stopColor="#9B72CB" />
          <stop offset="50%" stopColor="#D96570" />
          <stop offset="75%" stopColor="#F49C46" />
          <stop offset="100%" stopColor="#34A853" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
        fill="url(#gemini-grad)"
      />
      <path
        d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
        fill="url(#gemini-grad)"
        opacity="0.6"
      />
      <circle cx="12" cy="12" r="2" fill="url(#gemini-grad)" />
    </svg>
  );
}

export function GeminiBadge({ variant = "header", className = "", animated = true }: GeminiBadgeProps) {
  // Header variant - compact, horizontal
  if (variant === "header") {
    return (
      <motion.div
        initial={animated ? { opacity: 0, x: -10 } : undefined}
        animate={animated ? { opacity: 1, x: 0 } : undefined}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-amber-500/10 border border-white/10 backdrop-blur-sm ${className}`}
      >
        <GeminiLogo className="w-4 h-4" />
        <span className="text-[11px] font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
          Powered by Gemini 3
        </span>
        {animated && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-3 h-3 text-amber-400/60" />
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Footer variant - more prominent
  if (variant === "footer") {
    return (
      <motion.div
        initial={animated ? { opacity: 0, y: 10 } : undefined}
        animate={animated ? { opacity: 1, y: 0 } : undefined}
        className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5 border border-white/10 ${className}`}
      >
        <div className="flex items-center gap-2">
          <GeminiLogo className="w-5 h-5" />
          <div className="flex flex-col">
            <span className="text-xs font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Google Gemini 3
            </span>
            <span className="text-[9px] text-white/40">API Competition 2025</span>
          </div>
        </div>
        <div className="w-px h-6 bg-white/10" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/50">Features:</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-300">Critic</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300">Grounding</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300">Compare</span>
        </div>
      </motion.div>
    );
  }

  // Compact variant - just icon and text
  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-1.5 text-[10px] text-white/50 ${className}`}>
        <GeminiLogo className="w-3 h-3" />
        <span>Gemini 3</span>
      </div>
    );
  }

  // Showcase variant - large, prominent for demo/hackathon
  if (variant === "showcase") {
    return (
      <motion.div
        initial={animated ? { opacity: 0, scale: 0.9 } : undefined}
        animate={animated ? { opacity: 1, scale: 1 } : undefined}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1b26] to-[#0d0e16] border border-white/10 p-6 ${className}`}
      >
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: "conic-gradient(from 0deg at 50% 50%, #4285F4, #9B72CB, #D96570, #F49C46, #34A853, #4285F4)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-[#1a1b26] to-[#0d0e16]" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10">
              <GeminiLogo className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                Powered by Google Gemini 3
              </h3>
              <p className="text-sm text-white/50">Next-generation multimodal AI</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Gemini Critic", desc: "Structural analysis", color: "blue" },
              { label: "Grounding", desc: "Web search integration", color: "emerald" },
              { label: "Multi-Provider", desc: "Cross-validation", color: "purple" },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={animated ? { opacity: 0, y: 20 } : undefined}
                animate={animated ? { opacity: 1, y: 0 } : undefined}
                transition={{ delay: 0.1 * i }}
                className={`p-3 rounded-xl bg-${feature.color}-500/10 border border-${feature.color}-500/20`}
              >
                <div className={`text-sm font-semibold text-${feature.color}-400 mb-0.5`}>
                  {feature.label}
                </div>
                <div className="text-[10px] text-white/40">{feature.desc}</div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-white/40">
              Built for Google Gemini API Developer Competition 2025
            </span>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}

// Floating badge that stays visible
export function GeminiFloatingBadge({ className = "" }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`fixed bottom-4 right-4 z-50 ${className}`}
    >
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#0d0e16]/90 border border-white/10 backdrop-blur-sm shadow-lg">
        <GeminiLogo className="w-4 h-4" />
        <span className="text-[10px] font-medium text-white/70">Gemini 3</span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    </motion.div>
  );
}
