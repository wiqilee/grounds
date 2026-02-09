// components/ParticleBackground.tsx
"use client";

import React, { useEffect, useRef, useCallback } from "react";

/* ——— Types ——— */
interface Orb {
  x: number; y: number;
  size: number; baseSize: number;
  speedX: number; speedY: number;
  opacity: number; baseOpacity: number;
  hue: number; saturation: number; lightness: number;
  pulse: number; pulseSpeed: number;
  layer: number;
  glowSize: number;
}

interface Meteor {
  x: number; y: number;
  length: number; speed: number;
  angle: number; opacity: number;
  hue: number; life: number; maxLife: number;
  width: number; sparkles: { x: number; y: number; life: number; size: number }[];
}

interface GridNode {
  x: number; y: number;
  opacity: number; targetOpacity: number;
  pulse: number; size: number;
  connections: number[];
}

interface UFO {
  x: number; y: number;
  baseY: number;
  scale: number;
  opacity: number;
  hover: number;
  beamPulse: number;
  glowIntensity: number;
  lights: { angle: number; on: boolean }[];
}

interface Planet {
  x: number; y: number;
  baseX: number; baseY: number;
  xRatio: number; yRatio: number;
  radius: number;
  hue: number; saturation: number; lightness: number;
  rotationSpeed: number;
  rotation: number;
  opacity: number;
  hasRing: boolean;
  ringTilt: number;
  ringColor: { h: number; s: number; l: number };
  hasMoons: boolean;
  moonCount: number;
  moonAngles: number[];
  moonSpeeds: number[];
  moonDistances: number[];
  moonSizes: number[];
  atmosphereHue: number;
  atmosphereOpacity: number;
  surfaceDetail: number;
  craterCount: number;
  craterPositions: { angle: number; dist: number; size: number }[];
  ringShimmers: { angle: number; dist: number; phase: number; size: number }[];
  layer: number;
  floatPhase: number;
  floatSpeed: number;
  floatAmplitudeX: number;
  floatAmplitudeY: number;
}

interface Nebula {
  x: number; y: number;
  xRatio: number; yRatio: number;
  radius: number;
  hue: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  intensity: number;
}

interface Star {
  x: number; y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface ParticleBackgroundProps {
  preset?: "default" | "minimal" | "cosmic" | "aurora";
  shootingStars?: boolean;
  showGrid?: boolean;
  showUFO?: boolean;
  showPlanets?: boolean;
  showNebula?: boolean;
  interactionStrength?: number;
  speed?: number;
  className?: string;
}

/* ——— Palette (Grounds brand colors) ——— */
const PALETTE = [
  { h: 187, s: 85, l: 53 }, // cyan
  { h: 270, s: 75, l: 60 }, // violet
  { h: 350, s: 85, l: 65 }, // rose
  { h: 160, s: 70, l: 45 }, // emerald
  { h: 38,  s: 90, l: 55 }, // amber/gold
  { h: 220, s: 80, l: 55 }, // blue
];

/* ——— Planet palette (realistic solar system inspired, soft 3D) ——— */
const PLANET_COLORS = [
  { h: 30,  s: 50, l: 55, atmo: 35  },   // Saturn — warm golden beige
  { h: 15,  s: 55, l: 42, atmo: 20  },   // Mars — dusty terracotta red
  { h: 205, s: 35, l: 55, atmo: 210 },   // Neptune — soft muted blue
];

/* ——— Config presets ——— */
const PRESETS = {
  default: { orbCount: 18, gridSpacing: 60, meteorRate: 0.003, meteorBurst: 1, planetCount: 3, starCount: 60 },
  minimal: { orbCount: 10, gridSpacing: 80, meteorRate: 0.002, meteorBurst: 1, planetCount: 2, starCount: 40 },
  cosmic:  { orbCount: 25, gridSpacing: 50, meteorRate: 0.006, meteorBurst: 2, planetCount: 3, starCount: 80 },
  aurora:  { orbCount: 15, gridSpacing: 70, meteorRate: 0.002, meteorBurst: 1, planetCount: 2, starCount: 50 },
};

export function ParticleBackground({
  preset = "default",
  shootingStars = true,
  showGrid = true,
  showUFO = true,
  showPlanets = true,
  showNebula = true,
  interactionStrength = 1,
  speed = 1,
  className = "",
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbsRef = useRef<Orb[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);
  const gridRef = useRef<GridNode[]>([]);
  const ufoRef = useRef<UFO | null>(null);
  const planetsRef = useRef<Planet[]>([]);
  const nebulaeRef = useRef<Nebula[]>([]);
  const starsRef = useRef<Star[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const animRef = useRef(0);
  const dimRef = useRef({ w: 0, h: 0 });
  const timeRef = useRef(0);

  const cfg = PRESETS[preset];

  /* ——— Factory: Stars ——— */
  const mkStars = useCallback((w: number, h: number): Star[] => {
    return Array.from({ length: cfg.starCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 1.5 + 0.3,
      brightness: Math.random() * 0.5 + 0.2,
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      twinklePhase: Math.random() * Math.PI * 2,
    }));
  }, [cfg.starCount]);

  /* ——— Factory: Orb ——— */
  const mkOrb = useCallback((w: number, h: number): Orb => {
    const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const layer = Math.floor(Math.random() * 3);
    const ls = [0.5, 0.75, 1][layer];
    const bs = (Math.random() * 55 + 25) * ls;
    return {
      x: Math.random() * w, y: Math.random() * h,
      size: bs, baseSize: bs,
      speedX: (Math.random() - 0.5) * 0.25 * speed * ls,
      speedY: (Math.random() - 0.5) * 0.25 * speed * ls,
      opacity: 0, baseOpacity: (Math.random() * 0.12 + 0.04) * ls,
      hue: c.h + (Math.random() - 0.5) * 20,
      saturation: c.s + (Math.random() - 0.5) * 10,
      lightness: c.l + (Math.random() - 0.5) * 10,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: (Math.random() * 0.012 + 0.004) * speed,
      layer, glowSize: bs * (2 + Math.random()),
    };
  }, [speed]);

  /* ——— Factory: Meteor ——— */
  const mkMeteor = useCallback((w: number, h: number): Meteor => {
    const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const fromTop = Math.random() > 0.3;
    return {
      x: fromTop ? Math.random() * w * 1.2 : w + 20,
      y: fromTop ? -20 : Math.random() * h * 0.4,
      length: Math.random() * 120 + 50,
      speed: (Math.random() * 6 + 4) * speed,
      angle: fromTop
        ? Math.PI / 4 + (Math.random() - 0.5) * 0.4
        : Math.PI * 0.7 + (Math.random() - 0.5) * 0.3,
      opacity: 0, hue: c.h,
      life: 0, maxLife: Math.random() * 80 + 50,
      width: Math.random() * 2 + 1,
      sparkles: [],
    };
  }, [speed]);

  /* ——— Factory: Grid ——— */
  const mkGrid = useCallback((w: number, h: number) => {
    const nodes: GridNode[] = [];
    const sp = cfg.gridSpacing;
    const cols = Math.ceil(w / sp) + 1;
    const rows = Math.ceil(h / sp) + 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const conns: number[] = [];
        if (c < cols - 1) conns.push(idx + 1);
        if (r < rows - 1) conns.push(idx + cols);
        if (c < cols - 1 && r < rows - 1 && Math.random() > 0.7)
          conns.push(idx + cols + 1);

        nodes.push({
          x: c * sp + (Math.random() - 0.5) * 6,
          y: r * sp + (Math.random() - 0.5) * 6,
          opacity: 0,
          targetOpacity: Math.random() * 0.06 + 0.015,
          pulse: Math.random() * Math.PI * 2,
          size: Math.random() * 1.2 + 0.6,
          connections: conns,
        });
      }
    }
    gridRef.current = nodes;
  }, [cfg.gridSpacing]);

