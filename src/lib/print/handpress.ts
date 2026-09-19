import {
  bboxOf,
  cylAlong,
  hexPrism,
  holeZ,
  raisedText,
  ring,
  rotate,
  sitOnBed,
  subtract,
  translate,
  union,
  intersect,
  type Geom3,
} from "./geometry";
import { primitives, transforms, hulls } from "./jscad";
import { clamp, num, str, type ColorPart, type PrintAdvice, type Values } from "./types";

const { cuboid, cylinder, cylinderElliptic } = primitives;
const { rotateZ } = transforms;
const { hull } = hulls;

function n(values: Values, key: string, fallback: number, min: number, max: number) {
  return clamp(num(values, key, fallback), min, max);
}

function cyl(r: number, h: number, zc: number, segs = 48): Geom3 {
  return cylinder({
    radius: Math.max(0.4, r),
    height: Math.max(0.4, h),
    segments: segs,
    center: [0, 0, zc],
  });
}

function kitScale(values: Values) {
  return n(values, "scale", 114, 80, 140) / 100;
}

function labelOf(values: Values) {
  const t = str(values, "brand", "D3DD").trim().toUpperCase() || "D3DD";
  return t.slice(0, 8);
}

/**
 * Shared millimetre stack. Plunger, sleeve bore, drain ring and plate
 * locator all come from here so the press actually fits and drains.
 */
function dims(s: number) {
  const plungerR = 40.5 * s;
  const plungerH = 9 * s;
  const slide = 0.6 * s;
  const boreR = plungerR + slide;
  const sleeveWall = 5.6 * s;
  const sleeveOR = boreR + sleeveWall;
  const sleeveH = 58 * s;
  const collar = 3.4 * s;
  const collarWall = 2.6 * s;
  const ringH = 34 * s;
  const floorT = 2.6 * s;
  const flangeR = sleeveOR + 5.6 * s;
  const plateF2F = 131.7 * s;
  const plateT = 7.2 * s;
  const ribH = 3.4 * s;
  const ribW = 4.4 * s;
  const fenceGap = 0.45 * s;
  const fenceIR = flangeR + fenceGap;
  const fenceOR = fenceIR + 3.8 * s;
  const holePitch = 36 * s;
  return {
    plungerR,
    plungerH,
    slide,
    boreR,
    sleeveWall,
    sleeveOR,
    sleeveH,
    collar,
    collarWall,
    ringH,
    floorT,
    flangeR,
    plateF2F,
    plateT,
    ribH,
    ribW,
    fenceIR,
    fenceOR,
    holePitch,
    neckR: 17.6 * s,
    shaftH: 34 * s,
    blendH: 16 * s,
    barL: 96 * s,
    barW: 28 * s,
    barH: 12 * s,
    lugT: 5.4 * s,
    lugOut: 16 * s,
    lugH: 42 * s,
    kerf: 0.35,
  };
}

/** Capsule / stadium bar in XY, extruded in Z — original T-handle. */
function stadium(length: number, width: number, height: number, zc: number): Geom3 {
  const r = width / 2;
  const mid = Math.max(0.4, length - width);
  return union(
    cuboid({ size: [mid, width, height], center: [0, 0, zc] }),
    cylinder({ radius: r, height, segments: 28, center: [-mid / 2, 0, zc] }),
    cylinder({ radius: r, height, segments: 28, center: [mid / 2, 0, zc] }),
  );
}

/**
 * One letter at a time with a hard gap after the expanded stroke,
 * so D3DD never collides the way vectorText+union did.
 */
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

/** Radial wall holes, staggered by row, so water can leave at every height. */
function wallHoles(
  innerR: number,
  outerR: number,
  holeR: number,
  rows: number,
  cols: number,
  z0: number,
  z1: number,
): Geom3[] {
  const punches: Geom3[] = [];
  const midR = (innerR + outerR) / 2;
  const depth = outerR - innerR + 8;
  const span = Math.max(4, z1 - z0);
  for (let row = 0; row < rows; row++) {
    const z = z0 + (span * (row + 0.5)) / rows;
    const rotOff = (row % 2) * (Math.PI / cols);
    for (let i = 0; i < cols; i++) {
      const a = rotOff + (i * 2 * Math.PI) / cols;
      const punch = rotateZ(a, cylAlong("x", holeR, depth, [0, 0, 0]));
      punches.push(translate([Math.cos(a) * midR, Math.sin(a) * midR, z], punch));
    }
  }
  return punches;
}

