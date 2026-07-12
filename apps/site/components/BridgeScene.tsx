"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, AdaptiveDpr } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Danfo from "./Danfo";
import RoadLogos from "./RoadLogos";

/* ══════════════════════════════════════════════════════
   Palette
   ══════════════════════════════════════════════════════ */
const C = {
  skyTop: "#84bde3",
  skyBot: "#faebd4",
  cloud: "#f9f1e1",
  water: "#99c2d1",
  bldg: "#c2d1d9",
  pylon: "#f6e4c4", // Made slightly darker/richer cream so it doesn't blend into the sky
  pylonShade: "#cbbfa4", // darker shade band down the legs' INNER edges (below the horns)
  rung: "#a7b0b1", // ladder rungs — cool grey, the deepest shadow, only in the gap
  road: "#2b2b31",
  barrier: "#e0dcd2",
  line: "#e5dfd4",
  rail: "#698394",
  cable: "#ffffff",
  lamp: "#9aa8ae", // slender silvery-grey poles, as in the reference
  lampHead: "#5f7178", // cobra-head luminaire, a touch darker for definition
};

/* ══════════════════════════════════════════════════════
   Pylon geometry — one parametric leg curve drives BOTH the
   filled leg shape AND the cable anchor points, so the ropes
   always connect to the real leg surface.
   ══════════════════════════════════════════════════════ */

// LEFT leg centreline — a tuning-fork like image.png: splayed feet on the deck,
// curve up to a narrow waist (the ladder lives here), then splay back OUT into a
// horn with a V-notch at the very top. Mirror for the right.
const LEG: [number, number][] = [
  [-15.0, 0], [-10.5, 12], [-7.0, 25], [-4.9, 36], [-4.0, 45], [-4.5, 54], [-6.0, 62],
];
// half-widths — BOLD solid legs (were spindly, so the pylon read see-through)
const LEGW = [2.8, 3.2, 3.5, 3.4, 3.2, 2.7, 1.8];

function legCurve(side: number) {
  return new THREE.CatmullRomCurve3(
    LEG.map(([x, y]) => new THREE.Vector3(side * x, y, 0)),
    false, "catmullrom", 0.5,
  );
}

/** x of the leg centreline at height y (linear) — used to anchor cables. */
function legPointX(y: number, side: number) {
  for (let i = 0; i < LEG.length - 1; i++) {
    const y0 = LEG[i][1], y1 = LEG[i + 1][1];
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / (y1 - y0);
      const x0 = Math.abs(LEG[i][0]), x1 = Math.abs(LEG[i + 1][0]);
      return side * (x0 + (x1 - x0) * t);
    }
  }
  return side * Math.abs(LEG[LEG.length - 1][0]);
}

/** |x| of the ACTUAL rendered (Catmull-Rom) leg centreline at height y — so the
    ladder rungs land on the real legs (the spline bows wider than the linear fit). */
function legCenterAt(y: number) {
  const curve = legCurve(1);
  let bx = LEG[0][0], bd = Infinity;
  for (let i = 0; i <= 160; i++) {
    const p = curve.getPoint(i / 160);
    const d = Math.abs(p.y - y);
    if (d < bd) { bd = d; bx = p.x; }
  }
  return Math.abs(bx);
}

/** Closed leg outline. Edges are offset HORIZONTALLY from the centreline at each
    height (a single-valued function of y) so the polygon can never self-intersect
    — the perpendicular-offset version folded over itself at the curved horn and
    earcut then collapsed the whole leg into slivers. */
function legShape(side: number) {
  const curve = legCurve(side);
  const N = 48;
  const outer: THREE.Vector2[] = [], inner: THREE.Vector2[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const p = curve.getPoint(t);
    const f = t * (LEGW.length - 1);
    const a = Math.floor(f), b = Math.min(LEGW.length - 1, a + 1);
    const w = LEGW[a] + (LEGW[b] - LEGW[a]) * (f - a);
    const cx = Math.abs(p.x);
    outer.push(new THREE.Vector2(side * (cx + w), p.y));
    inner.push(new THREE.Vector2(side * (cx - w), p.y));
  }
  const s = new THREE.Shape();
  s.moveTo(outer[0].x, outer[0].y);
  for (let i = 1; i < N; i++) s.lineTo(outer[i].x, outer[i].y);
  for (let i = N - 1; i >= 0; i--) s.lineTo(inner[i].x, inner[i].y);
  s.closePath();
  return s;
}

/** |x| of a leg's INNER edge at height y — so the rungs span only the gap
    between the legs (never onto the leg faces). */
