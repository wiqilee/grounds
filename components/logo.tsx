import React from "react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} aria-label="Grounds">
      <div className="relative h-9 w-9">
        <div className="absolute inset-0 rounded-2xl bg-white/10 border border-white/10 shadow-glow" />
        <div className="absolute inset-[3px] rounded-[14px] bg-gradient-to-br from-cyan-300/70 via-violet-400/55 to-rose-400/55 blur-[1px] animate-hue" />
        <div className="absolute inset-[6px] rounded-[12px] bg-[#0b0d18]/70 border border-white/10" />
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-semibold tracking-tight text-[13px]">G</span>
        </div>
      </div>
      <div className="leading-tight">
        <div className="text-[14px] font-semibold tracking-tight">Grounds</div>
        <div className="text-[11px] text-faint">decision-grade reports</div>
      </div>
    </div>
  );
}
