"use client";

/* ──────────────────────────────────────────────────────────────
   ReconcileVisual3D — the reconciliation panel as a soft-matte clay
   3-D card (leaning "easel" pose, design variant 1a). The FACE is
   drawn live on a 2-D canvas and mapped as a texture — so the real
   amounts, account refs, status chips, progress bars, header and
   footer read exactly like the flat panel, but as a physical object.

   On scroll-in the rows drop in and the reconciliation resolves; on
   hover (fine pointer only) the whole card turns toward the cursor,
   a real 3-D parallax rather than a CSS trick, since the camera and
   geometry are real. Respects prefers-reduced-motion (renders
   settled, no motion, no hover tilt). No ground shadow by design —
   the flat brand palette reads cleaner without one here.

   Uses plain three.js (already a dependency). No @react-three/fiber
   needed. Palette + type follow brand.md (jade + warm grayscale,
   JetBrains Mono / Space Grotesk).
   ────────────────────────────────────────────────────────────── */

import { useEffect, useRef } from "react";
import * as THREE from "three";

const AMOUNTS = ["₦5,000", "₦3,200", "₦12,000", "₦900"];
const METAS = [
  "acct •••4821 → INV-1042",
  "acct •••7715 → INV-1043",
  "acct •••2093 → INV-1044",
  "sender unmatched",
];
const FILLS = [1, 0.64, 1, 0];
const CHIPS = [
  { label: "Matched", icon: "check", style: "solid" },
  { label: "₦1,800 due", icon: "half", style: "muted" },
  { label: "+₦2,000 credit", icon: "up", style: "outline" },
  { label: "Needs review", icon: "q", style: "dashed" },
] as const;

const P = {
  faceBg: "#F1EDE3",
  rowBg: "#FFFFFF",
  rowBorder: "rgba(20,24,28,0.09)",
  ink: "#14181C",
  inkMid: "rgba(20,24,28,0.55)",
  monoLabel: "#8A9099",
  track: "#E8E3D6",
  jade: "#0FA37F",
  jade600: "#0C8A6B",
  jadeSoft: "#DCF1EA",
};

const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";
const SANS = "'Space Grotesk', system-ui, sans-serif";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const seg = (t: number, s: number, d: number) => clamp01((t - s) / d);
const outCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const outBack = (p: number) => {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};
function bounceOut(p: number) {
  const n = 7.5625,
    d = 2.75;
  if (p < 1 / d) return n * p * p;
  if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
  if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
  return n * (p -= 2.625 / d) * p + 0.984375;
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function rbox(w: number, d: number, h: number, r: number) {
  const bt = h * 0.24,
    bs = Math.min(r * 0.5, h * 0.24);
  const W = w - bs * 2,
    D = d - bs * 2,
    R = Math.max(0.01, r - bs);
  const s = new THREE.Shape();
  const x = W / 2,
    y = D / 2;
  s.absarc(x - R, y - R, R, 0, Math.PI / 2);
  s.absarc(-x + R, y - R, R, Math.PI / 2, Math.PI);
  s.absarc(-x + R, -y + R, R, Math.PI, Math.PI * 1.5);
  s.absarc(x - R, -y + R, R, Math.PI * 1.5, Math.PI * 2);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.001, h - bt * 2),
    bevelEnabled: true,
    bevelThickness: bt,
    bevelSize: bs,
    bevelSegments: 3,
    curveSegments: 18,
  });
  g.rotateX(-Math.PI / 2);
  g.center();
  return g;
}