function legInnerAt(y: number) {
  const curve = legCurve(1);
  let bd = Infinity, bx = 0;
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const p = curve.getPoint(t);
    const dy = Math.abs(p.y - y);
    if (dy < bd) {
      const f = t * (LEGW.length - 1);
      const a = Math.floor(f), b = Math.min(LEGW.length - 1, a + 1);
      const w = LEGW[a] + (LEGW[b] - LEGW[a]) * (f - a);
      bd = dy; bx = Math.abs(p.x) - w;
    }
  }
  return bx;
}

/** Narrow shadow band down a leg's INNER edge, only from the deck up to yMax
    (kept below the horns — the top stays evenly lit). */
function legShadeShape(side: number, yMax: number) {
  const curve = legCurve(side);
  const N = 96;
  const inner: THREE.Vector2[] = [], mid: THREE.Vector2[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const p = curve.getPoint(t);
    if (p.y > yMax) break;
    const f = t * (LEGW.length - 1);
    const a = Math.floor(f), b = Math.min(LEGW.length - 1, a + 1);
    const w = LEGW[a] + (LEGW[b] - LEGW[a]) * (f - a);
    const cx = Math.abs(p.x);
    inner.push(new THREE.Vector2(side * (cx - w), p.y));
    mid.push(new THREE.Vector2(side * (cx - 0.55 * w), p.y));
  }
  const s = new THREE.Shape();
  if (inner.length < 2) return s;
  s.moveTo(mid[0].x, mid[0].y);
  for (let i = 1; i < mid.length; i++) s.lineTo(mid[i].x, mid[i].y);
  for (let i = inner.length - 1; i >= 0; i--) s.lineTo(inner[i].x, inner[i].y);
  s.closePath();
  return s;
}

const SHADE_TOP = 53; // shadow stays below the horns

