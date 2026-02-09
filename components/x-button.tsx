"use client";

import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

function XLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M18.9 2H22l-7.4 8.5L23 22h-6.6l-5.1-6.5L5.6 22H2.5l8-9.2L2 2h6.7l4.6 5.9L18.9 2Zm-1.2 18h1.7L7.4 3.9H5.6l12.1 16.1Z"
      />
    </svg>
  );
}

/**
 * Premium button feel:
 * - stable layout (no blur overflow)
 * - subtle lift, inset highlight, sheen sweep (clipped)
 * - strong focus ring, disabled styles
 */
function fx(extra = "") {
  return [
    "relative overflow-hidden isolate",
    "transition-[transform,background,box-shadow,border-color,opacity,color] duration-150",
    "hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99]",
    "ring-1 ring-white/10 hover:ring-white/15",
    "shadow-[0_0_0_1px_rgba(255,255,255,.04)]",
    "hover:shadow-[inset_0_0_0_1px_rgba(34,197,94,.20),inset_0_0_18px_rgba(34,197,94,.07),0_0_0_1px_rgba(255,255,255,.05)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/35",
    "disabled:opacity-50 disabled:pointer-events-none",
    // sheen sweep (clipped)
    "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-150",
    "after:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.10),transparent)]",
    "after:translate-x-[-35%] hover:after:translate-x-[35%] after:transition-transform after:duration-500",
    extra,
  ].join(" ");
}

export function XButton({
  handle = "wiqi_lee",
  disabled = false,
  variant = "full",
}: {
  handle?: string;
  disabled?: boolean;
  /** "full" shows X logo + @handle, "icon" shows icon-only */
  variant?: "full" | "icon";
}) {
  const reduce = useReducedMotion();
  const cleanHandle = handle.replace("@", "");
  const url = useMemo(() => `https://x.com/${cleanHandle}`, [cleanHandle]);

  const commonClass = [
    "group inline-flex items-center gap-2",
    "rounded-2xl px-3 py-2",
    "glass border border-white/10 bg-white/5",
    "hover:bg-white/10 hover:border-white/15",
    fx(""),
  ].join(" ");

  const iconOnlyClass = [
    "group inline-flex items-center justify-center",
    "rounded-2xl h-10 w-10",
    "glass border border-white/10 bg-white/5",
    "hover:bg-white/10 hover:border-white/15",
    fx(""),
  ].join(" ");

  if (variant === "icon") {
    return (
      <motion.a
        href={disabled ? undefined : url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open @${cleanHandle} on X`}
        title={`@${cleanHandle} on X`}
        whileHover={reduce || disabled ? undefined : { y: -1 }}
        whileTap={reduce || disabled ? undefined : { scale: 0.985 }}
        className={iconOnlyClass}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-2 top-[1px] h-px opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent)",
          }}
        />

        <span
          className={[
            "relative inline-flex h-8 w-8 items-center justify-center",
            "rounded-xl bg-white/10 border border-white/10",
            "overflow-hidden isolate",
            "transition-colors duration-150 group-hover:bg-white/12 group-hover:border-white/15",
          ].join(" ")}
        >
          <XLogo className="relative h-4 w-4 text-white/90 group-hover:text-white transition-colors duration-150" />
        </span>
      </motion.a>
    );
  }

  return (
    <motion.a
      href={disabled ? undefined : url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open @${cleanHandle} on X`}
      title={`@${cleanHandle} on X`}
      whileHover={reduce || disabled ? undefined : { y: -1 }}
      whileTap={reduce || disabled ? undefined : { scale: 0.985 }}
      className={commonClass}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 top-[1px] h-px opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent)",
        }}
      />

      {/* X logo (LEFT ONLY) */}
      <span
        className={[
          "relative inline-flex h-8 w-8 items-center justify-center",
          "rounded-xl bg-white/10 border border-white/10",
          "overflow-hidden isolate",
          "transition-colors duration-150 group-hover:bg-white/12 group-hover:border-white/15",
        ].join(" ")}
      >
        <XLogo className="relative h-4 w-4 text-white/90 group-hover:text-white transition-colors duration-150" />
      </span>

      {/* Handle */}
      <span className="relative text-[13px] font-medium text-dim group-hover:text-white transition-colors duration-150">
        @{cleanHandle}
      </span>
    </motion.a>
  );
}