function floorHoles(holeR: number, floorT: number, rings: { r: number; n: number }[]): Geom3[] {
  const punches: Geom3[] = [holeZ(holeR * 1.15, floorT, [0, 0], -0.6)];
  for (const ringSpec of rings) {
    for (let i = 0; i < ringSpec.n; i++) {
      const a = (i * 2 * Math.PI) / ringSpec.n + (ringSpec.n === 6 ? 0 : Math.PI / ringSpec.n);
      punches.push(
        holeZ(holeR, floorT, [Math.cos(a) * ringSpec.r, Math.sin(a) * ringSpec.r], -0.6),
      );
    }
  }
  return punches;
}

/** Press ram: plunger on the bed, T-bar on top, hull-blended into the shaft. */
function handle(values: Values): Geom3 {
  const s = kitScale(values);
  const d = dims(s);
  const mark = labelOf(values);

  let g = cyl(d.plungerR - 0.55 * s, 1.2 * s, 0.6 * s);
  g = union(g, cyl(d.plungerR, d.plungerH, d.plungerH / 2));
  const shaftTop = d.plungerH + d.shaftH;
  g = union(
    g,
    cylinderElliptic({
      height: d.shaftH,
      startRadius: [d.plungerR * 0.94, d.plungerR * 0.94],
      endRadius: [d.neckR, d.neckR],
      segments: 40,
      center: [0, 0, d.plungerH + d.shaftH / 2],
    }),
  );

  const neck = cyl(d.neckR, 2.2 * s, shaftTop - 0.4 * s, 36);
  const gripZ = shaftTop + d.blendH + d.barH / 2;
  const grip = stadium(d.barL, d.barW, d.barH, gripZ);
  g = union(g, hull(neck, grip));

  const sink = 1.1;
  const txt = brandMark(mark, 7.2 * s, 0.58 * s, sink + 0.4, 2.2 * s);
  if (txt) {
    const barTop = shaftTop + d.blendH + d.barH;
    g = subtract(g, translate([0, 0, barTop - sink], txt));
  }
  return sitOnBed(g);
}

function packColorParts(parts: ColorPart[], gap = 8): ColorPart[] {
  let x = 0;
  const placed: ColorPart[] = [];
  for (const p of parts) {
    const g = sitOnBed(p.geom);
    const bb = bboxOf(g);
    placed.push({ ...p, geom: translate([x - bb.min[0], 0, 0], g) });
    x += bb.size[0] + gap;
  }
  const minX = bboxOf(placed[0]!.geom).min[0];
  const maxX = bboxOf(placed[placed.length - 1]!.geom).max[0];
  const cx = (minX + maxX) / 2;
  return placed.map((p) => ({ ...p, geom: translate([-cx, 0, 0], p.geom) }));
}

/** Pulp drains. Skip the lug seam (+Y) and the hinge seam (−Y). */
function pulpHoles(d: ReturnType<typeof dims>, s: number): Geom3[] {
  const punches: Geom3[] = [];
  const holeR = 1.55 * s;
  const rows = 6;
  const cols = 14;
  const z0 = 7 * s;
  const z1 = d.sleeveH - 7 * s;
  const midR = (d.boreR + d.sleeveOR) / 2;
  const depth = d.sleeveOR - d.boreR + 6;
  const blank = cylinder({ radius: holeR, height: depth, segments: 10 });
  const alongX = rotate([0, Math.PI / 2, 0], blank);
  for (let row = 0; row < rows; row++) {
    const z = z0 + (Math.max(4, z1 - z0) * (row + 0.5)) / rows;
    const rotOff = (row % 2) * (Math.PI / cols);
    for (let i = 0; i < cols; i++) {
      const a = rotOff + (i * 2 * Math.PI) / cols;
      if (Math.abs(Math.cos(a)) < 0.42) continue;
      punches.push(translate([Math.cos(a) * midR, Math.sin(a) * midR, z], rotateZ(a, alongX)));
    }
  }
  return punches;
}

