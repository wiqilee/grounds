"use client";

import React from "react";

export function Textarea({
  value,
  onChange,
  placeholder,
  className = "",
  rows = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={[
        "w-full rounded-2xl bg-white/5 border border-white/12 px-4 py-3 text-[13px] outline-none",
        "placeholder:text-white/40 focus:border-white/25 focus:bg-white/7 transition",
        className,
      ].join(" ")}
      data-ink
    />
  );
}
