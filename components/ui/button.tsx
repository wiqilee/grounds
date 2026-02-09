"use client";

import React from "react";
import { motion } from "framer-motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-white/10 border-white/15 hover:bg-white/14 hover:border-white/25 shadow-glow",
  secondary:
    "bg-white/6 border-white/12 hover:bg-white/10 hover:border-white/20",
  ghost: "bg-transparent border-white/10 hover:bg-white/8 hover:border-white/18",
  danger:
    "bg-rose-400/10 border-rose-300/20 hover:bg-rose-400/14 hover:border-rose-300/30",
};

export function Button({
  children,
  variant = "secondary",
  className = "",
  onClick,
  type = "button",
  disabled,
  title,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={[
        "group inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-medium",
        "border transition disabled:opacity-50 disabled:cursor-not-allowed",
        styles[variant],
        className,
      ].join(" ")}
      data-ink
    >
      <span className="relative">
        {children}
        <span className="pointer-events-none absolute -inset-x-10 -inset-y-3 opacity-0 group-hover:opacity-100 transition">
          <span className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </span>
      </span>
    </motion.button>
  );
}
