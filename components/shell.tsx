// components/shell.tsx
// App shell with theme control, header navigation, and About modal integration

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { AboutModal } from "@/components/AboutModal";

type Theme = "dark" | "light";
type ShellMode = "app" | "preview";

const STORAGE_KEY = "GROUNDS_PREVIEW_THEME";

// ============================================================================
// ANIMATED LOGO - Matching the premium style from AboutModal
// ============================================================================

function AnimatedLogo() {
  return (
    <div className="flex items-center gap-2.5">
      {/* Animated G Ring */}
      <div className="relative w-9 h-9">
        {/* Outer glow */}
        <motion.div 
          className="absolute -inset-1 rounded-full opacity-40 blur-md"
          style={{ 
            background: "conic-gradient(from 0deg, #67e8f9, #a855f7, #fb7185, #fbbf24, #34d399, #67e8f9)" 
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        {/* Main gradient ring */}
        <motion.div 
          className="absolute inset-0 rounded-full"
          style={{ 
            background: "conic-gradient(from 0deg, #67e8f9, #a855f7, #fb7185, #fbbf24, #34d399, #67e8f9)" 
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        {/* Inner dark circle */}
        <div className="absolute inset-[5px] rounded-full bg-[#0d1117] border border-white/10 flex items-center justify-center">
          <span className="text-sm font-black bg-gradient-to-br from-cyan-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            G
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col">
        <span className="text-[14px] font-semibold text-white/90 leading-tight">
          Grounds
        </span>
        <span className="text-[11px] text-emerald-400/70 leading-tight">
          decision-grade reports
        </span>
      </div>
    </div>
  );
}

export function Shell({
  children,
  mode = "app",
}: {
  children: React.ReactNode;
  mode?: ShellMode;
}) {
  const reduce = useReducedMotion();

  const allowThemeToggle = mode === "preview";

  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  useEffect(() => {
    if (!allowThemeToggle) {
      setTheme("dark");
      setMounted(true);
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
        setMounted(true);
        return;
      }
    } catch {
      // ignore
    }

    try {
      const prefersLight =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: light)")?.matches;

      setTheme(prefersLight ? "light" : "dark");
    } catch {
      setTheme("dark");
    } finally {
      setMounted(true);
    }
  }, [allowThemeToggle]);

  useEffect(() => {
    const root = document.documentElement;

    if (!allowThemeToggle) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
      return;
    }

    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme, allowThemeToggle]);

  const themeIcon = useMemo(() => (theme === "dark" ? "🌙" : "☀️"), [theme]);
  const themeLabel = useMemo(() => (theme === "dark" ? "Dark" : "Light"), [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

  if (!mounted) {
    return <div className="min-h-screen bg-[#05060a]" />;
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-black/30">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={reduce ? false : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between gap-3"
          >
            {/* Left - Logo */}
            <div className="flex items-center gap-3">
              <AnimatedLogo />
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2">
              {/* About Button */}
              <button
                type="button"
                onClick={() => setShowAboutModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[13px] font-medium transition-all hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/25 active:scale-[0.98] border border-transparent hover:border-emerald-500/30"
                title="About Grounds"
                aria-label="About Grounds"
              >
                <HelpCircle className="w-4 h-4 text-slate-500 dark:text-white/60" />
                <span className="hidden sm:inline text-slate-600 dark:text-white/70">About</span>
              </button>

              {/* Theme toggle (preview only) */}
              {allowThemeToggle && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[13px] transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/25 active:scale-[0.98]"
                  title="Toggle theme (preview)"
                  aria-label="Toggle dark / light (preview)"
                >
                  <span aria-hidden="true">{themeIcon}</span>
                  <span className="hidden sm:inline">{themeLabel}</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 pb-10">
        <div className="text-[12px] text-slate-600 dark:text-white/50">
          Built by{" "}
          <span className="font-medium text-slate-900 dark:text-white/80">
            Wiqi Lee
          </span>
          {" "}for{" "}
          <span className="font-medium text-cyan-600 dark:text-cyan-400/80">
            Gemini 3 Hackathon 2026
          </span>
        </div>
      </footer>

      {/* About Modal */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        onStartTour={() => {
          setShowAboutModal(false);
        }}
      />
    </div>
  );
}