function sleeveBody(values: Values): Geom3 {
  const s = kitScale(values);
  const d = dims(s);
  let g = ring(d.sleeveOR, d.boreR, d.sleeveH);
  g = union(g, ring(d.sleeveOR + 0.8 * s, d.boreR, 3.4 * s));
  return punchAll(g, pulpHoles(d, s));
}

function cutHalf(body: Geom3, side: 1 | -1, d: ReturnType<typeof dims>): Geom3 {
  const cutW = 240;
  return subtract(
    body,
    cuboid({
      size: [cutW, cutW, d.sleeveH + 10],
      center: [side * -(cutW / 2 + d.kerf / 2), 0, d.sleeveH / 2],
    }),
  );
}

function addLug(half: Geom3, side: 1 | -1, d: ReturnType<typeof dims>): Geom3 {
  const lug = cuboid({
    size: [d.lugT, d.lugOut, d.lugH],
    center: [
      side * (d.lugT / 2 + d.kerf / 2),
      d.sleeveOR + d.lugOut / 2,
      d.sleeveH * 0.5,
    ],
  });
  return union(half, lug);
}

/** Print-in-place knuckles on the −Y seam. Pin lives on half A. */
function addHinge(half: Geom3, side: 1 | -1, d: ReturnType<typeof dims>, s: number): Geom3 {
  const n = 5;
  const z0 = 4 * s;
  const z1 = d.sleeveH - 4 * s;
  const span = z1 - z0;
  const knuckleH = span / n - 0.4;
  const r = 5.2 * s;
  const pinR = 2.15 * s;
  const hx = 0;
  const hy = -(d.sleeveOR + r * 0.5);
  const bits: Geom3[] = [];
  for (let i = 0; i < n; i++) {
    const ownerA = i % 2 === 0;
    if (ownerA && side !== 1) continue;
    if (!ownerA && side !== -1) continue;
    const zc = z0 + (i + 0.5) * (span / n);
    let k = cylinder({ radius: r, height: knuckleH, segments: 20, center: [hx, hy, zc] });
    k = intersect(
      k,
      cuboid({ size: [80, 80, knuckleH + 2], center: [side * 40, hy, zc] }),
    );
    if (!ownerA) {
      k = subtract(
        k,
        cylinder({
          radius: pinR + 0.4,
          height: knuckleH + 2,
          segments: 16,
          center: [hx, hy, zc],
        }),
      );
    }
    bits.push(k);
  }
  if (side === 1) {
    bits.push(
      cylinder({
        radius: pinR,
        height: span - 0.8,
        segments: 16,
        center: [hx, hy, (z0 + z1) / 2],
      }),
    );
  }
  bits.push(
    cuboid({
      size: [7.5 * s, r + 5 * s, span * 0.88],
      center: [side * 3.8 * s, hy + r * 0.25, (z0 + z1) / 2],
    }),
  );
  return union(half, unionAll(bits));
}

/**
 * Closed box clip: top, bottom and outer walls solid.
 * Open only toward the lugs so it slides on from the outside.
 */
function sleeveClip(values: Values): Geom3 {
  const s = kitScale(values);
  const d = dims(s);
  const wall = 3.0 * s;
  const cap = 2.8 * s;
  const innerX = 2 * d.lugT + 0.5 * s;
  const innerY = d.lugOut + 0.5 * s;
  const h = d.lugH - 0.6 * s;
  const outerX = innerX + 2 * wall;
  const outerY = innerY + wall;
  let g = cuboid({ size: [outerX, outerY, h], center: [0, wall / 2, h / 2] });
  g = subtract(
    g,
    cuboid({
      size: [innerX, innerY + 8 * s, Math.max(4, h - 2 * cap)],
      center: [0, -2 * s, h / 2],
    }),
  );
  return g;
}

