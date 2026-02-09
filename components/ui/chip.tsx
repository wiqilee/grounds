"use client";

import React from "react";
import { motion } from "framer-motion";

export function Chip({
  label,
  tone = "neutral",
  hint,
}: {
  label: string;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
  hint?: string;
}) {
  const map: Record<string, string> = {
    neutral: "bg-white/6 border-white/12 text-white/80",
    good: "bg-emerald-400/10 border-emerald-300/20 text-emerald-100",
    warn: "bg-amber-400/10 border-amber-300/20 text-amber-100",
    bad: "bg-rose-400/10 border-rose-300/20 text-rose-100",
    info: "bg-cyan-300/10 border-cyan-200/20 text-cyan-100",
  };
  return (
    <motion.span
      whileHover={{ y: -1 }}
      className={[
        "inline-flex items-center rounded-2xl border px-3 py-1.5 text-[12px]",
        map[tone],
      ].join(" ")}
      title={hint}
      data-ink
    >
      {label}
    </motion.span>
  );
}