  /* ——— Factory: UFO ——— */
  const mkUFO = useCallback((_w: number, h: number): UFO => {
    return {
      x: _w - 80,
      y: h * 0.22,
      baseY: h * 0.22,
      scale: 0.85,
      opacity: 0,
      hover: 0,
      beamPulse: 0,
      glowIntensity: 0,
      lights: Array.from({ length: 8 }, (_, i) => ({
        angle: (i / 8) * Math.PI * 2,
        on: Math.random() > 0.5,
      })),
    };
  }, []);

  /* ——— Factory: Planets (LEFT side, with orbits) ——— */
  const mkPlanets = useCallback((w: number, h: number): Planet[] => {
    const count = cfg.planetCount;
    const planets: Planet[] = [];

    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

    const planetConfigs = [
      // Saturn-like — upper far-left, with ring, small
      { xRatio: 0.05, yRatio: 0.18, radiusBase: 22, hasRing: true, layer: 2, surfHint: 0.75, colorIdx: 0 },
      // Mars-like — mid far-left, tiny
      { xRatio: 0.03, yRatio: 0.55, radiusBase: 12, hasRing: false, layer: 1, surfHint: 0.2, colorIdx: 1 },
      // Neptune-like — lower far-left, small blue
      { xRatio: 0.06, yRatio: 0.82, radiusBase: 9, hasRing: false, layer: 1, surfHint: 0.6, colorIdx: 2 },
    ];

    for (let i = 0; i < Math.min(count, planetConfigs.length); i++) {
      const pc = planetConfigs[i];
      const color = PLANET_COLORS[pc.colorIdx % PLANET_COLORS.length];
      const radius = pc.radiusBase + (Math.random() - 0.5) * 4;
      // Each planet gets 1 moon to show orbit path
      const moonCount = 1;

      const craterPositions = Array.from({ length: Math.floor(Math.random() * 3) + 2 }, () => ({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * 0.6,
        size: Math.random() * 0.12 + 0.04,
      }));

      const ringShimmers = Array.from({ length: 10 }, () => ({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random(), // 0..1 within ring width
        phase: Math.random() * Math.PI * 2,
        size: Math.random() * 1.2 + 0.8,
      }));

            const rawX = w * pc.xRatio + w * 0.08; // nudge right so planets are not cramped on the left edge
      const rawY = h * pc.yRatio;
      // Keep the entire planet system (ring + moon orbit) comfortably inside the viewport.
      const maxMoonDist = radius * 2.8;
      const ringOuter = pc.hasRing ? radius * 2.1 : radius;
      const extent = Math.max(ringOuter, maxMoonDist) + 14;
      const pad = Math.max(24, w * 0.04);
      const safeX = clamp(rawX, pad + extent, w - pad - extent);
      const safeY = clamp(rawY, pad + extent, h - pad - extent);

      planets.push({
        x: safeX, y: safeY,
        baseX: safeX, baseY: safeY,
        xRatio: pc.xRatio, yRatio: pc.yRatio,
        radius,
        hue: color.h, saturation: color.s, lightness: color.l,
        rotationSpeed: (Math.random() * 0.001 + 0.0005) * speed * (Math.random() > 0.5 ? 1 : -1),
        rotation: Math.random() * Math.PI * 2,
        opacity: 0,
        hasRing: pc.hasRing,
        ringTilt: 0.25 + Math.random() * 0.15,
        ringColor: { h: color.h + 20, s: Math.max(color.s - 15, 10), l: Math.min(color.l + 15, 80) },
        hasMoons: true,
        moonCount,
        moonAngles: [Math.random() * Math.PI * 2],
        moonSpeeds: [(Math.random() * 0.012 + 0.006) * speed],
        moonDistances: [radius * (2.2 + Math.random() * 0.6)],
        moonSizes: [1.5 + Math.random() * 1.5],
        atmosphereHue: color.atmo,
        atmosphereOpacity: 0.12 + Math.random() * 0.08,
        surfaceDetail: pc.surfHint,
        craterCount: craterPositions.length,
        craterPositions,
        ringShimmers,
        layer: pc.layer,
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: (Math.random() * 0.006 + 0.003) * speed,
        floatAmplitudeX: 2 + Math.random() * 3,
        floatAmplitudeY: 3 + Math.random() * 4,
      });
    }

    return planets;
  }, [cfg.planetCount, speed]);