function sleeveParts(values: Values): ColorPart[] {
  const s = kitScale(values);
  const d = dims(s);
  const body = sleeveBody(values);
  let a = cutHalf(body, 1, d);
  let b = cutHalf(body, -1, d);
  a = addLug(a, 1, d);
  b = addLug(b, -1, d);
  a = addHinge(a, 1, d, s);
  b = addHinge(b, -1, d, s);
  const txt = brandMark(labelOf(values), 6.2 * s, 0.6 * s, 1.15 * s, 1.8 * s);
  if (txt) a = subtract(a, translate([d.sleeveOR * 0.55, 0, -0.05], txt));
  return packColorParts(
    [
      { name: "sleeve", color: "#c4b8a8", geom: union(a, b) },
      { name: "clip", color: "#8a9aa8", geom: sleeveClip(values) },
    ],
    10,
  );
}

/**
 * Drain cage that the sleeve (or grounds pot) sits in, and that locates
 * on the hex plate. Perforated floor + wall holes at every height.
 */
function drainRing(values: Values): Geom3 {
  const s = kitScale(values);
  const d = dims(s);
  const wallHoleR = Math.min(3.1 * s, n(values, "hole", 7.5, 4, 16) * s * 0.4);

  const floor = cyl(d.flangeR, d.floorT, d.floorT / 2, 56);
  const wall = ring(d.sleeveOR, d.boreR, d.ringH);
  const ledge = cyl(d.sleeveOR, 2.4 * s, d.ringH - d.collar - 1.2 * s, 48);
  const collarInner = d.sleeveOR + 0.4 * s;
  const collarOuter = collarInner + d.collarWall;
  const collar = ring(collarOuter, collarInner, d.collar);
  let g = union(floor, wall, ledge, translate([0, 0, d.ringH - d.collar], collar));

  const wallPunch = wallHoles(
    d.boreR,
    d.sleeveOR,
    wallHoleR,
    4,
    12,
    d.floorT + wallHoleR + 1.2 * s,
    d.ringH - d.collar - wallHoleR - 1.4 * s,
  );
  const floorPunch = floorHoles(2.7 * s, d.floorT, [
    { r: 14 * s, n: 6 },
    { r: 24 * s, n: 10 },
    { r: 34 * s, n: 14 },
  ]);
  g = punchAll(g, [...wallPunch, ...floorPunch]);
  return sitOnBed(g);
}

/**
 * Hex drain plate. Four round holes at 45°, radial ribs so water can
 * run under the puck, fence that locates the drain-ring flange.
 */
function plate(values: Values): Geom3 {
  const s = kitScale(values);
  const d = dims(s);
  const drainR = n(values, "hole", 7.5, 4, 16) * s * 1.15;

  let g = hexPrism(d.plateF2F, d.plateT);

  const ribs: Geom3[] = [];
  const ribLen = d.flangeR - 8 * s;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const rib = cuboid({
      size: [ribLen, d.ribW, d.ribH],
      center: [8 * s + ribLen / 2, 0, d.plateT + d.ribH / 2],
    });
    ribs.push(rotateZ(a, rib));
  }
  g = union(g, unionAll(ribs));

  const fence = ring(d.fenceOR, d.fenceIR, d.ribH + d.floorT * 0.7);
  g = union(g, translate([0, 0, d.plateT], fence));

  const holePunches: Geom3[] = [holeZ(6.2 * s, d.plateT + d.ribH, [0, 0], -0.5)];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    holePunches.push(
      holeZ(drainR, d.plateT + d.ribH, [Math.cos(a) * d.holePitch, Math.sin(a) * d.holePitch], -0.5),
    );
  }
  g = punchAll(g, holePunches);
  return sitOnBed(g);
}

