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
    kerf: 0.55,
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

/** Pulp drains. Only skip a narrow strip where the lugs sit. */
function pulpHoles(d: ReturnType<typeof dims>, s: number): Geom3[] {
  const punches: Geom3[] = [];
  const holeR = 1.55 * s;
  const rows = 7;
  const cols = 16;
  const z0 = 6 * s;
  const z1 = d.sleeveH - 6 * s;
  const midR = (d.boreR + d.sleeveOR) / 2;
  const depth = d.sleeveOR - d.boreR + 6;
  const blank = cylinder({ radius: holeR, height: depth, segments: 10 });
  const alongX = rotate([0, Math.PI / 2, 0], blank);
  const lugA = Math.PI / 2;
  for (let row = 0; row < rows; row++) {
    const z = z0 + (Math.max(4, z1 - z0) * (row + 0.5)) / rows;
    const rotOff = (row % 2) * (Math.PI / cols);
    for (let i = 0; i < cols; i++) {
      const a = rotOff + (i * 2 * Math.PI) / cols;
      const da = Math.atan2(Math.sin(a - lugA), Math.cos(a - lugA));
      if (Math.abs(da) < 0.22) continue;
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

/**
 * Closed box clip: top, bottom and outer walls solid.
 * Open only toward the lugs so it slides on from the outside.
 */
function sleeveClip(values: Values): Geom3 {
  const s = kitScale(values);
  const d = dims(s);
  const wall = 3.0 * s;
  const cap = 2.8 * s;
  const innerX = 2 * d.lugT + 0.7 * s;
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
  let g = sleeveBody(values);
  const slit = cuboid({
    size: [Math.max(0.55, d.kerf), d.sleeveOR + d.lugOut + 12, d.sleeveH + 10],
    center: [0, (d.sleeveOR + d.lugOut + 12) / 2, d.sleeveH / 2],
  });
  g = subtract(g, slit);
  g = addLug(g, 1, d);
  g = addLug(g, -1, d);
  const txt = brandMark(labelOf(values), 6.2 * s, 0.6 * s, 1.15 * s, 1.8 * s);
  if (txt) g = subtract(g, translate([0, -d.sleeveOR * 0.55, -0.05], txt));
  g = sitOnBed(g);

  const clip = sitOnBed(sleeveClip(values));
  const sbb = bboxOf(g);
  const cbb = bboxOf(clip);
  const clipPlaced = translate([sbb.max[0] + 10 - cbb.min[0], 0, 0], clip);
  const groupMin = sbb.min[0];
  const groupMax = bboxOf(clipPlaced).max[0];
  const cx = (groupMin + groupMax) / 2;
  return [
    { name: "sleeve", color: "#c4b8a8", geom: translate([-cx, 0, 0], g) },
    { name: "clip", color: "#8a9aa8", geom: translate([-cx, 0, 0], clipPlaced) },
  ];
}

function sieveFloorHoles(rMax: number, holeR: number, pitch: number, h: number): Geom3[] {
  const punches: Geom3[] = [];
  const rowH = pitch * 0.8660254;
  const blank = cylinder({
    radius: holeR,
    height: h + 4,
    segments: 8,
    center: [0, 0, h / 2],
  });
  let row = 0;
  for (let y = -rMax; y <= rMax + 0.01; y += rowH) {
    const xOff = (row % 2) * (pitch / 2);
    row += 1;
    for (let x = -rMax; x <= rMax + 0.01; x += pitch) {
      const px = x + xOff;
      if (px * px + y * y > rMax * rMax) continue;
      punches.push(translate([px, y, 0], blank));
    }
  }
  return punches;
}

/**
 * Water sieve. Tight inside the sleeve bore, perforated floor so water
 * drops into the hex tray, short rim like a coffee sieve.
 */
function drainRing(values: Values): Geom3 {
  const s = kitScale(values);
  const d = dims(s);
  const or = d.boreR - 0.25;
  const floorT = 2.6 * s;
  const rimH = 7.2 * s;
  const rimW = 2.8 * s;
  const holeR = 1.65 * s;

  let g = cyl(or, floorT, floorT / 2, 64);
  g = union(g, translate([0, 0, floorT], ring(or, Math.max(0.8, or - rimW), rimH)));
  const rMax = Math.max(4, or - rimW - holeR - 0.5);
  g = punchAll(g, sieveFloorHoles(rMax, holeR, 7.2 * s, floorT));
  return sitOnBed(g);
}

/**
 * Hex drip tray. Closed floor so water is stored, four pads the sleeve
 * foot sits on, outer lips on those pads so the sleeve stays located
 * while you press.
 */
function plate(values: Values): Geom3 {
  const s = kitScale(values);
  const d = dims(s);
  const floorH = 2.8 * s;
  const rimH = 14 * s;
  const padH = 5.2 * s;
  const rimW = 8.5 * s;

  const outer = hexPrism(d.plateF2F, rimH);
  const well = translate([0, 0, floorH], hexPrism(d.plateF2F - 2 * rimW, rimH + 2));
  let g = subtract(outer, well);

  const padLen = 18 * s;
  const padW = 16 * s;
  const padR = d.sleeveOR - 0.6 * s;
  const footOR = d.sleeveOR + 0.8 * s;
  const lipIR = footOR + 0.3;
  const lipOR = lipIR + 2.6 * s;
  const lipH = 5.4 * s;
  const pads: Geom3[] = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const pad = cuboid({
      size: [padLen, padW, padH],
      center: [padR, 0, floorH + padH / 2],
    });
    let lip = translate([0, 0, floorH], ring(lipOR, lipIR, padH + lipH));
    lip = intersect(
      lip,
      cuboid({
        size: [lipOR + 6, padW, padH + lipH + 2],
        center: [(lipIR + lipOR) / 2, 0, floorH + (padH + lipH) / 2],
      }),
    );
    pads.push(rotateZ(a, union(pad, lip)));
  }
  g = union(g, unionAll(pads));

  const txt = brandMark(labelOf(values), 7.2 * s, 0.58 * s, 1.15 * s, 2.2 * s);
  if (txt) g = subtract(g, translate([0, 0, floorH - 1.05 * s], txt));
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
            "Part 2 of 4 — one sleeve plus clip. Ring is a single piece.",
            "Only the clip side has a ~0.55 mm slit. Lugs sit on that gap; clip slides on to close it.",
            "Print standing. No supports.",
          ]
        : part === "plate"
          ? [
              "Part 3 of 4 — hex drip tray. Closed floor, water stays in the well.",
              "Four pads with a small outer lip so the sleeve stays locked while you press.",
              `${mark} is recessed in the centre. No through-holes — the plate is the reservoir.`,
              "Tell me if the pads and tray look right. Then we do the drain ring.",
            ]
          : part === "ring"
            ? [
                "Part 4 of 4 — water sieve. Tight inside the sleeve (0.25 mm clearance).",
                "Perforated floor like the sieve photo. Water drops through into the hex tray.",
                "Short rim. Sits on the four plate pads. No supports.",
                "Tell me if the fit and holes look right.",
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