  /* ——— Factory: Nebulae ——— */
  const mkNebulae = useCallback((w: number, h: number): Nebula[] => {
    return [
      {
        x: w * 0.10, y: h * 0.35, xRatio: 0.10, yRatio: 0.35,
        radius: 160 + Math.random() * 60,
        hue: 270, opacity: 0.02, rotation: 0,
        rotationSpeed: 0.0002, intensity: 0.4,
      },
    ];
  }, []);

  /* ——— Init ——— */
  const init = useCallback((w: number, h: number) => {
    orbsRef.current = Array.from({ length: cfg.orbCount }, () => mkOrb(w, h));
    starsRef.current = mkStars(w, h);
    if (showGrid) mkGrid(w, h);
    if (showUFO) ufoRef.current = mkUFO(w, h);
    if (showPlanets) planetsRef.current = mkPlanets(w, h);
    if (showNebula) nebulaeRef.current = mkNebulae(w, h);
  }, [cfg.orbCount, mkOrb, mkStars, showGrid, mkGrid, showUFO, mkUFO, showPlanets, mkPlanets, showNebula, mkNebulae]);

  /* ——— Main loop ——— */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cvs.getBoundingClientRect();
      cvs.width = r.width * dpr;
      cvs.height = r.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      dimRef.current = { w: r.width, h: r.height };
      init(r.width, r.height);
    };

    const onMove = (e: MouseEvent) => {
      if (!interactionStrength) return;
      const r = cvs.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top, active: true };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999, active: false }; };

    /* ──────────────────────────────────
       Draw: Background Stars
       ────────────────────────────────── */
    const drawStars = () => {
      const t = timeRef.current;
      starsRef.current.forEach(star => {
        const twinkle = Math.sin(t * star.twinkleSpeed + star.twinklePhase) * 0.3 + 0.7;
        const op = star.brightness * twinkle;

        // Tiny glow
        const grad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
        grad.addColorStop(0, `rgba(200, 220, 255, ${op})`);
        grad.addColorStop(0.5, `rgba(180, 200, 240, ${op * 0.3})`);
        grad.addColorStop(1, `rgba(150, 180, 220, 0)`);

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${op})`;
        ctx.fill();
      });
    };

    /* ──────────────────────────────────
       Draw: Nebula clouds
       ────────────────────────────────── */
    const drawNebulae = () => {
      const t = timeRef.current;
      nebulaeRef.current.forEach(n => {
        n.rotation += n.rotationSpeed;
        const pulse = Math.sin(t * 0.005) * 0.3 + 0.7;

        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(n.rotation);

        for (let i = 0; i < 3; i++) {
          const r = n.radius * (1 - i * 0.25);
          const op = n.opacity * pulse * (1 - i * 0.3) * n.intensity;
          const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
          grad.addColorStop(0, `hsla(${n.hue + i * 15}, 60%, 50%, ${op * 1.5})`);
          grad.addColorStop(0.3, `hsla(${n.hue + i * 10}, 50%, 40%, ${op})`);
          grad.addColorStop(0.7, `hsla(${n.hue - i * 5}, 40%, 30%, ${op * 0.4})`);
          grad.addColorStop(1, `hsla(${n.hue}, 30%, 20%, 0)`);

          ctx.beginPath();
          ctx.ellipse(i * 20, i * 10, r, r * 0.6, i * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.restore();
      });
    };

    /* ──────────────────────────────────
       Draw: Grid
       ────────────────────────────────── */
    const drawGrid = () => {
      const nodes = gridRef.current;
      if (!nodes.length) return;

      const { x: mx, y: my, active } = mouseRef.current;

      nodes.forEach((n) => {
        n.pulse += 0.015 * speed;
        const pf = Math.sin(n.pulse) * 0.5 + 0.5;

        if (active && interactionStrength) {
          const dx = n.x - mx;
          const dy = n.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            n.targetOpacity = Math.min(0.25, 0.06 + (1 - dist / 180) * 0.2 * interactionStrength);
          } else {
            n.targetOpacity = Math.random() * 0.04 + 0.01;
          }
        }

        n.opacity += (n.targetOpacity - n.opacity) * 0.04;

        n.connections.forEach(ci => {
          const cn = nodes[ci];
          if (!cn) return;
          const op = Math.min(n.opacity, cn.opacity) * (0.5 + pf * 0.5);
          if (op < 0.005) return;

          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(cn.x, cn.y);
          ctx.strokeStyle = `rgba(120, 200, 255, ${op * 0.5})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        });

        if (n.opacity > 0.01) {
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 2.5);
          grad.addColorStop(0, `rgba(180, 230, 255, ${n.opacity * (0.6 + pf * 0.4)})`);
          grad.addColorStop(1, `rgba(100, 180, 255, 0)`);
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      });
    };

    /* ──────────────────────────────────
       Update & Draw: Orb
       ────────────────────────────────── */
    const updateOrb = (o: Orb) => {
      const { w, h } = dimRef.current;
      o.x += o.speedX;
      o.y += o.speedY;

      if (o.x < -o.glowSize) o.x = w + o.glowSize;
      if (o.x > w + o.glowSize) o.x = -o.glowSize;
      if (o.y < -o.glowSize) o.y = h + o.glowSize;
      if (o.y > h + o.glowSize) o.y = -o.glowSize;

      o.pulse += o.pulseSpeed;
      const pf = Math.sin(o.pulse) * 0.5 + 0.5;
      o.size = o.baseSize * (0.85 + pf * 0.3);
      o.opacity = o.baseOpacity * (0.7 + pf * 0.6);

      const { x: mx, y: my, active } = mouseRef.current;
      if (active && interactionStrength) {
        const dx = o.x - mx;
        const dy = o.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 0.001) {
          const push = (1 - dist / 200) * 2.5 * interactionStrength;
          o.x += (dx / dist) * push;
          o.y += (dy / dist) * push;
          o.opacity = Math.min(o.opacity * 1.6, 0.5);
        }
      }
    };

    const drawOrb = (o: Orb) => {
      if (o.opacity < 0.005) return;

      const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.glowSize);
      grad.addColorStop(0, `hsla(${o.hue}, ${o.saturation}%, ${o.lightness}%, ${o.opacity * 0.9})`);
      grad.addColorStop(0.4, `hsla(${o.hue}, ${o.saturation}%, ${o.lightness}%, ${o.opacity * 0.3})`);
      grad.addColorStop(1, `hsla(${o.hue}, ${o.saturation}%, ${o.lightness}%, 0)`);

      ctx.beginPath();
      ctx.arc(o.x, o.y, o.glowSize, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      const coreGrad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.size * 0.6);
      coreGrad.addColorStop(0, `hsla(${o.hue}, ${o.saturation}%, ${Math.min(o.lightness + 20, 90)}%, ${o.opacity * 1.2})`);
      coreGrad.addColorStop(1, `hsla(${o.hue}, ${o.saturation}%, ${o.lightness}%, 0)`);

      ctx.beginPath();
      ctx.arc(o.x, o.y, o.size * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();
    };

    /* ──────────────────────────────────
       Draw: Meteor
       ────────────────────────────────── */
    const drawMeteor = (m: Meteor): boolean => {
      m.life++;
      if (m.life > m.maxLife) return false;

      const fadeIn = Math.min(m.life / 15, 1);
      const fadeOut = Math.max(0, 1 - (m.life - m.maxLife + 25) / 25);
      m.opacity = fadeIn * fadeOut * 0.35;

      m.x += Math.cos(m.angle) * m.speed;
      m.y += Math.sin(m.angle) * m.speed;

      const { w, h } = dimRef.current;
      if (m.x < -50 || m.x > w + 50 || m.y > h + 50) return false;

      const tailX = m.x - Math.cos(m.angle) * m.length * 0.7;
      const tailY = m.y - Math.sin(m.angle) * m.length * 0.7;

      const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      grad.addColorStop(0, `hsla(${m.hue}, 40%, 70%, 0)`);
      grad.addColorStop(0.8, `hsla(${m.hue}, 50%, 75%, ${m.opacity * 0.4})`);
      grad.addColorStop(1, `hsla(${m.hue}, 60%, 85%, ${m.opacity * 0.7})`);

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(m.x, m.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = m.width * 0.8;
      ctx.lineCap = "round";
      ctx.stroke();

      const headGrad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 5);
      headGrad.addColorStop(0, `hsla(${m.hue}, 60%, 90%, ${m.opacity * 0.6})`);
      headGrad.addColorStop(0.5, `hsla(${m.hue}, 50%, 80%, ${m.opacity * 0.2})`);
      headGrad.addColorStop(1, `hsla(${m.hue}, 40%, 70%, 0)`);

      ctx.beginPath();
      ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = headGrad;
      ctx.fill();

      return true;
    };

    /* ══════════════════════════════════════════
       Draw: 3D Planet with atmosphere & rings
       ══════════════════════════════════════════ */
    const drawPlanet = (p: Planet) => {
      const t = timeRef.current;
      const { w, h } = dimRef.current;

      // Smooth fade-in
      p.opacity = Math.min(1, p.opacity + 0.005);

      // Floating animation
      p.floatPhase += p.floatSpeed;
      p.rotation += p.rotationSpeed;

      // Responsive positioning
      p.baseX = w * p.xRatio;
      p.baseY = h * p.yRatio;
      p.x = p.baseX + Math.sin(p.floatPhase) * p.floatAmplitudeX;
      p.y = p.baseY + Math.cos(p.floatPhase * 0.7) * p.floatAmplitudeY;

      const { x, y, radius: r, opacity: op, hue, saturation: sat, lightness: lit } = p;
      if (op < 0.01) return;

      ctx.save();

      // ─── Outer atmospheric glow (subtle) ───
      const atmoSize = r * 2.0;
      const atmoGrad = ctx.createRadialGradient(x, y, r * 0.85, x, y, atmoSize);
      atmoGrad.addColorStop(0, `hsla(${p.atmosphereHue}, 60%, 55%, ${op * p.atmosphereOpacity * 0.6})`);
      atmoGrad.addColorStop(0.4, `hsla(${p.atmosphereHue}, 50%, 45%, ${op * p.atmosphereOpacity * 0.25})`);
      atmoGrad.addColorStop(1, `hsla(${p.atmosphereHue}, 30%, 25%, 0)`);
      ctx.beginPath();
      ctx.arc(x, y, atmoSize, 0, Math.PI * 2);
      ctx.fillStyle = atmoGrad;
      ctx.fill();

      // ─── Ring (back half) ───
      if (p.hasRing) drawRing(ctx, p, op, false, t);

      // ─── Drop shadow ───
      const shadowOff = r * 0.05;
      const shadowGrad = ctx.createRadialGradient(x + shadowOff, y + shadowOff, r * 0.9, x + shadowOff, y + shadowOff, r * 1.3);
      shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${op * 0.3})`);
      shadowGrad.addColorStop(1, `rgba(0, 0, 0, 0)`);
      ctx.beginPath();
      ctx.arc(x + shadowOff, y + shadowOff, r * 1.3, 0, Math.PI * 2);
      ctx.fillStyle = shadowGrad;
      ctx.fill();

      // ─── Main sphere (soft 3D gradient, realistic) ───
      const baseGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.05, x + r * 0.1, y + r * 0.1, r);
      baseGrad.addColorStop(0, `hsla(${hue}, ${Math.min(sat + 5, 60)}%, ${Math.min(lit + 18, 75)}%, ${op})`);
      baseGrad.addColorStop(0.3, `hsla(${hue}, ${sat}%, ${lit + 8}%, ${op})`);
      baseGrad.addColorStop(0.6, `hsla(${hue}, ${sat}%, ${lit}%, ${op})`);
      baseGrad.addColorStop(0.8, `hsla(${hue}, ${Math.max(sat - 8, 15)}%, ${Math.max(lit - 10, 15)}%, ${op})`);
      baseGrad.addColorStop(1, `hsla(${hue}, ${Math.max(sat - 12, 10)}%, ${Math.max(lit - 20, 10)}%, ${op})`);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = baseGrad;
      ctx.fill();

      // ─── Surface detail ───
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();

      if (p.surfaceDetail > 0.5) {
        // Gas giant banding
        const bandCount = 5 + Math.floor(p.surfaceDetail * 4);
        for (let i = 0; i < bandCount; i++) {
          const bandY = y - r + (i / bandCount) * r * 2;
          const bandWidth = r * 2 * (0.06 + Math.sin(i * 1.5 + p.rotation) * 0.02);
          const bandOp = op * (0.06 + Math.sin(i * 2.3 + t * 0.003) * 0.03);
          ctx.beginPath();
          ctx.ellipse(x, bandY, r, bandWidth * 0.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue + (i % 2 === 0 ? 10 : -10)}, ${sat - 10}%, ${lit + (i % 2 === 0 ? 8 : -5)}%, ${bandOp})`;
          ctx.fill();
        }
      } else {
        // Rocky planet craters
        p.craterPositions.forEach(crater => {
          const cx = x + Math.cos(crater.angle + p.rotation) * crater.dist * r;
          const cy = y + Math.sin(crater.angle + p.rotation * 0.5) * crater.dist * r * 0.8;
          const cSize = crater.size * r;
          const craterGrad = ctx.createRadialGradient(cx - cSize * 0.2, cy - cSize * 0.2, 0, cx, cy, cSize);
          craterGrad.addColorStop(0, `hsla(${hue}, ${sat - 20}%, ${Math.max(lit - 18, 8)}%, ${op * 0.35})`);
          craterGrad.addColorStop(0.6, `hsla(${hue}, ${sat - 15}%, ${Math.max(lit - 10, 12)}%, ${op * 0.2})`);
          craterGrad.addColorStop(1, `hsla(${hue}, ${sat}%, ${lit}%, 0)`);
          ctx.beginPath();
          ctx.arc(cx, cy, cSize, 0, Math.PI * 2);
          ctx.fillStyle = craterGrad;
          ctx.fill();
        });
      }
      ctx.restore();

      // ─── Soft specular highlight ───
      const specGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x - r * 0.15, y - r * 0.15, r * 0.6);
      specGrad.addColorStop(0, `rgba(255, 255, 255, ${op * 0.18})`);
      specGrad.addColorStop(0.4, `rgba(255, 255, 255, ${op * 0.05})`);
      specGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = specGrad;
      ctx.fill();

      // ─── Rim light ───
      const rimGrad = ctx.createRadialGradient(x, y, r * 0.85, x, y, r);
      rimGrad.addColorStop(0, `hsla(${hue}, ${sat}%, ${lit}%, 0)`);
      rimGrad.addColorStop(0.7, `hsla(${p.atmosphereHue}, 60%, 70%, ${op * 0.12})`);
      rimGrad.addColorStop(1, `hsla(${p.atmosphereHue}, 70%, 80%, ${op * 0.25})`);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // ─── Terminator (day/night) ───
      const termGrad = ctx.createLinearGradient(x - r, y, x + r, y);
      termGrad.addColorStop(0, `rgba(0, 0, 0, 0)`);
      termGrad.addColorStop(0.55, `rgba(0, 0, 0, 0)`);
      termGrad.addColorStop(0.75, `rgba(0, 0, 0, ${op * 0.15})`);
      termGrad.addColorStop(1, `rgba(0, 0, 0, ${op * 0.35})`);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = termGrad;
      ctx.fill();

      // ─── Ring (front half) ───
      if (p.hasRing) drawRing(ctx, p, op, true, t);

      // ─── Moons with visible orbit paths ───
      if (p.hasMoons) {
        for (let i = 0; i < p.moonCount; i++) {
          p.moonAngles[i] += p.moonSpeeds[i];
          const moonX = x + Math.cos(p.moonAngles[i]) * p.moonDistances[i];
          const moonY = y + Math.sin(p.moonAngles[i]) * p.moonDistances[i] * 0.4;
          const moonR = p.moonSizes[i];

          const moonAngleNorm = ((p.moonAngles[i] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const isBehind = moonAngleNorm > Math.PI * 0.3 && moonAngleNorm < Math.PI * 0.7;
          const moonOp = isBehind ? op * 0.3 : op * 0.85;

          // Always visible orbit ring — clear elliptical path
          ctx.beginPath();
          ctx.ellipse(x, y, p.moonDistances[i], p.moonDistances[i] * 0.4, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(180, 200, 230, ${op * 0.18})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Moon glow
          const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 3);
          moonGlow.addColorStop(0, `rgba(200, 220, 255, ${moonOp * 0.25})`);
          moonGlow.addColorStop(1, `rgba(200, 220, 255, 0)`);
          ctx.beginPath();
          ctx.arc(moonX, moonY, moonR * 3, 0, Math.PI * 2);
          ctx.fillStyle = moonGlow;
          ctx.fill();

          // Moon body (3D)
          const moonGrad = ctx.createRadialGradient(moonX - moonR * 0.3, moonY - moonR * 0.3, 0, moonX, moonY, moonR);
          moonGrad.addColorStop(0, `rgba(220, 230, 250, ${moonOp})`);
          moonGrad.addColorStop(0.5, `rgba(180, 195, 220, ${moonOp})`);
          moonGrad.addColorStop(1, `rgba(100, 120, 160, ${moonOp})`);
          ctx.beginPath();
          ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
          ctx.fillStyle = moonGrad;
          ctx.fill();
        }
      }

      ctx.restore();
    };

    /* ─── Ring drawing helper ─── */
    const drawRing = (
      ctx: CanvasRenderingContext2D,
      p: Planet,
      op: number,
      isFront: boolean,
      _t: number
    ) => {
      const { x, y, radius: r, ringTilt, ringColor, rotation } = p;
      const innerR = r * 1.35;
      const outerR = r * 2.1;
      const segments = 60;

      ctx.save();

      if (isFront) {
        ctx.beginPath();
        ctx.rect(x - outerR - 10, y, outerR * 2 + 20, outerR + 10);
        ctx.clip();
      } else {
        ctx.beginPath();
        ctx.rect(x - outerR - 10, y - outerR - 10, outerR * 2 + 20, outerR + 10);
        ctx.clip();
      }

      // Ring bands
      const ringBands = 4;
      for (let b = 0; b < ringBands; b++) {
        const bandInner = innerR + (outerR - innerR) * (b / ringBands);
        const bandOuter = innerR + (outerR - innerR) * ((b + 1) / ringBands);
        const bandOp = op * (0.15 - b * 0.025) * (b % 2 === 0 ? 1 : 0.6);
        const bandHue = ringColor.h + b * 5;

        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const rx = x + Math.cos(angle) * bandOuter;
          const ry = y + Math.sin(angle) * bandOuter * ringTilt;
          if (i === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        for (let i = segments; i >= 0; i--) {
          const angle = (i / segments) * Math.PI * 2;
          const rx = x + Math.cos(angle) * bandInner;
          const ry = y + Math.sin(angle) * bandInner * ringTilt;
          ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fillStyle = `hsla(${bandHue}, ${ringColor.s}%, ${ringColor.l}%, ${bandOp})`;
        ctx.fill();
      }

      // Ring shimmer particles (deterministic, no per-frame randomness)
      const shimmerAngle = rotation * 3;
      for (let i = 0; i < p.ringShimmers.length; i++) {
        const s = p.ringShimmers[i];
        const angle = shimmerAngle + s.angle;
        const dist = innerR + s.dist * (outerR - innerR);
        const sx = x + Math.cos(angle) * dist;
        const sy = y + Math.sin(angle) * dist * ringTilt;

        const shimmerOp = op * 0.14 * (0.5 + 0.5 * Math.sin(timeRef.current * 0.02 + s.phase));
        if (shimmerOp <= 0.002) continue;

        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${shimmerOp})`;
        ctx.fill();
      }

      ctx.restore();
    };

    /* ──────────────────────────────────
       Draw: Premium UFO with Beam
       ────────────────────────────────── */
    const drawUFO = () => {
      const ufo = ufoRef.current;
      if (!ufo) return;

      const { w, h } = dimRef.current;
      const t = timeRef.current;

      ufo.hover += 0.02;
      ufo.beamPulse += 0.03;
      ufo.opacity = Math.min(1, ufo.opacity + 0.008);
      ufo.glowIntensity = 0.5 + Math.sin(t * 0.05) * 0.2;

      const floatY = Math.sin(ufo.hover) * 6;
      const floatX = Math.cos(ufo.hover * 0.7) * 2;
      ufo.y = ufo.baseY + floatY;
      ufo.x = w - 80 + floatX;
      ufo.baseY = h * 0.22;

      if (Math.random() < 0.02) {
        const idx = Math.floor(Math.random() * ufo.lights.length);
        ufo.lights[idx].on = !ufo.lights[idx].on;
      }

      const { x, y, opacity: op, beamPulse, scale, glowIntensity } = ufo;
      const beamWidth = 1 + Math.sin(beamPulse) * 0.15;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // BEAM
      const beamHeight = Math.min(h - y + 100, 500);

      const outerBeam = ctx.createLinearGradient(0, 20, 0, beamHeight);
      outerBeam.addColorStop(0, `rgba(255, 220, 100, ${0.02 * op})`);
      outerBeam.addColorStop(0.3, `rgba(255, 210, 80, ${0.06 * op * glowIntensity})`);
      outerBeam.addColorStop(0.7, `rgba(255, 200, 60, ${0.08 * op * glowIntensity})`);
      outerBeam.addColorStop(1, `rgba(255, 190, 50, ${0.03 * op})`);
      ctx.beginPath();
      ctx.moveTo(-50 * beamWidth, 22);
      ctx.lineTo(50 * beamWidth, 22);
      ctx.lineTo(90 * beamWidth, beamHeight);
      ctx.lineTo(-90 * beamWidth, beamHeight);
      ctx.closePath();
      ctx.fillStyle = outerBeam;
      ctx.fill();

      const innerBeam = ctx.createLinearGradient(0, 20, 0, beamHeight);
      innerBeam.addColorStop(0, `rgba(255, 235, 150, ${0.08 * op})`);
      innerBeam.addColorStop(0.4, `rgba(255, 225, 120, ${0.12 * op * glowIntensity})`);
      innerBeam.addColorStop(1, `rgba(255, 215, 100, ${0.04 * op})`);
      ctx.beginPath();
      ctx.moveTo(-30 * beamWidth, 22);
      ctx.lineTo(30 * beamWidth, 22);
      ctx.lineTo(55 * beamWidth, beamHeight);
      ctx.lineTo(-55 * beamWidth, beamHeight);
      ctx.closePath();
      ctx.fillStyle = innerBeam;
      ctx.fill();

      for (let i = 0; i < 5; i++) {
        const py = ((t * 2 + i * 80) % beamHeight) + 30;
        const px = (Math.sin(t * 0.03 + i) * 30) * (py / beamHeight);
        const pOp = (1 - py / beamHeight) * 0.4 * op;
        ctx.beginPath();
        ctx.arc(px, py, 2 + Math.sin(t * 0.1 + i) * 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 180, ${pOp})`;
        ctx.fill();
      }

      // UFO BODY
      const ambientGlow = ctx.createRadialGradient(0, 0, 20, 0, 0, 100);
      ambientGlow.addColorStop(0, `rgba(255, 220, 100, ${0.15 * op * glowIntensity})`);
      ambientGlow.addColorStop(0.5, `rgba(255, 200, 80, ${0.08 * op})`);
      ambientGlow.addColorStop(1, `rgba(255, 180, 60, 0)`);
      ctx.beginPath();
      ctx.ellipse(0, 5, 80, 35, 0, 0, Math.PI * 2);
      ctx.fillStyle = ambientGlow;
      ctx.fill();

      const bottomGrad = ctx.createLinearGradient(0, 10, 0, 25);
      bottomGrad.addColorStop(0, `rgba(40, 45, 60, ${op})`);
      bottomGrad.addColorStop(1, `rgba(25, 30, 40, ${op})`);
      ctx.beginPath();
      ctx.ellipse(0, 18, 55, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = bottomGrad;
      ctx.fill();

      const bodyGrad = ctx.createLinearGradient(0, -15, 0, 15);
      bodyGrad.addColorStop(0, `rgba(90, 100, 120, ${op})`);
      bodyGrad.addColorStop(0.3, `rgba(70, 80, 100, ${op})`);
      bodyGrad.addColorStop(0.7, `rgba(50, 60, 80, ${op})`);
      bodyGrad.addColorStop(1, `rgba(35, 45, 65, ${op})`);
      ctx.beginPath();
      ctx.ellipse(0, 5, 60, 18, 0, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, -2, 58, 14, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = `rgba(150, 170, 200, ${op * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const domeGrad = ctx.createRadialGradient(-8, -22, 0, 0, -15, 28);
      domeGrad.addColorStop(0, `rgba(180, 220, 255, ${op * 0.9})`);
      domeGrad.addColorStop(0.3, `rgba(100, 150, 200, ${op * 0.7})`);
      domeGrad.addColorStop(0.7, `rgba(60, 100, 150, ${op * 0.5})`);
      domeGrad.addColorStop(1, `rgba(40, 70, 120, ${op * 0.4})`);
      ctx.beginPath();
      ctx.ellipse(0, -8, 28, 22, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = domeGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(-8, -18, 10, 6, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${op * 0.25})`;
      ctx.fill();

      ufo.lights.forEach((light) => {
        const lx = Math.cos(light.angle) * 48;
        const ly = Math.sin(light.angle) * 12 + 8;

        if (light.on) {
          const lightGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 8);
          lightGrad.addColorStop(0, `rgba(255, 230, 150, ${op * 0.9})`);
          lightGrad.addColorStop(0.5, `rgba(255, 200, 100, ${op * 0.4})`);
          lightGrad.addColorStop(1, `rgba(255, 180, 80, 0)`);
          ctx.beginPath();
          ctx.arc(lx, ly, 8, 0, Math.PI * 2);
          ctx.fillStyle = lightGrad;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(lx, ly, 4, 0, Math.PI * 2);
        ctx.fillStyle = light.on ? `rgba(255, 220, 130, ${op})` : `rgba(80, 90, 110, ${op})`;
        ctx.fill();
      });

      // Text
      const textY = beamHeight - 60 + Math.sin(beamPulse * 0.8) * 2;
      ctx.save();
      ctx.shadowColor = "rgba(255, 220, 100, 0.4)";
      ctx.shadowBlur = 12;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.font = "400 12px 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillStyle = `rgba(255, 245, 220, ${op * 0.7})`;
      ctx.fillText("Google", 0, textY - 10);

      ctx.font = "600 16px 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillStyle = `rgba(255, 240, 200, ${op * 0.9})`;
      ctx.fillText("Gemini 3", 0, textY + 8);
      ctx.restore();

      // Sparkles
      if (Math.random() < 0.1) {
        const sparkX = (Math.random() - 0.5) * 120;
        const sparkY = (Math.random() - 0.5) * 60;
        const sparkSize = Math.random() * 3 + 1;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 250, 220, ${op * 0.7})`;
        ctx.fill();
      }

      ctx.restore();
    };

    /* ══════════════════════════════
       Main animation loop
       ══════════════════════════════ */
    const tick = () => {
      const { w, h } = dimRef.current;
      timeRef.current++;
      ctx.clearRect(0, 0, w, h);

      // 0. Background stars (deepest)
      drawStars();

      // 1. Nebulae (deep background)
      if (showNebula) drawNebulae();

      // 2. Grid
      if (showGrid) drawGrid();

      // 3. Back-layer planets (layer 0 — small, distant)
      if (showPlanets) {
        planetsRef.current.filter(p => p.layer === 0).forEach(drawPlanet);
      }

      // 4. Orbs
      const sorted = [...orbsRef.current].sort((a, b) => a.layer - b.layer);
      sorted.forEach(o => { updateOrb(o); drawOrb(o); });

      // 5. Mid-layer planets (layer 1)
      if (showPlanets) {
        planetsRef.current.filter(p => p.layer === 1).forEach(drawPlanet);
      }

      // 6. Meteors
      if (shootingStars) {
        if (Math.random() < cfg.meteorRate) {
          const burst = Math.random() < 0.15 ? cfg.meteorBurst : 1;
          for (let i = 0; i < burst; i++) {
            meteorsRef.current.push(mkMeteor(w, h));
          }
        }
        meteorsRef.current = meteorsRef.current.filter(drawMeteor);
      }

      // 7. Front-layer planets (layer 2 — large, prominent)
      if (showPlanets) {
        planetsRef.current.filter(p => p.layer === 2).forEach(drawPlanet);
      }

      // 8. UFO (front-most)
      if (showUFO) drawUFO();

      animRef.current = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    tick();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(animRef.current);
    };
  }, [init, showGrid, shootingStars, showUFO, showPlanets, showNebula, interactionStrength, speed, cfg, mkMeteor, mkOrb]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none fixed inset-0 w-full h-full ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}

export default ParticleBackground;
