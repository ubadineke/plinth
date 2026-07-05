"use client";

import { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ══════════════════════════════════════════════════════
   Brand "advert" painted ONTO the bridge's central median (world x=0): a single
   flat strip lying on the deck, its logos a scrolling texture. Being one surface
   in the scene, it's projected exactly like the road — always glued to the median
   under any parallax, fattening toward the camera and tapering to the vanishing
   point, with no logo ever occluding another. Every logo fills the strip width so
   they all read at the median's width; a separate two-line "Built on Nomba rails"
   caption stands at the near base.
   ══════════════════════════════════════════════════════ */

const LOGOS = [
  "/logos/gig-logistics.png",
  "/logos/reliance-health.svg",
  "/logos/wakanow.svg",
  "/logos/burger-king.svg",
  "/logos/healthplus.png",
  "/logos/gigm.svg",
  "/logos/megaplaza.png",
  "/logos/supersaver.png",
  "/logos/the-delborough.png",
];

const Y = 1.23; // just above the median barrier top
const STRIP_W = 0.85; // strip width — sized to fit inside the 1.0-wide median barrier top
const Z_FAR = 45; // far end of the strip — shorter run keeps the anamorphic stretch gentle & even
const Z_NEAR = 125; // near end of the logo strip — right above the caption
const CAPTION_Z = 128; // caption is the nearest element, low toward the bottom of the screen
const CANVAS_W = 460; // px width of the source canvas
const REPEAT = 0.62; // fraction of the stacked canvas shown across the strip (anamorphic stretch)
const SPEED = 0.02; // texture scroll (UV / second) — logos recede up the road
const depth = Z_NEAR - Z_FAR;

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* Stack every logo down one transparent canvas, each drawn containment-fit at full width,
   and calculate texture repeat and scroll speed dynamically to ensure perfect aspect ratios. */
function useStripTexture() {
  const [data, setData] = useState<{ texture: THREE.CanvasTexture | null; speed: number }>({
    texture: null,
    speed: 0.016,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all(LOGOS.map(loadImage)).then((imgs) => {
      if (cancelled) return;
      const drawW = CANVAS_W * 0.99; // every logo box-fits the full width (contain, no crop)
      const gap = CANVAS_W * 0.18; // uniform gap between logos
      const items = imgs.map((img) => {
        const nw = img?.naturalWidth || 300;
        const nh = img?.naturalHeight || 120;
        return { img, h: drawW * (nh / nw) };
      });
      const totalH = items.reduce((s, it) => s + it.h + gap, 0);
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_W;
      canvas.height = Math.max(1, Math.ceil(totalH));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      let y = gap / 2;
      items.forEach((it) => {
        if (it.img) {
          // a tiny grounding shadow so lighter logos read against the median
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.28)";
          ctx.shadowBlur = 9;
          ctx.shadowOffsetY = 7;
          ctx.drawImage(it.img, (CANVAS_W - drawW) / 2, y, drawW, it.h);
          ctx.restore();
        }
        y += it.h + gap;
      });

      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;

      // A fixed repeat gives the logos a strong vertical stretch in world space that
      // the flat grazing angle un-stretches — the SAME anamorphic trick as the caption.
      // (The "square-pixel" undistort value compresses them to invisible tiles instead.)
      t.repeat.y = REPEAT;
      t.needsUpdate = true;

      setData({ texture: t, speed: SPEED });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

/* "Built on Nomba rails" with high contrast, brand colors, JetBrains Mono font,
   designed to map onto an elongated geometry that counteracts perspective foreshortening.
   Painted only after the webfont resolves — a canvas bakes whatever font is
   available at draw time, so drawing early would freeze the fallback in. */
function useCaptionTexture() {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 256; // 2:1 aspect ratio matches the elongated plane geometry aspect ratio
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      // Use the primary ink color (#14181C) for maximum contrast and legibility
      ctx.fillStyle = "#14181C";
      ctx.font = '700 34px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      try {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "6px";
      } catch {
        /* noop */
      }
      // Centered with safety padding to prevent any edge clipping
      ctx.fillText("BUILT ON", c.width / 2, 90);
      ctx.fillText("NOMBA RAILS", c.width / 2, 166);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
      setTexture(t);
    };
    document.fonts.load('700 34px "JetBrains Mono"').then(draw, draw);
    return () => {
      cancelled = true;
    };
  }, []);

  return texture;
}

export default function RoadLogos({ reduce = false }: { reduce?: boolean }) {
  const { texture: strip, speed } = useStripTexture();
  const caption = useCaptionTexture();

  useFrame((_, dtRaw) => {
    if (!strip || reduce) return;
    strip.offset.y = (strip.offset.y + speed * Math.min(dtRaw, 0.05)) % 1;
  });

  return (
    <group>
      {strip && (
        <mesh position={[0, Y, (Z_NEAR + Z_FAR) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[STRIP_W, depth]} />
          <meshBasicMaterial
            map={strip}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}

      {caption && (
        // lies flat on the median barrier. Elongated to 3.5x width in Z-axis
        // to counteract the shallow camera angle foreshortening (anamorphic projection).
        <mesh position={[0, Y, CAPTION_Z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[STRIP_W, STRIP_W * 3.5]} />
          <meshBasicMaterial
            map={caption}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}
