import {
  bboxOf,
  hexPrism,
  raisedText,
  ring,
  rotate,
  rotateZ,
  sitOnBed,
  subtract,
  translate,
  union,
  type Geom3,
} from "./geometry";
import { primitives } from "./jscad";
import {
  clamp,
  num,
  str,
  type ColorPart,
  type PrintAdvice,
  type Values,
} from "./types";

const { cuboid, cylinder } = primitives;

function n(values: Values, key: string, fallback: number, min: number, max: number) {
  return clamp(num(values, key, fallback), min, max);
}

function unionAll(parts: Geom3[]): Geom3 {
  if (parts.length === 1) return parts[0]!;
  let acc = parts[0]!;
  for (let i = 1; i < parts.length; i++) acc = union(acc, parts[i]!);
  return acc;
}

function punchAll(body: Geom3, punches: Geom3[]): Geom3 {
  if (!punches.length) return body;
  return subtract(body, unionAll(punches));
}

function brandMark(
  text: string,
  letterH: number,
  stroke: number,
  thick: number,
  gap: number,
): Geom3 | null {
  const chars = (text || "D3DD")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8)
    .split("");
  if (!chars.length) return null;
  const glyphs: Geom3[] = [];
  let x = 0;
  for (const ch of chars) {
    const g = raisedText(ch, letterH, stroke, thick);
    if (!g) {
      x += letterH * 0.62 + gap;
      continue;
    }
    const bb = bboxOf(g);
    glyphs.push(
      translate([x - bb.min[0], -(bb.min[1] + bb.max[1]) / 2, -bb.min[2]], g),
    );
    x += bb.size[0] + gap;
  }
  if (!glyphs.length) return null;
  const all = glyphs.length === 1 ? glyphs[0]! : union(glyphs);
  const bb = bboxOf(all);
  return translate(
    [-(bb.min[0] + bb.max[0]) / 2, -(bb.min[1] + bb.max[1]) / 2, -bb.min[2]],
    all,
  );
}

/** Senseo pads are ~70 mm. Basket inner ~76 mm. */
export function dryerDims(values: Values) {
  const pad = n(values, "pad", 70, 50, 90);
  const basketIR = pad / 2 + 3.2;
  const wall = 2.8;
  const basketOR = basketIR + wall;
  const gap = 0.45;
  const baseIR = basketOR + gap;
  const baseWall = 3.4;
  const baseOR = baseIR + baseWall;
  const basketH = n(values, "height", 108, 60, 180);
  const baseH = 28;
  const floorT = 3.0;
  const padH = 7.2;
  return {
    pad,
    basketIR,
    basketOR,
    wall,
    baseIR,
    baseOR,
    basketH,
    baseH,
    floorT,
    padH,
  };
}

function hexFloorHoles(rMax: number, t: number, f2f: number, pitch: number): Geom3[] {
  const punches: Geom3[] = [];
  const rowH = pitch * 0.8660254;
  const blank = hexPrism(f2f, t + 4);
  let row = 0;
  for (let y = -rMax; y <= rMax + 0.01; y += rowH) {
    const xOff = (row % 2) * (pitch / 2);
    row += 1;
    for (let x = -rMax; x <= rMax + 0.01; x += pitch) {
      const px = x + xOff;
      if (px * px + y * y > rMax * rMax) continue;
      punches.push(translate([px, y, -1], blank));
    }
  }
  return punches;
}

function hexAlongX(f2f: number, length: number): Geom3 {
  const r = f2f / Math.sqrt(3);
  const c = cylinder({
    radius: r,
    height: length,
    segments: 6,
    center: [0, 0, 0],
  });
  return rotate([0, Math.PI / 2, 0], rotateZ(Math.PI / 6, c));
}

/** Hex lattice on the cylinder. Prints as walls — no supports. */
function wallHexes(d: ReturnType<typeof dryerDims>): Geom3[] {
  const punches: Geom3[] = [];
  const f2f = 12.2;
  const cols = 12;
  const rows = 6;
  const z0 = 10;
  const z1 = d.basketH - 8;
  const midR = (d.basketIR + d.basketOR) / 2;
  const depth = d.wall + 8;
  const blank = hexAlongX(f2f, depth);
  for (let row = 0; row < rows; row++) {
    const z = z0 + ((z1 - z0) * (row + 0.5)) / rows;
    const rotOff = (row % 2) * (Math.PI / cols);
    for (let i = 0; i < cols; i++) {
      const a = rotOff + (i * 2 * Math.PI) / cols;
      punches.push(
        translate([Math.cos(a) * midR, Math.sin(a) * midR, z], rotateZ(a, blank)),
      );
    }
  }
  return punches;
}

