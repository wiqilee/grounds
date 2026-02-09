// app/landing/page.tsx
"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { AboutModal } from "@/components/AboutModal";

interface Sat { name: string; icon: string; desc: string; orbit: number; startAngle: number; c1: string; c2: string; glow: string; size: number; }
const SATS: Sat[] = [
  { name: "Gemini Critic", icon: "\u{1F50D}", desc: "Structural hard-edge critique", orbit: 1, startAngle: 0, c1: "#22d3ee", c2: "#06b6d4", glow: "rgba(34,211,238,0.5)", size: 42 },
  { name: "Deep Reasoner", icon: "\u{1F9E0}", desc: "Adversarial stress testing", orbit: 1, startAngle: 180, c1: "#10b981", c2: "#059669", glow: "rgba(16,185,129,0.5)", size: 40 },
  { name: "Compare AI", icon: "\u2696\uFE0F", desc: "Multi-provider consensus", orbit: 2, startAngle: 60, c1: "#a78bfa", c2: "#8b5cf6", glow: "rgba(167,139,250,0.5)", size: 38 },
  { name: "Sentiment", icon: "\u{1F4AC}", desc: "Aspect-based tone analysis", orbit: 2, startAngle: 240, c1: "#f59e0b", c2: "#d97706", glow: "rgba(245,158,11,0.5)", size: 36 },
  { name: "Monte Carlo", icon: "\u{1F3B2}", desc: "Probability simulation (1k runs)", orbit: 3, startAngle: 30, c1: "#ec4899", c2: "#db2777", glow: "rgba(236,72,153,0.5)", size: 34 },
  { name: "PDF Reports", icon: "\u{1F4C4}", desc: "Decision-grade export", orbit: 3, startAngle: 140, c1: "#6366f1", c2: "#4f46e5", glow: "rgba(99,102,241,0.5)", size: 32 },
  { name: "Templates", icon: "\u{1F4CB}", desc: "11 industry frameworks", orbit: 3, startAngle: 260, c1: "#14b8a6", c2: "#0d9488", glow: "rgba(20,184,166,0.5)", size: 32 },
];
const R: Record<number, number> = { 1: 120, 2: 180, 3: 240 };
const PERIOD: Record<number, number> = { 1: 26, 2: 38, 3: 52 };
const RCOL: Record<number, string> = { 1: "rgba(34,211,238,0.25)", 2: "rgba(167,139,250,0.2)", 3: "rgba(16,185,129,0.15)" };

