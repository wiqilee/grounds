"use client";

import React from "react";

export function Input({
  value,
  onChange,
  placeholder,
  className = "",
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={[
        "w-full rounded-2xl bg-white/5 border border-white/12 px-4 py-2.5 text-[13px] outline-none",
        "placeholder:text-white/40 focus:border-white/25 focus:bg-white/7 transition",
        className,
      ].join(" ")}
      data-ink
    />
  );
}