function drawIcon(ctx: CanvasRenderingContext2D, kind: string, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (kind === "check") {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.42, cy + s * 0.02);
    ctx.lineTo(cx - s * 0.08, cy + s * 0.34);
    ctx.lineTo(cx + s * 0.46, cy - s * 0.34);
    ctx.stroke();
  } else if (kind === "up") {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.42);
    ctx.lineTo(cx, cy - s * 0.42);
    ctx.moveTo(cx - s * 0.32, cy - s * 0.1);
    ctx.lineTo(cx, cy - s * 0.42);
    ctx.lineTo(cx + s * 0.32, cy - s * 0.1);
    ctx.stroke();
  } else if (kind === "half") {
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.42, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
  } else if (kind === "q") {
    ctx.font = "700 " + Math.round(s * 1.05) + "px " + SANS;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", cx, cy + s * 0.04);
  }
  ctx.restore();
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  rightX: number,
  cy: number,
  cfg: (typeof CHIPS)[number],
  scale: number,
  alpha: number,
) {
  ctx.save();
  ctx.font = "600 22px " + SANS;
  const tw = ctx.measureText(cfg.label).width;
  const iconW = 22,
    padX = 20,
    gap = 9,
    h = 46;
  const w = padX * 2 + iconW + gap + tw;
  const x = rightX - w,
    y = cy - h / 2;
  ctx.globalAlpha = alpha;
  ctx.translate(x + w / 2, cy);
  ctx.scale(scale, scale);
  ctx.translate(-(x + w / 2), -cy);
  let textColor = P.ink,
    iconColor = P.ink;
  if (cfg.style === "solid") {
    ctx.fillStyle = P.jade;
    rrect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    textColor = "#ffffff";
    iconColor = "#ffffff";
  } else if (cfg.style === "outline") {
    ctx.fillStyle = P.jadeSoft;
    rrect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = P.jade;
    ctx.lineWidth = 2;
    rrect(ctx, x, y, w, h, h / 2);
    ctx.stroke();
    textColor = P.jade600;
    iconColor = P.jade600;
  } else if (cfg.style === "muted") {
    ctx.fillStyle = P.track;
    rrect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    textColor = P.inkMid;
    iconColor = P.inkMid;
  } else {
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = P.inkMid;
    ctx.lineWidth = 2;
    rrect(ctx, x, y, w, h, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    textColor = P.inkMid;
    iconColor = P.inkMid;
  }
  drawIcon(ctx, cfg.icon, x + padX + iconW / 2, cy, iconW * 0.7, iconColor);
  ctx.fillStyle = textColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "600 22px " + SANS;
  ctx.fillText(cfg.label, x + padX + iconW + gap, cy + 1);
  ctx.restore();
}

function drawFace(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, now: number) {
  ctx.clearRect(0, 0, W, H);
  rrect(ctx, 0, 0, W, H, 40);
  ctx.fillStyle = P.faceBg;
  ctx.fill();
  const pad = 58;

  const hA = seg(t, 0, 0.4);
  ctx.save();
  ctx.globalAlpha = hA;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = "500 21px " + MONO;
  ctx.fillStyle = P.monoLabel;
  if ("letterSpacing" in ctx) (ctx as any).letterSpacing = "4px";
  ctx.fillText("AUTO-RECONCILIATION", pad, pad + 2);
  if ("letterSpacing" in ctx) (ctx as any).letterSpacing = "0px";
  ctx.textAlign = "right";
  ctx.font = "600 23px " + SANS;
  ctx.fillStyle = P.jade;
  ctx.fillText("Live", W - pad, pad);
  const lw = ctx.measureText("Live").width;
  const pulse = 0.5 + 0.5 * Math.sin(now / 320);
  ctx.beginPath();
  ctx.arc(W - pad - lw - 20, pad + 13, 9 + 4 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(15,163,127," + 0.28 * (1 - pulse) + ")";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W - pad - lw - 20, pad + 13, 6, 0, Math.PI * 2);
  ctx.fillStyle = P.jade;
  ctx.fill();
  ctx.restore();

  const rowX = pad,
    rowW = W - pad * 2;
  const rowH = 112,
    gap = 16,
    top0 = pad + 62;
  for (let i = 0; i < 4; i++) {
    const a = 0.25 + i * 0.42;
    const appear = seg(t, a, 0.55);
    const alpha = seg(t, a, 0.32);
    if (alpha <= 0) continue;
    const offset = -74 * (1 - bounceOut(appear));
    const rowTop = top0 + i * (rowH + gap) + offset;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(20,24,28,0.10)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    rrect(ctx, rowX, rowTop, rowW, rowH, 20);
    ctx.fillStyle = P.rowBg;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = P.rowBorder;
    ctx.lineWidth = 1.5;
    rrect(ctx, rowX, rowTop, rowW, rowH, 20);
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "700 34px " + MONO;
    ctx.fillStyle = P.ink;
    ctx.fillText(AMOUNTS[i], rowX + 32, rowTop + 46);
    ctx.font = "500 20px " + MONO;
    ctx.fillStyle = P.inkMid;
    ctx.fillText(METAS[i], rowX + 32, rowTop + 78);
    const trackW = rowW * 0.52,
      trackX = rowX + 32,
      trackY = rowTop + rowH - 26,
      trackH = 11;
    if (i === 3) {
      ctx.setLineDash([8, 7]);
      ctx.strokeStyle = P.rowBorder;
      ctx.lineWidth = 2;
      rrect(ctx, trackX, trackY - trackH / 2, trackW, trackH, trackH / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      rrect(ctx, trackX, trackY - trackH / 2, trackW, trackH, trackH / 2);
      ctx.fillStyle = P.track;
      ctx.fill();
      const fw = trackW * FILLS[i] * outCubic(seg(t, a + 0.55, 0.6));
      if (fw > 2) {
        const grad = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
        grad.addColorStop(0, P.jade600);
        grad.addColorStop(1, P.jade);
        rrect(ctx, trackX, trackY - trackH / 2, fw, trackH, trackH / 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }
    const chipScale = 0.6 + 0.4 * outBack(seg(t, a + 0.95, 0.42));
    const chipA = seg(t, a + 0.95, 0.32);
    if (chipA > 0) drawChip(ctx, rowX + rowW - 30, rowTop + rowH * 0.31, CHIPS[i], chipScale, chipA * alpha);
    ctx.restore();
  }

  const fA = seg(t, 2.55, 0.6);
  if (fA > 0) {
    ctx.save();
    ctx.globalAlpha = fA;
    const fy = H - 74;
    ctx.strokeStyle = P.rowBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad, fy);
    ctx.lineTo(W - pad, fy);
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "500 20px " + MONO;
    ctx.fillStyle = P.inkMid;
    ctx.fillText("4 transfers · ₦21,100 in", pad, fy + 26);
    ctx.textAlign = "right";
    ctx.font = "600 22px " + SANS;
    ctx.fillStyle = P.jade;
    const msg = "Every kobo accounted for";
    const mw = ctx.measureText(msg).width;
    ctx.fillText(msg, W - pad, fy + 27);
    drawIcon(ctx, "check", W - pad - mw - 18, fy + 26, 15, P.jade);
    ctx.restore();
  }
}

// hover tilt tuning — small and premium, not cartoonish
const TILT_YAW_MAX = 0.12; // rad, left/right lean toward the cursor
const TILT_PITCH_MAX = 0.08; // rad, forward/back lean
const TILT_EASE = 0.08; // per-frame lerp toward the target

export function ReconcileVisual3D({
  className = "",
  onFail,
}: {
  className?: string;
  /** Called if WebGL setup throws (unsupported/sandboxed GPU, driver crash).
      Unlike react-three-fiber's <Canvas>, a plain three.js WebGLRenderer
      constructed inside an effect throws asynchronously — a React error
      boundary can't catch that, so the caller is responsible for swapping
      in a fallback (see Accounts.tsx, which renders the flat 2-D panel). */
  onFail?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const TOTAL = 3.5;
    let start: number | null = null; // set on scroll-in
    let raf = 0;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("3D reconciliation card failed to initialize, falling back to the flat panel:", error);
      onFail?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // no ground shadow in this variant — flat brand palette reads cleaner without one
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;cursor:pointer";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    camera.position.set(0.18, 1.65, 6.0);
    camera.lookAt(0, 1.1, 0.02);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c6, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.65);
    key.position.set(1.4, 9.5, 4.0);
    scene.add(key);
    const fillLight = new THREE.DirectionalLight(0xfff6e8, 0.4);
    fillLight.position.set(-3, 2.5, -2.5);
    scene.add(fillLight);

    const outer = new THREE.Group();
    const cardG = new THREE.Group();
    outer.add(cardG);
    scene.add(outer);

    const CW = 3.5,
      CD = 2.62,
      CH = 0.17;
    const body = new THREE.Mesh(
      rbox(CW, CD, CH, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xe7e1d4, roughness: 0.95, metalness: 0 }),
    );
    cardG.add(body);

    const CANVAS_W = 1120;
    const CANVAS_H = Math.round((CANVAS_W * (CD - 0.28)) / (CW - 0.28));
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d")!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 4;
    (tex as any).colorSpace = THREE.SRGBColorSpace;
    const faceW = CW - 0.28,
      faceH = (faceW * CANVAS_H) / CANVAS_W;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(faceW, faceH),
      // transparent: true is load-bearing — the canvas draws a ROUNDED rect,
      // leaving its four corners at alpha 0. Without this flag three.js
      // ignores that alpha channel and paints those corners solid black
      // instead of letting the clay body show through underneath.
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false, transparent: true }),
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = CH / 2 + 0.012;
    cardG.add(face);

    const baseY = 1.15;
    const basePitch = 1.32; // gentle lean, closer to upright — not the steep easel angle
    const baseYaw = -0.32;
    cardG.rotation.set(basePitch, 0, 0);
    outer.rotation.y = baseYaw;
    outer.position.y = baseY;

    // hover state — a real 3-D turn toward the cursor, blended with the idle sway
    const tilt = { x: 0, y: 0 };
    const targetTilt = { x: 0, y: 0 };

    const onPointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0..1
      const py = (e.clientY - rect.top) / rect.height; // 0..1
      targetTilt.y = (px - 0.5) * 2 * TILT_YAW_MAX;
      targetTilt.x = (py - 0.5) * 2 * TILT_PITCH_MAX;
    };
    const onPointerLeave = () => {
      targetTilt.x = 0;
      targetTilt.y = 0;
    };
    if (hoverCapable && !reduced) {
      host.addEventListener("pointermove", onPointerMove);
      host.addEventListener("pointerleave", onPointerLeave);
      host.dataset.hover = "true"; // the site's custom cursor reacts to this
    }

    const onClick = () => {
      if (!reduced) start = performance.now();
    };
    renderer.domElement.addEventListener("click", onClick);

    // The render loop runs ONLY while the card is on screen and the tab is
    // visible — a permanently-running 60fps WebGL loop below the fold is a
    // measurable drag on the whole page's scroll performance.
    let running = false;
    let inView = false;
    const setRunning = (v: boolean) => {
      const next = v && !document.hidden;
      if (next === running) return;
      running = next;
      if (running && !raf) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        inView = e.isIntersecting;
        if (e.isIntersecting && start === null && !reduced) start = performance.now();
        setRunning(inView);
      },
      { threshold: [0, 0.3] },
    );
    io.observe(host);
    const onVisibility = () => setRunning(inView);
    document.addEventListener("visibilitychange", onVisibility);

    const resize = () => {
      const w = host.clientWidth || 300,
        h = host.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    if (document.fonts?.ready) document.fonts.ready.then(() => (tex.needsUpdate = true));

    const tick = () => {
      if (!running) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      let t: number;
      if (reduced) t = TOTAL + 1;
      else if (start === null) t = 0;
      else t = Math.max(0, (now - start) / 1000);
      drawFace(ctx, CANVAS_W, CANVAS_H, t, now);
      tex.needsUpdate = true;

      if (!reduced) {
        tilt.x += (targetTilt.x - tilt.x) * TILT_EASE;
        tilt.y += (targetTilt.y - tilt.y) * TILT_EASE;
        const idleY = Math.sin((now / 1000) * 0.9) * 0.03;
        const idleYaw = Math.sin((now / 1000) * 0.5) * 0.04;
        outer.position.y = baseY + idleY;
        outer.rotation.y = baseYaw + idleYaw + tilt.y;
        outer.rotation.x = tilt.x;
      }
      renderer.render(scene, camera);
    };
    // don't start the loop here — the IntersectionObserver starts it the
    // moment the card is actually on screen (and stops it when it isn't)

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      ro.disconnect();
      renderer.domElement.removeEventListener("click", onClick);
      if (hoverCapable && !reduced) {
        host.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerleave", onPointerLeave);
      }
      renderer.dispose();
      tex.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  // give it a sensible aspect box; the section grid controls its width
  return <div ref={hostRef} className={className} style={{ width: "100%", aspectRatio: "1.2 / 1" }} aria-hidden />;
}

export default ReconcileVisual3D;