/* Satellite with AUTO-SPOTLIGHT at top of orbit */
function OrbitSat({ s, onH, onL, onTop, isSpotlight }: { s: Sat; onH: (e: React.MouseEvent, s: Sat) => void; onL: () => void; onTop: (name: string, isTop: boolean) => void; isSpotlight: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const a = useRef(s.startAngle);
  const raf = useRef(0);
  const wasTop = useRef(false);

  useEffect(() => {
    const r = R[s.orbit], dpf = 360 / (PERIOD[s.orbit] * 60);
    const tick = () => {
      a.current = (a.current + dpf) % 360;
      const rad = (a.current * Math.PI) / 180;
      if (ref.current) ref.current.style.transform = `translate(${Math.cos(rad) * r}px, ${Math.sin(rad) * r}px) translate(-50%, -50%)`;
      // Auto-spotlight: detect when satellite is near top (270deg = top of circle)
      const normAngle = ((a.current % 360) + 360) % 360;
      const isNearTop = normAngle > 250 && normAngle < 290;
      if (isNearTop && !wasTop.current) { wasTop.current = true; onTop(s.name, true); }
      else if (!isNearTop && wasTop.current) { wasTop.current = false; onTop(s.name, false); }
      raf.current = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf.current);
  }, [s, onTop]);

  return (
    <div ref={ref} className="absolute top-1/2 left-1/2 z-[15] cursor-pointer"
      style={{ willChange: "transform" }}
      onMouseEnter={e => onH(e, s)} onMouseMove={e => onH(e, s)} onMouseLeave={onL}>
      <div className="absolute rounded-full blur-[12px] transition-all duration-500"
        style={{ inset: isSpotlight ? -s.size * 0.6 : -s.size * 0.3, 
          background: `linear-gradient(135deg, ${s.c1}, ${s.c2})`,
          opacity: isSpotlight ? 0.8 : 0.5 }} />
      <div className="relative rounded-full flex items-center justify-center transition-all duration-500 hover:scale-[1.4] hover:brightness-125"
        style={{ width: s.size, height: s.size,
          transform: isSpotlight ? "scale(1.5)" : "scale(1)",
          background: `linear-gradient(145deg, ${s.c1}, ${s.c2})`,
          boxShadow: isSpotlight 
            ? `0 0 ${s.size * 1.5}px ${s.glow}, 0 0 ${s.size * 3}px ${s.glow}, inset 0 -4px 8px rgba(0,0,0,0.35), inset 0 3px 6px rgba(255,255,255,0.2)`
            : `0 0 ${s.size * 0.8}px ${s.glow}, inset 0 -4px 8px rgba(0,0,0,0.35), inset 0 3px 6px rgba(255,255,255,0.2)`,
          fontSize: s.size * 0.45 }}>{s.icon}</div>
    </div>
  );
}

/* Canvas Planet with proper connected ring */
function CanvasPlanet({ top, left, right, bottom, radius = 30, hue = 30, sat = 50, lit = 50, hasRing = true, hasMoon = true }: {
  top?: string; left?: string; right?: string; bottom?: string; radius?: number; hue?: number; sat?: number; lit?: number; hasRing?: boolean; hasMoon?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const moonAngle = useRef(Math.random() * Math.PI * 2);
  const pad = 30;
  const extent = Math.max(hasRing ? radius * 1.7 : radius, hasMoon ? radius * 2.5 : radius);
  const totalSize = Math.ceil(extent * 2 + pad * 2);
  const ctr = totalSize / 2;

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let t = 0; const fp = Math.random() * Math.PI * 2;
    const draw = () => {
      t++; ctx.clearRect(0, 0, totalSize, totalSize);
      const cx = ctr, cy = ctr + Math.sin(t * 0.008 + fp) * 3, r = radius;
      // Atmosphere
      const ag = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 2);
      ag.addColorStop(0, `hsla(${hue+20},60%,55%,0.08)`);
      ag.addColorStop(0.5, `hsla(${hue+20},50%,45%,0.03)`);
      ag.addColorStop(1, "hsla(0,0%,0%,0)");
      ctx.beginPath(); ctx.arc(cx, cy, r * 2, 0, Math.PI * 2); ctx.fillStyle = ag; ctx.fill();
      // Ring back half (0 to PI - no gap)
      if (hasRing) {
        ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.08, r * 1.6, r * 0.35, 0, 0, Math.PI);
        ctx.strokeStyle = `hsla(${hue+20},${Math.max(sat-15,10)}%,${Math.min(lit+15,70)}%,0.2)`;
        ctx.lineWidth = r * 0.12; ctx.stroke();
      }
      // Shadow
      const sg = ctx.createRadialGradient(cx + r * 0.05, cy + r * 0.05, r * 0.9, cx + r * 0.05, cy + r * 0.05, r * 1.3);
      sg.addColorStop(0, "rgba(0,0,0,0.25)"); sg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx + r * 0.05, cy + r * 0.05, r * 1.3, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill();
      // Sphere
      const bg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx + r * 0.1, cy + r * 0.1, r);
      bg.addColorStop(0, `hsla(${hue},${Math.min(sat+5,60)}%,${Math.min(lit+18,75)}%,1)`);
      bg.addColorStop(0.3, `hsla(${hue},${sat}%,${lit+8}%,1)`);
      bg.addColorStop(0.6, `hsla(${hue},${sat}%,${lit}%,1)`);
      bg.addColorStop(0.85, `hsla(${hue},${Math.max(sat-8,15)}%,${Math.max(lit-10,15)}%,1)`);
      bg.addColorStop(1, `hsla(${hue},${Math.max(sat-12,10)}%,${Math.max(lit-20,10)}%,1)`);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
      // Surface bands
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      for (let i = 0; i < 6; i++) {
        const by = cy - r + (i / 6) * r * 2;
        ctx.beginPath(); ctx.ellipse(cx, by, r, r * 0.06, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue + (i % 2 === 0 ? 10 : -10)},${sat-10}%,${lit + (i % 2 === 0 ? 8 : -5)}%,0.06)`; ctx.fill();
      }
      ctx.restore();
      // Specular
      const sp = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx - r * 0.15, cy - r * 0.15, r * 0.6);
      sp.addColorStop(0, "rgba(255,255,255,0.18)"); sp.addColorStop(0.4, "rgba(255,255,255,0.05)"); sp.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = sp; ctx.fill();
      // Rim light
      const rm = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r);
      rm.addColorStop(0, `hsla(${hue},${sat}%,${lit}%,0)`);
      rm.addColorStop(0.7, `hsla(${hue+20},60%,70%,0.12)`);
      rm.addColorStop(1, `hsla(${hue+20},70%,80%,0.22)`);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = rm; ctx.fill();
      // Terminator
      const tm = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      tm.addColorStop(0, "rgba(0,0,0,0)"); tm.addColorStop(0.55, "rgba(0,0,0,0)");
      tm.addColorStop(0.75, "rgba(0,0,0,0.15)"); tm.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = tm; ctx.fill();
      // Moon with orbit - calculate position first
      let moonInFront = false;
      let mx = 0, my = 0, mr = 0, md = 0;
      if (hasMoon) {
        moonAngle.current += 0.008; 
        md = r * 2.4;
        mx = cx + Math.cos(moonAngle.current) * md;
        my = cy + Math.sin(moonAngle.current) * md * 0.4;
        mr = Math.max(r * 0.12, 2.5);
        moonInFront = Math.sin(moonAngle.current) < 0; // bulan di depan kalau y-nya lebih kecil
        
        // Orbit - lebih tipis dan transparent
        ctx.beginPath(); ctx.ellipse(cx, cy, md, md * 0.4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(180,200,230,0.15)"; ctx.lineWidth = 0.8; ctx.stroke();
        
        // Draw moon only if it's BEHIND the ring
        if (!moonInFront) {
          const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3);
          mg.addColorStop(0, "rgba(200,220,255,0.2)"); mg.addColorStop(1, "rgba(200,220,255,0)");
          ctx.beginPath(); ctx.arc(mx, my, mr * 3, 0, Math.PI * 2); ctx.fillStyle = mg; ctx.fill();
          const mb = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 0, mx, my, mr);
          mb.addColorStop(0, "rgba(220,230,245,0.9)"); mb.addColorStop(1, "rgba(140,160,190,0.6)");
          ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fillStyle = mb; ctx.fill();
        }
      }
      // Ring front half (PI to 2*PI - no gap)
      if (hasRing) {
        ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.08, r * 1.6, r * 0.35, 0, Math.PI, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue+20},${Math.max(sat-15,10)}%,${Math.min(lit+15,70)}%,0.25)`;
        ctx.lineWidth = r * 0.12; ctx.stroke();
      }
      // Draw moon in FRONT of ring if needed
      if (hasMoon && moonInFront) {
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3);
        mg.addColorStop(0, "rgba(200,220,255,0.2)"); mg.addColorStop(1, "rgba(200,220,255,0)");
        ctx.beginPath(); ctx.arc(mx, my, mr * 3, 0, Math.PI * 2); ctx.fillStyle = mg; ctx.fill();
        const mb = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 0, mx, my, mr);
        mb.addColorStop(0, "rgba(220,230,245,0.9)"); mb.addColorStop(1, "rgba(140,160,190,0.6)");
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fillStyle = mb; ctx.fill();
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [radius, hue, sat, lit, hasRing, hasMoon, ctr, totalSize]);

  const st: React.CSSProperties = { position: "absolute", zIndex: 1, pointerEvents: "none" };
  if (top) st.top = top; if (left) st.left = left; if (right) st.right = right; if (bottom) st.bottom = bottom;
  return <canvas ref={canvasRef} width={totalSize} height={totalSize} style={{ ...st, width: totalSize, height: totalSize }} />;
}