function leakingBase(values: Values): Geom3 {
  const d = dryerDims(values);
  let g = cylinder({
    radius: d.baseOR,
    height: d.baseH,
    segments: 64,
    center: [0, 0, d.baseH / 2],
  });
  g = subtract(
    g,
    cylinder({
      radius: d.baseIR,
      height: d.baseH,
      segments: 64,
      center: [0, 0, d.floorT + d.baseH / 2],
    }),
  );

  const pads: Geom3[] = [];
  const padLen = 16;
  const padW = 10;
  const outerEnd = d.basketOR - 1.2;
  const padR = outerEnd - padLen / 2;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const cx = Math.cos(a) * padR;
    const cy = Math.sin(a) * padR;
    const pad = rotateZ(
      a,
      cuboid({
        size: [padLen, padW, d.padH],
        center: [0, 0, 0],
      }),
    );
    pads.push(translate([cx, cy, d.floorT + d.padH / 2], pad));
  }
  g = union(g, unionAll(pads));

  const mark = brandMark(str(values, "brand", "D3DD"), 9, 0.7, 1.15, 2.2);
  if (mark) g = subtract(g, translate([0, 0, d.floorT - 1.08], mark));
  return sitOnBed(g);
}

function padBasket(values: Values): Geom3 {
  const d = dryerDims(values);
  const floor = cylinder({
    radius: d.basketIR + 0.6,
    height: d.floorT,
    segments: 56,
    center: [0, 0, d.floorT / 2],
  });
  const wall = ring(d.basketOR, d.basketIR, d.basketH);
  const top = translate(
    [0, 0, d.basketH - 5],
    ring(d.basketOR + 0.4, d.basketIR - 0.4, 5),
  );
  let g = union(floor, wall, top);
  g = punchAll(g, wallHexes(d));
  g = punchAll(g, hexFloorHoles(d.basketIR - 4.5, d.floorT, 5.4, 9.0));
  return sitOnBed(g);
}

export function padDryer(values: Values): Geom3 | ColorPart[] {
  const part = str(values, "part", "kit");
  if (part === "base") return leakingBase(values);
  if (part === "basket") return padBasket(values);
  const base = leakingBase(values);
  const basket = padBasket(values);
  const gap = 12;
  const baseW = dryerDims(values).baseOR * 2;
  const basketW = dryerDims(values).basketOR * 2;
  return [
    {
      name: "base",
      color: "#c4b8a8",
      geom: translate([-(basketW / 2 + gap / 2), 0, 0], base),
    },
    {
      name: "basket",
      color: "#d4c8b6",
      geom: translate([baseW / 2 + gap / 2, 0, 0], basket),
    },
  ];
}

export function padDryerAdvice(values: Values): PrintAdvice {
  const d = dryerDims(values);
  const part = str(values, "part", "kit");
  const notes =
    part === "base"
      ? [
          "Part 1 — leaking base. Closed floor catches drips. D3DD recessed 1 mm.",
          "Four taller inside pads lift the basket for airflow. No lumps through the outer wall.",
        ]
      : part === "basket"
        ? [
            "Part 2 — pad holder. Hex lattice, no supports. Senseo pads (~70 mm) stack inside.",
            "Hex floor drains into the base. Stronger top and bottom rings than the voronoi original.",
          ]
        : [
            "Coffee pad dryer — both parts packed on the bed.",
            `Basket inner Ø${(d.basketIR * 2).toFixed(0)} mm for ${d.pad.toFixed(0)} mm Senseo pads.`,
            "Basket sits on the four pads inside the base. Water pools around D3DD.",
            "No supports. Print as they sit.",
          ];
  notes.push("0.20 mm layers, 3 walls, PETG if it lives by the machine.");
  return {
    layer: "0.20 mm",
    walls: "3 perimeters (1.26 mm)",
    infill: "15% gyroid",
    supports: "None",
    material: "PLA or PETG",
    notes,
  };
}