function Pylon() {
  const { shapeL, shapeR, shadeL, shadeR, rungs } = useMemo(() => {
    const shapeL = legShape(-1);
    const shapeR = legShape(1);
    const shadeL = legShadeShape(-1, SHADE_TOP);
    const shadeR = legShadeShape(1, SHADE_TOP);
    // 4 rungs — each spans ONLY the gap between the legs' inner edges (never onto
    // the leg faces). Sits in front so it reads as the ladder.
    const rungs = [34, 40, 46, 52].map((y) => ({ y, half: legInnerAt(y) + 0.1 }));
    return { shapeL, shapeR, shadeL, shadeR, rungs };
  }, []);

  return (
    <group>
      {/* flat filled legs — shapeGeometry renders the solid band reliably
          (extrudeGeometry collapsed to thin slivers in-browser) */}
      <mesh>
        <shapeGeometry args={[shapeL]} />
        <meshLambertMaterial color={C.pylon} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <shapeGeometry args={[shapeR]} />
        <meshLambertMaterial color={C.pylon} side={THREE.DoubleSide} />
      </mesh>
      {/* darker shadow down the legs' inner edges, below the horns */}
      <group>
        <mesh position={[0, 0, 0.02]}>
          <shapeGeometry args={[shadeL]} />
          <meshBasicMaterial color={C.pylonShade} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <shapeGeometry args={[shadeR]} />
          <meshBasicMaterial color={C.pylonShade} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* 4 darker rungs, only in the gap between the legs */}
      {rungs.map((r, i) => (
        <mesh key={i} position={[0, r.y, 0.05]}>
          <planeGeometry args={[r.half * 2, 1.9]} />
          <meshBasicMaterial color={C.rung} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════════════════
   Cables — clean fans. Each rope's TOP sits on the real leg
   (legPointX) and its BOTTOM on the deck edge; highest anchor
   → farthest deck point so the fan never crosses.
   ══════════════════════════════════════════════════════ */
function Cables() {
  const lines = useMemo(() => {
    const arr: { f: [number, number, number]; t: [number, number, number] }[] = [];
    const attachY = [57, 51, 45, 39, 33];      // along the upper leg
    const anchorZ = [116, 88, 64, 44, 26];     // deck anchors, far (foreground) → near the pylon
    const edge = 11.4;                          // road edge (inside the barrier)
    for (const side of [-1, 1]) {
      attachY.forEach((ay, i) => {
        arr.push({
          f: [legPointX(ay, side), ay, 0],
          t: [side * edge, 0.5, anchorZ[i]],
        });
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {lines.map((c, i) => (
        <Line key={i} points={[c.f, c.t]} color={C.cable} lineWidth={1.4} />
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════════════════
   Road Surface
   ══════════════════════════════════════════════════════ */
function RoadSurface() {
  const dashes = Array.from({ length: 80 }, (_, i) => -400 + i * 15);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[24, 1000]} />
        <meshBasicMaterial color={C.road} />
      </mesh>
      {[-11.5, -1, 1, 11.5].map((x) => (
        <mesh key={`solid_${x}`} rotation-x={-Math.PI / 2} position={[x, 0.2, 0]}>
          <planeGeometry args={[0.3, 1000]} />
          <meshBasicMaterial color={C.line} />
        </mesh>
      ))}
      {[-6.25, 6.25].map((x) => (
        <group key={`dash_${x}`}>
          {dashes.map((z) => (
            <mesh key={z} rotation-x={-Math.PI / 2} position={[x, 0.21, z]}>
              <planeGeometry args={[0.3, 6]} />
              <meshBasicMaterial color={C.line} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════════════════
   Barriers
   ══════════════════════════════════════════════════════ */
function Barriers() {
  const posts = Array.from({ length: 100 }, (_, i) => -500 + i * 10);

  return (
    <group>
      <mesh position={[-12.5, 0.75, 0]}>
        <boxGeometry args={[1, 1.5, 1000]} />
        <meshLambertMaterial color={C.barrier} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1, 1.2, 1000]} />
        <meshLambertMaterial color={C.barrier} />
      </mesh>
      <mesh position={[12.5, 1.5, 0]}>
        <boxGeometry args={[0.2, 0.2, 1000]} />
        <meshLambertMaterial color={C.rail} />
      </mesh>
      <mesh position={[12.5, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.1, 1000]} />
        <meshLambertMaterial color={C.rail} />
      </mesh>
      {posts.map((z) => (
        <mesh key={`post_${z}`} position={[12.5, 0.75, z]}>
          <boxGeometry args={[0.2, 1.5, 0.2]} />
          <meshLambertMaterial color={C.rail} />
        </mesh>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════════════════
   Lamps — gooseneck cobra-head street lights, exactly as in
   the reference: a slender vertical pole, a smooth arm that
   arcs up and over toward the road, and a small luminaire
   drooping at the tip. One shared geometry, mirrored L/R.
   ══════════════════════════════════════════════════════ */
const POLE_H = 12.5;       // pole height
const ARM_REACH = 5.2;     // how far the arm overhangs the road
const HEAD_Y = POLE_H + 1.5;

function Lamps() {
  const { poleGeo, armPos, armNeg, headGeo, poleMat, headMat } = useMemo(() => {
    const poleGeo = new THREE.CylinderGeometry(0.16, 0.32, POLE_H, 10);
    // gooseneck: leaves the pole vertically, curves over, droops to the head
    const mkArm = (s: number) =>
      new THREE.TubeGeometry(
        new THREE.CubicBezierCurve3(
          new THREE.Vector3(0, POLE_H, 0),
          new THREE.Vector3(0, POLE_H + 1.9, 0),
          new THREE.Vector3(s * 3.3, POLE_H + 2.5, 0),
          new THREE.Vector3(s * ARM_REACH, HEAD_Y, 0)
        ),
        30, 0.135, 6, false
      );
    const headGeo = new THREE.BoxGeometry(1.7, 0.34, 0.5);
    const poleMat = new THREE.MeshLambertMaterial({ color: C.lamp });
    const headMat = new THREE.MeshLambertMaterial({ color: C.lampHead });
    return { poleGeo, armPos: mkArm(1), armNeg: mkArm(-1), headGeo, poleMat, headMat };
  }, []);

  const zPositions = Array.from({ length: 25 }, (_, i) => -400 + i * 40);

  return (
    <group>
      {zPositions.flatMap((z) =>
        ([-13.5, 13.5] as const).map((x) => {
          const sign = x > 0 ? -1 : 1; // arm reaches toward the road centre
          return (
            <group key={`lamp_${x}_${z}`} position={[x, 0, z]}>
              <mesh geometry={poleGeo} material={poleMat} position={[0, POLE_H / 2, 0]} />
              <mesh geometry={sign > 0 ? armPos : armNeg} material={poleMat} />
              <mesh
                geometry={headGeo}
                material={headMat}
                position={[sign * (ARM_REACH + 0.15), HEAD_Y - 0.18, 0]}
                rotation-z={sign * -0.16}
              />
            </group>
          );
        })
      )}
    </group>
  );
}

/* Flat-bottomed cumulus puff (unit shape ~4.8 wide × ~1.9 tall, baseline y=0),
   as in image.png — soft rounded humps on top, a straight bottom edge. */
function cloudShape() {
  const s = new THREE.Shape();
  s.moveTo(-2.4, 0);
  s.quadraticCurveTo(-2.55, 0.8, -1.75, 0.95); // left shoulder
  s.quadraticCurveTo(-1.55, 1.55, -0.85, 1.45); // hump 1
  s.quadraticCurveTo(-0.5, 1.9, 0.15, 1.75); // hump 2 (centre, tallest)
  s.quadraticCurveTo(0.7, 2.0, 1.2, 1.5); // hump 3
  s.quadraticCurveTo(1.65, 1.4, 1.8, 0.9); // right shoulder
  s.quadraticCurveTo(2.55, 0.8, 2.4, 0); // down to baseline
  s.lineTo(-2.4, 0); // flat bottom
  s.closePath();
  return s;
}

/* ══════════════════════════════════════════════════════
   Environment
   ══════════════════════════════════════════════════════ */
function Environment() {
  const skyShader = useMemo(
    () => ({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 colorTop;
        uniform vec3 colorBot;
        void main() {
          gl_FragColor = vec4(mix(colorBot, colorTop, vUv.y), 1.0);
        }
      `,
      uniforms: {
        colorTop: { value: new THREE.Color(C.skyTop) },
        colorBot: { value: new THREE.Color(C.skyBot) },
      },
    }),
    []
  );

  const cloudGeo = useMemo(() => new THREE.ShapeGeometry(cloudShape()), []);

  return (
    <group>
      <mesh position={[0, 100, -400]}>
        <planeGeometry args={[1600, 800]} />
        <shaderMaterial attach="material" args={[skyShader]} depthWrite={false} />
      </mesh>
      <group position={[0, 0, -350]}>
        {/* soft flat-bottomed cumulus, sitting in the sky above the skyline */}
        <mesh geometry={cloudGeo} position={[-152, 50, 0]} scale={[13, 9, 1]}><meshBasicMaterial color={C.cloud} /></mesh>
        <mesh geometry={cloudGeo} position={[-112, 40, 0]} scale={[8.5, 6, 1]}><meshBasicMaterial color={C.cloud} /></mesh>
        <mesh geometry={cloudGeo} position={[158, 48, 0]} scale={[-13, 9, 1]}><meshBasicMaterial color={C.cloud} /></mesh>
        <mesh geometry={cloudGeo} position={[190, 38, 0]} scale={[-7, 5, 1]}><meshBasicMaterial color={C.cloud} /></mesh>
      </group>
      <mesh position={[120, -2, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[200, 1000]} />
        <meshLambertMaterial color={C.water} />
      </mesh>
      <mesh position={[-120, -2, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[200, 1000]} />
        <meshLambertMaterial color={C.water} />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════
   Camera Rig
   ══════════════════════════════════════════════════════ */
function Rig({ reduce }: { reduce: boolean }) {
  const { camera, gl } = useThree();
  const base = useRef({ x: 0, y: 2.0, z: 135 });
  // tracked pointer offset (-1..1) + the time it last moved
  const ptr = useRef({ x: 0, y: 0, last: -1e9 });

  // Track the pointer on the WINDOW so the parallax responds anywhere on the
  // hero, and reset to centre when the cursor leaves the window — otherwise the
  // last offset sticks and the camera never returns to its starting position.
  useEffect(() => {
    if (reduce) return;
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ptr.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.current.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      ptr.current.last = performance.now();
    };
    const recenter = () => { ptr.current.last = -1e9; };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("mouseleave", recenter); // cursor leaves the page
    window.addEventListener("blur", recenter);         // tab/window loses focus
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", recenter);
      window.removeEventListener("blur", recenter);
    };
  }, [gl, reduce]);

  useFrame(() => {
    if (reduce) return;
    const cam = camera as THREE.PerspectiveCamera;
    const b = base.current;
    const p = ptr.current;
    // follow the pointer only while it's actively moving; once it leaves the
    // window or sits still, the target falls back to centre and the camera
    // eases home to its initial position.
    const active = performance.now() - p.last < 900;
    const tx = active ? p.x : 0;
    const ty = active ? p.y : 0;

    cam.position.x += (b.x + tx * 1.5 - cam.position.x) * 0.05;
    cam.position.y += (b.y + ty * 1.0 - cam.position.y) * 0.05;

    cam.lookAt(0, 28, 0);
  });

  return null;
}

export default function BridgeScene({ reduce = false }: { reduce?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Render only while the hero is actually on screen — a full-viewport WebGL
  // scene animating at 60fps behind ten scrolled-past sections drags the whole
  // page. R3F resumes cleanly when frameloop flips back to "always".
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) =>
      setFrameloop(e.isIntersecting ? "always" : "never"),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0 w-full h-full overflow-hidden pointer-events-auto">
      <Canvas
        frameloop={frameloop}
        dpr={[1, 2]}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
        camera={{ position: [0, 2.0, 135], fov: 40, near: 0.1, far: 800 }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[-30, 80, 50]} intensity={0.5} />
          <Environment />
          <Pylon />
          <Cables />
          <RoadSurface />
          <RoadLogos reduce={reduce} />
          <Danfo reduce={reduce} />
          <Barriers />
          <Lamps />
          <Rig reduce={reduce} />
        </Suspense>
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  );
}