/* Canvas UFO - beam DOWN, no astronaut - LARGER */
function CanvasUfo({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null); const frameRef = useRef(0);
  const lights = useRef(Array.from({ length: 8 }, (_, i) => ({ angle: (i / 8) * Math.PI * 2, on: Math.random() > 0.3 })));
  const W = 400, H = 420;
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let t = 0, hover = 0, bp = 0;
    const draw = () => {
      t++; hover += 0.02; bp += 0.03;
      ctx.clearRect(0, 0, W, H);
      const y = 70 + Math.sin(hover) * 5;
      const gl = 0.5 + Math.sin(t * 0.05) * 0.2;
      const bw = 1 + Math.sin(bp) * 0.15;
      if (Math.random() < 0.02) {
        const idx = Math.floor(Math.random() * lights.current.length);
        lights.current[idx].on = !lights.current[idx].on;
      }
      ctx.save(); ctx.translate(W / 2, y);
      // BEAM DOWN - extends to bottom of canvas
      const bH = H - y + 20;
      const ob = ctx.createLinearGradient(0, 24, 0, bH);
      ob.addColorStop(0, "rgba(255,220,100,0.03)");
      ob.addColorStop(0.3, `rgba(255,210,80,${0.08 * gl})`);
      ob.addColorStop(0.7, `rgba(255,200,60,${0.1 * gl})`);
      ob.addColorStop(1, "rgba(255,190,50,0.04)");
      ctx.beginPath(); ctx.moveTo(-52 * bw, 24); ctx.lineTo(52 * bw, 24);
      ctx.lineTo(90 * bw, bH); ctx.lineTo(-90 * bw, bH);
      ctx.closePath(); ctx.fillStyle = ob; ctx.fill();
      const ib = ctx.createLinearGradient(0, 24, 0, bH);
      ib.addColorStop(0, "rgba(255,235,150,0.08)");
      ib.addColorStop(0.4, `rgba(255,225,120,${0.14 * gl})`);
      ib.addColorStop(1, "rgba(255,215,100,0.05)");
      ctx.beginPath(); ctx.moveTo(-32 * bw, 24); ctx.lineTo(32 * bw, 24);
      ctx.lineTo(55 * bw, bH); ctx.lineTo(-55 * bw, bH);
      ctx.closePath(); ctx.fillStyle = ib; ctx.fill();
      // Beam particles
      for (let i = 0; i < 7; i++) {
        const py = ((t * 2 + i * 60) % bH) + 30;
        const px = Math.sin(t * 0.03 + i) * 25 * (py / bH);
        ctx.beginPath(); ctx.arc(px, py, 1.8 + Math.sin(t * 0.1 + i), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,240,180,${(1 - py / bH) * 0.35})`; ctx.fill();
      }
      // UFO BODY - scaled up ~1.5x
      const sc = 1.5;
      const ag2 = ctx.createRadialGradient(0, 0, 14 * sc, 0, 0, 65 * sc);
      ag2.addColorStop(0, `rgba(255,220,100,${0.12 * gl})`);
      ag2.addColorStop(0.5, "rgba(255,200,80,0.06)");
      ag2.addColorStop(1, "rgba(255,180,60,0)");
      ctx.beginPath(); ctx.ellipse(0, 4 * sc, 55 * sc, 24 * sc, 0, 0, Math.PI * 2); ctx.fillStyle = ag2; ctx.fill();
      const btm = ctx.createLinearGradient(0, 8 * sc, 0, 20 * sc);
      btm.addColorStop(0, "rgba(40,45,60,1)"); btm.addColorStop(1, "rgba(25,30,40,1)");
      ctx.beginPath(); ctx.ellipse(0, 14 * sc, 40 * sc, 9 * sc, 0, 0, Math.PI * 2); ctx.fillStyle = btm; ctx.fill();
      const bd = ctx.createLinearGradient(0, -12 * sc, 0, 12 * sc);
      bd.addColorStop(0, "rgba(90,100,120,1)"); bd.addColorStop(0.3, "rgba(70,80,100,1)");
      bd.addColorStop(0.7, "rgba(50,60,80,1)"); bd.addColorStop(1, "rgba(35,45,65,1)");
      ctx.beginPath(); ctx.ellipse(0, 4 * sc, 44 * sc, 13 * sc, 0, 0, Math.PI * 2); ctx.fillStyle = bd; ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -2 * sc, 42 * sc, 10 * sc, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = "rgba(150,170,200,0.5)"; ctx.lineWidth = 1; ctx.stroke();
      // Dome
      const dm = ctx.createRadialGradient(-5 * sc, -16 * sc, 0, 0, -10 * sc, 20 * sc);
      dm.addColorStop(0, "rgba(180,220,255,0.8)"); dm.addColorStop(0.3, "rgba(100,150,200,0.6)");
      dm.addColorStop(0.7, "rgba(60,100,150,0.4)"); dm.addColorStop(1, "rgba(40,70,120,0.3)");
      ctx.beginPath(); ctx.ellipse(0, -6 * sc, 20 * sc, 16 * sc, 0, Math.PI, Math.PI * 2); ctx.fillStyle = dm; ctx.fill();
      ctx.beginPath(); ctx.ellipse(-5 * sc, -13 * sc, 7 * sc, 4.5 * sc, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fill();
      // Lights
      lights.current.forEach(l => {
        const lx = Math.cos(l.angle) * 36 * sc, ly = Math.sin(l.angle) * 8 * sc + 7 * sc;
        if (l.on) {
          const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 6 * sc);
          lg.addColorStop(0, "rgba(255,230,150,0.8)"); lg.addColorStop(0.5, "rgba(255,200,100,0.3)"); lg.addColorStop(1, "rgba(255,180,80,0)");
          ctx.beginPath(); ctx.arc(lx, ly, 6 * sc, 0, Math.PI * 2); ctx.fillStyle = lg; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(lx, ly, 3 * sc, 0, Math.PI * 2);
        ctx.fillStyle = l.on ? "rgba(255,220,130,1)" : "rgba(80,90,110,1)"; ctx.fill();
      });
      ctx.restore();
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);
  return <canvas ref={canvasRef} width={W} height={H} className={className} style={{ width: W, height: H }} />;
}

export default function LandingPage() {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [tip, setTip] = useState({ on: false, x: 0, y: 0, t: "", d: "" });
  const [cnt, setCnt] = useState(7);
  const [aboutOpen, setAboutOpen] = useState(false);
  // Auto-spotlight: track which satellite is at top
  const [spotlight, setSpotlight] = useState<string | null>(null);

  useEffect(() => setOk(true), []);
  useEffect(() => { const i = setInterval(() => setCnt(c => Math.min(Math.max(c + (Math.random() > .5 ? 1 : -1), 5), 7)), 3000); return () => clearInterval(i); }, []);

  const hov = useCallback((e: React.MouseEvent, s: Sat) => setTip({ on: true, x: e.clientX, y: e.clientY, t: s.name, d: s.desc }), []);
  const leave = useCallback(() => setTip(t => ({ ...t, on: false })), []);
  const go = useCallback(() => router.push("/"), [router]);
  const onSatTop = useCallback((name: string, isTop: boolean) => {
    if (isTop) setSpotlight(name);
    else setSpotlight(prev => prev === name ? null : prev);
  }, []);

  const spotSat = spotlight ? SATS.find(s => s.name === spotlight) : null;

  if (!ok) return null;

  return (
    <>
      <style jsx global>{`
        @keyframes twinkle{0%,100%{opacity:.15}50%{opacity:1}}
        @keyframes twinkleB{0%,100%{opacity:.3}50%{opacity:1}}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.6)}50%{box-shadow:0 0 0 8px rgba(16,185,129,0)}}
        @keyframes colorFlow{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes nebDrift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(20px,-10px) scale(1.04)}66%{transform:translate(-15px,8px) scale(.97)}}
        @keyframes scanLine{0%{top:-2px}100%{top:100%}}
        @keyframes float{0%,100%{transform:translateY(0px) rotate(0deg)}33%{transform:translateY(-4px) rotate(-2deg)}66%{transform:translateY(2px) rotate(2deg)}}
      `}</style>

      <div className="fixed inset-0 z-[9999] w-screen h-screen text-white"
        style={{ background: "linear-gradient(180deg,#060a12 0%,#0a0f1a 30%,#0d1117 60%,#080c14 100%)" }}>

        {/* Nebula */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {[{ t: "-10%", l: "10%", w: 700, c: "#6366f1", d: 0 }, { t: "20%", l: "65%", w: 600, c: "#06b6d4", d: 5 }, { t: "70%", l: "25%", w: 500, c: "#8b5cf6", d: 10 }].map((n, i) => (
            <div key={i} className="absolute rounded-full" style={{ top: n.t, left: n.l, width: n.w, height: n.w, opacity: 0.04,
              background: `radial-gradient(circle,${n.c},transparent 70%)`, animation: `nebDrift ${18 + i * 3}s ease-in-out infinite ${n.d}s` }} />
          ))}
        </div>

        {/* Stars */}
        <div className="absolute inset-0 z-0">
          {Array.from({ length: 280 }, (_, i) => {
            const sz = Math.random() * 2.5 + 0.4; const bright = sz > 2;
            return <div key={i} className="absolute rounded-full" style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: sz, height: sz,
              background: bright ? "#fff" : `rgba(255,255,255,${.35 + Math.random() * .4})`,
              boxShadow: bright ? `0 0 ${sz * 3}px rgba(255,255,255,.4)` : "none",
              animation: `${bright ? "twinkleB" : "twinkle"} ${2 + Math.random() * 4}s infinite ${Math.random() * 5}s`,
            }} />;
          })}
        </div>

        {/* Canvas Planets */}
        <CanvasPlanet top="1%" left="2%" radius={28} hue={30} sat={45} lit={55} hasRing hasMoon />
        <CanvasPlanet top="45%" left="4%" radius={26} hue={5} sat={50} lit={40} hasRing={false} hasMoon />
        <CanvasPlanet bottom="25%" right="2%" radius={22} hue={200} sat={45} lit={50} hasRing hasMoon />

        {/* Orbit rings + satellites */}
        <div className="absolute inset-0 z-[14]" style={{ pointerEvents: "none" }}>
          <div className="absolute left-1/2" style={{ top: "57%" }}>
            {/* Orbit rings with dots */}
            {[1, 2, 3].map(ring => (
              <div key={ring}>
                {/* Main ring line */}
                <div className="absolute rounded-full" style={{
                  width: R[ring] * 2, height: R[ring] * 2, top: -R[ring], left: -R[ring],
                  border: `1.5px solid ${RCOL[ring]}`,
                  boxShadow: `0 0 8px ${RCOL[ring]}, inset 0 0 8px ${RCOL[ring]}`,
                }} />
                {/* Static dots along orbit path */}
                {Array.from({ length: ring === 1 ? 24 : ring === 2 ? 32 : 40 }, (_, i) => {
                  const total = ring === 1 ? 24 : ring === 2 ? 32 : 40;
                  const angle = (i / total) * Math.PI * 2;
                  const r = R[ring];
                  const x = Math.cos(angle) * r;
                  const y = Math.sin(angle) * r;
                  const colors: Record<number, string> = { 1: "34,211,238", 2: "167,139,250", 3: "16,185,129" };
                  // Ring 1 (tengah): kurangi terang | Ring 2&3: perjelas
                  const baseOpacity = ring === 1 ? 0.15 : 0.4;
                  const highlightOpacity = ring === 1 ? 0.15 : 0.4;
                  const glowSize = ring === 1 ? 2 : 6;
                  const glowOpacity = ring === 1 ? 0.3 : 0.7;
                  return (
                    <div key={i} className="absolute rounded-full" style={{
                      width: 3, height: 3, left: x - 1.5, top: y - 1.5,
                      background: `rgba(${colors[ring]},${baseOpacity + (i % 3 === 0 ? highlightOpacity : 0)})`,
                      boxShadow: i % 3 === 0 ? `0 0 ${glowSize}px rgba(${colors[ring]},${glowOpacity})` : "none",
                    }} />
                  );
                })}
              </div>
            ))}
            <div style={{ pointerEvents: "auto" }}>
              {SATS.map((s, i) => <OrbitSat key={i} s={s} onH={hov} onL={leave} onTop={onSatTop} isSpotlight={spotlight === s.name} />)}
            </div>
          </div>
        </div>

        {/* AUTO-SPOTLIGHT LABEL - shows when satellite reaches top of orbit */}
        <AnimatePresence>
          {spotSat && (
            <motion.div
              key={spotSat.name}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="fixed z-[10002] pointer-events-none"
              style={{ top: "calc(57% - 200px)", left: "calc(50% + 260px)" }}>
              <div className="px-5 py-3 rounded-2xl border backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,.6)]"
                style={{ background: "rgba(6,10,18,.92)", borderColor: spotSat.c1 + "40" }}>
                <div className="text-[15px] font-bold" style={{ color: spotSat.c1 }}>{spotSat.name}</div>
                <div className="text-[12px] text-white/50 mt-0.5">{spotSat.desc}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HERO - text area */}
        <div className="absolute inset-0 z-[15] flex flex-col items-center pointer-events-none" style={{ paddingTop: "8vh" }}>
          <motion.h1 initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .9, delay: .2, ease: [.22, 1, .36, 1] }}
            className="text-center font-semibold leading-[1.08] tracking-[-.02em] drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]"
            style={{ fontSize: "clamp(2rem,4.2vw,3.2rem)" }}>
            <span className="text-white/90">Make decisions on solid </span>
            <span className="inline-block relative">
              <span className="font-bold" style={{
                background: "linear-gradient(110deg,#10b981 0%,#22d3ee 25%,#ec4899 50%,#22d3ee 75%,#10b981 100%)",
                backgroundSize: "300% 300%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text", animation: "colorFlow 5s ease-in-out infinite",
              }}>Grounds</span>
              <span className="absolute" style={{ 
                top: "-0.8em", 
                right: "-2.2em",
                animation: "float 3s ease-in-out infinite"
              }}>
                <svg width="70" height="70" viewBox="0 0 70 70" style={{
                  filter: "drop-shadow(0 6px 20px rgba(16,185,129,0.5)) drop-shadow(0 0 12px rgba(34,211,238,0.3))"
                }}>
                  {/* Left solar panel - with 3D perspective */}
                  <g style={{ transform: "perspective(600px) rotateY(-25deg)", transformOrigin: "20px 35px" }}>
                    <rect x="3" y="22" width="17" height="26" rx="1.5" fill="url(#solarBlue)" stroke="#1e40af" strokeWidth="0.8" />
                    <line x1="11.5" y1="22" x2="11.5" y2="48" stroke="#1e3a8a" strokeWidth="0.5" opacity="0.4" />
                    <rect x="4" y="24" width="7" height="10" fill="#3b82f6" opacity="0.3" rx="0.5" />
                    <rect x="4" y="36" width="7" height="10" fill="#2563eb" opacity="0.3" rx="0.5" />
                    <rect x="12.5" y="24" width="7" height="10" fill="#3b82f6" opacity="0.3" rx="0.5" />
                    <rect x="12.5" y="36" width="7" height="10" fill="#2563eb" opacity="0.3" rx="0.5" />
                  </g>
                  
                  {/* Right solar panel - with 3D perspective */}
                  <g style={{ transform: "perspective(600px) rotateY(25deg)", transformOrigin: "50px 35px" }}>
                    <rect x="50" y="22" width="17" height="26" rx="1.5" fill="url(#solarBlue)" stroke="#1e40af" strokeWidth="0.8" />
                    <line x1="58.5" y1="22" x2="58.5" y2="48" stroke="#1e3a8a" strokeWidth="0.5" opacity="0.4" />
                    <rect x="51" y="24" width="7" height="10" fill="#3b82f6" opacity="0.3" rx="0.5" />
                    <rect x="51" y="36" width="7" height="10" fill="#2563eb" opacity="0.3" rx="0.5" />
                    <rect x="59.5" y="24" width="7" height="10" fill="#3b82f6" opacity="0.3" rx="0.5" />
                    <rect x="59.5" y="36" width="7" height="10" fill="#2563eb" opacity="0.3" rx="0.5" />
                  </g>
                  
                  {/* Main satellite body - cylindrical */}
                  <ellipse cx="35" cy="28" rx="11" ry="4" fill="#64748b" opacity="0.6" />
                  <rect x="24" y="28" width="22" height="18" fill="url(#bodyMetal)" rx="2" />
                  <ellipse cx="35" cy="46" rx="11" ry="4" fill="url(#bodyBottom)" />
                  
                  {/* Body details and panels */}
                  <rect x="26" y="30" width="18" height="6" fill="#475569" opacity="0.4" rx="0.5" />
                  <rect x="26" y="38" width="18" height="6" fill="#334155" opacity="0.4" rx="0.5" />
                  
                  {/* Windows/sensors */}
                  <circle cx="30" cy="33" r="1.8" fill="#22d3ee" opacity="0.8" style={{ filter: "drop-shadow(0 0 3px #22d3ee)" }} />
                  <circle cx="35" cy="33" r="1.8" fill="#10b981" opacity="0.8" style={{ filter: "drop-shadow(0 0 3px #10b981)" }} />
                  <circle cx="40" cy="33" r="1.8" fill="#22d3ee" opacity="0.8" style={{ filter: "drop-shadow(0 0 3px #22d3ee)" }} />
                  
                  <circle cx="32" cy="41" r="1.5" fill="#6366f1" opacity="0.6" />
                  <circle cx="38" cy="41" r="1.5" fill="#8b5cf6" opacity="0.6" />
                  
                  {/* Top antenna */}
                  <line x1="35" y1="28" x2="35" y2="18" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="35" cy="18" r="2.5" fill="#22d3ee" style={{ filter: "drop-shadow(0 0 6px #22d3ee)" }} />
                  <circle cx="35" cy="18" r="1.2" fill="#ffffff" opacity="0.8" />
                  
                  {/* Side antennas */}
                  <line x1="24" y1="35" x2="18" y2="35" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="18" cy="35" r="1.8" fill="#10b981" opacity="0.8" style={{ filter: "drop-shadow(0 0 4px #10b981)" }} />
                  
                  <line x1="46" y1="35" x2="52" y2="35" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="52" cy="35" r="1.8" fill="#10b981" opacity="0.8" style={{ filter: "drop-shadow(0 0 4px #10b981)" }} />
                  
                  {/* Highlight/shine effect */}
                  <ellipse cx="31" cy="32" rx="3" ry="5" fill="white" opacity="0.15" transform="rotate(-20 31 32)" />
                  
                  {/* Gradients */}
                  <defs>
                    <linearGradient id="solarBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e40af" />
                      <stop offset="40%" stopColor="#2563eb" />
                      <stop offset="70%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                    <linearGradient id="bodyMetal" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f1f5f9" />
                      <stop offset="30%" stopColor="#e2e8f0" />
                      <stop offset="70%" stopColor="#cbd5e1" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>
                    <linearGradient id="bodyBottom" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#94a3b8" />
                      <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </span>
            <span className="text-white/90"> .</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .5 }}
            className="text-white/60 text-base mt-3 font-light text-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            Turn messy inputs into a decision-grade brief in under a minute.
          </motion.p>
        </div>

        {/* UFO + BUTTON - UFO centered in orbit, beam extends down to button */}
        <div className="absolute left-1/2 -translate-x-1/2 z-[16] flex flex-col items-center" style={{ top: "calc(57% - 80px)" }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .6 }}
            className="relative">
            <CanvasUfo className="pointer-events-none" />
            {/* Button inside beam at bottom */}
            <div className="absolute bottom-[20px] left-1/2 -translate-x-1/2 pointer-events-auto z-[17]">
              <motion.button onClick={go} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: .97 }}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-[15px] transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,.25)] hover:shadow-[0_0_50px_rgba(16,185,129,.45)] whitespace-nowrap">
                Get Started
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Services Active badge - bottom left */}
        <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .5 }}
          className="fixed bottom-20 left-5 z-[10000]">
          <div className="relative px-4 py-3.5 rounded-lg border border-emerald-500/15 backdrop-blur-xl overflow-hidden"
            style={{ background: "rgba(6,10,18,.9)" }}>
            <div className="absolute left-0 w-full h-[1px] bg-emerald-400/15 pointer-events-none"
              style={{ animation: "scanLine 3s linear infinite" }} />
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: "pulseGlow 2s infinite" }} />
              <span className="text-[11px] font-mono font-semibold text-emerald-400 tracking-[1.5px] uppercase">{cnt} Services Active</span>
            </div>
            {[{ bg: "#22d3ee", l: "Gemini Critic" }, { bg: "#a78bfa", l: "Compare AI" },
              { bg: "#10b981", l: "Deep Reasoner" }, { bg: "#f59e0b", l: "Sentiment" },
              { bg: "#ec4899", l: "Monte Carlo" }].map((x, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: .7 + i * .07 }} className="flex items-center gap-2 mb-1 last:mb-0">
                <div className="w-2 h-2 rounded-full" style={{ background: x.bg, boxShadow: `0 0 6px ${x.bg}55` }} />
                <span className="text-[11px] font-mono text-white/50">{x.l}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* About button - top right */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .4 }}
          className="fixed top-5 right-5 z-[10000]">
          <motion.button onClick={() => setAboutOpen(true)} whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[.08] backdrop-blur-xl text-white/70 hover:text-white/90 transition-colors cursor-pointer"
            style={{ background: "rgba(6,10,18,.85)" }}>
            <HelpCircle className="w-4 h-4" />
            <span className="text-[13px] font-medium">About</span>
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="fixed bottom-5 right-5 z-[10000] flex items-center gap-3 text-[12px]">
          <span className="text-white/60 font-light">Google Gemini 3 Hackathon 2026</span>
          <span className="text-white/30">|</span>
          <a href="https://github.com/wiqilee/grounds" target="_blank" rel="noopener noreferrer"
            className="text-white/60 hover:text-white/80 transition-colors font-light">GitHub</a>
        </motion.div>

        {/* Tooltip (mouse hover) */}
        <div className="fixed z-[10001] pointer-events-none transition-opacity duration-200"
          style={{ opacity: tip.on ? 1 : 0, left: tip.x + 16, top: tip.y + 16 }}>
          <div className="px-4 py-3 rounded-xl border border-white/10 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,.6)]"
            style={{ background: "rgba(6,10,18,.95)" }}>
            <div className="text-sm font-semibold text-white">{tip.t}</div>
            <div className="text-[11px] text-white/45 mt-0.5">{tip.d}</div>
          </div>
        </div>
      </div>

      {/* About Modal */}
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