function container(values: Values): Geom3 {
  const s = kitScale(values);
  const d = dims(s);
  const h = 44 * s;
  const wall = 1.8 * s;
  let g = ring(d.sleeveOR, d.sleeveOR - wall, h);
  g = union(g, cyl(d.sleeveOR, 2.2 * s, 1.1 * s));
  const holeR = n(values, "hole", 6, 3, 12) * s * 0.85;
  const punches = wallHoles(d.sleeveOR - wall, d.sleeveOR, holeR, 2, 8, 10 * s, h * 0.7);
  g = punchAll(g, punches);
  return sitOnBed(g);
}

function lid(values: Values): Geom3 {
  const s = kitScale(values);
  const d = dims(s);
  const inner = d.sleeveOR - 2.2 * s;
  const h = 14 * s;
  const top = 2.2 * s;
  let g = cyl(d.sleeveOR, top, top / 2);
  g = union(g, translate([0, 0, top], ring(d.sleeveOR, inner, h - top)));
  g = union(g, cyl(16 * s, 4 * s, h + 2 * s));
  return sitOnBed(g);
}

function spatula(values: Values): Geom3 {
  const s = kitScale(values);
  const blade = cuboid({ size: [36 * s, 22 * s, 2 * s], center: [8 * s, 0, 1 * s] });
  const grip = cuboid({ size: [22 * s, 10 * s, 2 * s], center: [-18 * s, 0, 1 * s] });
  return sitOnBed(union(blade, grip));
}

export function pressPrintParts(values: Values): ColorPart[] {
  return [
    { name: "handle", color: "#d9cfc3", geom: handle(values) },
    ...sleeveParts(values),
    { name: "drain-ring", color: "#9aa7b2", geom: drainRing(values) },
    { name: "hex-plate", color: "#b7c4b1", geom: plate(values) },
  ];
}

export function handPress(values: Values): Geom3 | ColorPart[] {
  const part = str(values, "part", "handle");
  switch (part) {
    case "sleeve":
      return sleeveParts(values);
    case "plate":
      return plate(values);
    case "ring":
      return drainRing(values);
    case "container":
      return container(values);
    case "lid":
      return lid(values);
    case "spatula":
      return spatula(values);
    default:
      return handle(values);
  }
}

export function handPressAdvice(values: Values): PrintAdvice {
  const s = kitScale(values);
  const part = str(values, "part", "handle");
  const d = dims(s);
  const mark = labelOf(values);
  const notes =
    part === "handle"
      ? [
          "Part 1 of 4 — handle only. T-bar on top, blended into the shaft. No hang hole.",
          `${mark} is recessed 1 mm into the bar, letters spaced.`,
          `Grip ${d.barW.toFixed(0)} × ${d.barH.toFixed(0)} mm, plunger Ø${(d.plungerR * 2).toFixed(1)} mm.`,
          "Tell me if this grip feels right. Then we do the sleeve.",
        ]
      : part === "sleeve"
        ? [
            "Part 2 of 4 — two pieces: hinged sleeve + one clip.",
            "Halves are joined on one side (print-in-place hinge). One pair of long lugs on the other.",
            "Clip is a closed box (top and bottom solid) that slides onto the lugs.",
            "More, larger drain holes (Ø3.5 mm) so water leaves the cardboard pulp.",
            "Tell me if the hinge, lugs and clip look right. Then we do the hex plate.",
          ]
        : part === "plate"
          ? [
              "Part 3 of 4 — hex plate only. Ribs + four round drain holes + locating fence.",
            ]
          : part === "ring"
            ? [
                "Part 4 of 4 — drain ring only. Cage with holes at every height. Sleeve drops into the collar.",
              ]
            : [`Printing the ${part}.`];
  if (s > 1.001) {
    notes.push(`Scaled ${(s * 100).toFixed(0)}%.`);
  }
  notes.push("0.20 mm layers, 3 walls, no supports. PETG if the mix is wet.");
  return {
    layer: "0.20 mm",
    walls: "3 perimeters (1.26 mm)",
    infill: "25% gyroid",
    supports: "None",
    material: "PLA or PETG",
    notes,
  };
}

export const KIT_STL: Record<string, { preview: string; full: string }> = {};
