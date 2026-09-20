import {
  bboxOf,
  hexPrism,
  raisedText,
  rotate,
  sitOnBed,
  subtract,
  translate,
  union,
  type Geom3,
} from "./geometry";
import { primitives } from "./jscad";
import { clamp, num, str, type PrintAdvice, type Values } from "./types";

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

export function cardboardDims(values: Values) {
  const innerL = n(values, "innerL", 140, 40, 240);
  const innerW = n(values, "innerW", 70, 30, 180);
  const wall = n(values, "wall", 5, 2.4, 12);
  const h = n(values, "height", 50, 24, 140);
  const holeR = n(values, "hole", 1.9, 0.8, 4);
  const outerL = innerL + 2 * wall;
  const outerW = innerW + 2 * wall;
  const sieveFit = 0.5;
  const sieveRimW = 4;
  const sieveWellL = outerL + sieveFit;
  const sieveWellW = outerW + sieveFit;
  return {
    innerL,
    innerW,
    wall,
    h,
    holeR,
    outerL,
    outerW,
    sieveFit,
    sieveRimW,
    sieveWellL,
    sieveWellW,
    sieveOuterL: sieveWellL + 2 * sieveRimW,
    sieveOuterW: sieveWellW + 2 * sieveRimW,
  };
}

function slimHole(axis: "x" | "y", radius: number, length: number): Geom3 {
  let c = cylinder({ radius, height: length, segments: 10, center: [0, 0, 0] });
  if (axis === "y") c = rotate([Math.PI / 2, 0, 0], c);
  else c = rotate([0, Math.PI / 2, 0], c);
  return c;
}

/** Side drains. Skip the bottom ledge and the corners. */
function sideHoles(d: ReturnType<typeof cardboardDims>): Geom3[] {
  const punches: Geom3[] = [];
  const rows = 3;
  const z0 = d.holeR + 5;
  const z1 = d.h - d.holeR - 5;
  const alongY = slimHole("y", d.holeR, d.outerW + 8);
  const alongX = slimHole("x", d.holeR, d.outerL + 8);

  const longN = 9;
  const shortN = 4;
  for (let row = 0; row < rows; row++) {
    const z = z0 + ((z1 - z0) * (row + 0.5)) / rows;
    const xOff = (row % 2) * 0.5;
    for (let i = 0; i < longN; i++) {
      const x = ((i + 0.5 + xOff) / longN - 0.5) * (d.innerL - 16);
      punches.push(translate([x, 0, z], alongY));
    }
    const yOff = (row % 2) * 0.5;
    for (let i = 0; i < shortN; i++) {
      const y = ((i + 0.5 + yOff) / shortN - 0.5) * (d.innerW - 14);
      punches.push(translate([0, y, z], alongX));
    }
  }
  return punches;
}

function sleeve(values: Values): Geom3 {
  const d = cardboardDims(values);
  let g = cuboid({ size: [d.outerL, d.outerW, d.h], center: [0, 0, d.h / 2] });
  g = subtract(
    g,
    cuboid({ size: [d.innerL, d.innerW, d.h + 4], center: [0, 0, d.h / 2] }),
  );
  g = punchAll(g, sideHoles(d));
  return sitOnBed(g);
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

function hexFloorHoles(L: number, W: number, t: number, f2f: number, pitch: number): Geom3[] {
  const punches: Geom3[] = [];
  const rowH = pitch * 0.8660254;
  const rMaxX = L / 2 - f2f - 3;
  const rMaxY = W / 2 - f2f - 3;
  const blank = hexPrism(f2f, t + 4);
  let row = 0;
  for (let y = -rMaxY; y <= rMaxY + 0.01; y += rowH) {
    const xOff = (row % 2) * (pitch / 2);
    row += 1;
    for (let x = -rMaxX; x <= rMaxX + 0.01; x += pitch) {
      const px = x + xOff;
      if (Math.abs(px) > rMaxX) continue;
      punches.push(translate([px, y, -1], blank));
    }
  }
  return punches;
}

/**
 * I-beam stamp: solid top to push, narrow stem, hex-drilled foot.
 * 0.5 mm per side so it slides in the sleeve.
 */
function stamp(values: Values): Geom3 {
  const d = cardboardDims(values);
  const gap = 0.5;
  const L = d.innerL - 2 * gap;
  const W = d.innerW - 2 * gap;
  const plateT = 8;
  const topH = 12;
  const totalH = 44;
  const stemW = Math.min(24, W * 0.36);
  const stemH = totalH - topH - plateT;

  const plate = cuboid({ size: [L, W, plateT], center: [0, 0, plateT / 2] });
  const stem = cuboid({ size: [L, stemW, stemH], center: [0, 0, plateT + stemH / 2] });
  const top = cuboid({ size: [L, W, topH], center: [0, 0, plateT + stemH + topH / 2] });
  let g = union(plate, stem, top);
  g = punchAll(g, hexFloorHoles(L, W, plateT, 5.6, 9.2));

  const mark = brandMark(str(values, "brand", "D3DD"), 10, 0.72, 1.15, 2.4);
  if (mark) g = subtract(g, translate([0, 0, totalH - 1.12], mark));
  return sitOnBed(g);
}

/**
 * Water sieve the sleeve drops into. Well is 0.5 mm over the sleeve
 * outside (5 mm wall on both sides → 150 × 80, well 150.5 × 80.5).
 */
function sieve(values: Values): Geom3 {
  const d = cardboardDims(values);
  const floorT = 3.2;
  const rimH = 8;
  const wellL = d.sieveWellL;
  const wellW = d.sieveWellW;
  const outerL = d.sieveOuterL;
  const outerW = d.sieveOuterW;

  let g = cuboid({
    size: [outerL, outerW, floorT + rimH],
    center: [0, 0, (floorT + rimH) / 2],
  });
  g = subtract(
    g,
    cuboid({
      size: [wellL, wellW, rimH + 2],
      center: [0, 0, floorT + (rimH + 2) / 2],
    }),
  );
  g = punchAll(g, hexFloorHoles(wellL - 4, wellW - 4, floorT, 5.6, 9.2));
  return sitOnBed(g);
}

/**
 * Closed drip tray under the sieve. Four corner pads with L-lips so
 * the sieve stays locked while you press. Extra gutter around the sieve
 * catches water from the sleeve side holes.
 */
function tray(values: Values): Geom3 {
  const d = cardboardDims(values);
  const floorH = 3.0;
  const rimH = 16;
  const padH = 5.2;
  const lipH = 6.0;
  const lipT = 3.2;
  const rimW = 8;
  const gutterX = 12;
  const gutterY = 10;
  const wellL = d.sieveOuterL + 2 * gutterX + 0.5;
  const wellW = d.sieveOuterW + 2 * gutterY + 0.5;
  const outerL = wellL + 2 * rimW;
  const outerW = wellW + 2 * rimW;

  let g = cuboid({ size: [outerL, outerW, rimH], center: [0, 0, rimH / 2] });
  g = subtract(
    g,
    cuboid({
      size: [wellL, wellW, rimH + 2],
      center: [0, 0, floorH + (rimH + 2) / 2],
    }),
  );

  const padL = 22;
  const padD = 16;
  const lipInnerX = d.sieveOuterL / 2 + 0.25;
  const lipInnerY = d.sieveOuterW / 2 + 0.25;
  const pads: Geom3[] = [];
  const corners: [number, number][] = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (const [sx, sy] of corners) {
    const cx = sx * (lipInnerX - padL / 2);
    const cy = sy * (lipInnerY - padD / 2);
    const pad = cuboid({
      size: [padL, padD, padH],
      center: [cx, cy, floorH + padH / 2],
    });
    const lipX = cuboid({
      size: [lipT, padD + lipT, padH + lipH],
      center: [
        sx * (lipInnerX + lipT / 2),
        cy + sy * (lipT / 2),
        floorH + (padH + lipH) / 2,
      ],
    });
    const lipY = cuboid({
      size: [padL, lipT, padH + lipH],
      center: [cx, sy * (lipInnerY + lipT / 2), floorH + (padH + lipH) / 2],
    });
    pads.push(union(pad, lipX, lipY));
  }
  g = union(g, unionAll(pads));

  const mark = brandMark(str(values, "brand", "D3DD"), 10, 0.72, 1.15, 2.4);
  if (mark) g = subtract(g, translate([0, 0, floorH - 1.08], mark));
  return sitOnBed(g);
}

export function cardboardPress(values: Values): Geom3 {
  const part = str(values, "part", "sleeve");
  switch (part) {
    case "stamp":
      return stamp(values);
    case "sieve":
      return sieve(values);
    case "tray":
      return tray(values);
    default:
      return sleeve(values);
  }
}

export function cardboardPressAdvice(values: Values): PrintAdvice {
  const d = cardboardDims(values);
  const part = str(values, "part", "sleeve");
  const notes =
    part === "sleeve"
      ? [
          "Part 1 of 4 — sleeve only. Rectangular tube, open top and bottom.",
          `Inside ${d.innerL.toFixed(0)} × ${d.innerW.toFixed(0)} mm. Walls ${d.wall.toFixed(1)} mm. Height ${d.h.toFixed(0)} mm.`,
          "Extra side holes for water. Clean through-tube — no inner lip.",
          "Tell me if this box looks right. Then we do the stamp.",
        ]
      : part === "stamp"
        ? [
            "Part 2 of 4 — stamp only. Same I-beam as your 3MF, sized to slide in the sleeve.",
            `Foot ${ (d.innerL - 1).toFixed(0) } × ${ (d.innerW - 1).toFixed(0) } mm (0.5 mm gap each side).`,
            `${str(values, "brand", "D3DD")} is recessed 1 mm into the pushing face, letters spaced.`,
            "Hex holes through the foot so water leaves while you press.",
            "Tell me if this stamp looks right. Then we do the sieve.",
          ]
        : part === "sieve"
          ? [
              "Part 3 of 4 — drain sieve. Sleeve drops into it from above.",
              `Well ${ (d.outerL + 0.5).toFixed(1) } × ${ (d.outerW + 0.5).toFixed(1) } mm — 0.5 mm over the sleeve outside (${d.outerL.toFixed(0)} × ${d.outerW.toFixed(0)}).`,
              "Hex holes in the floor. Short outer rim locates the sleeve.",
              "Tell me if the fit and holes look right. Then we do the drainage tray.",
            ]
          : part === "tray"
            ? [
                "Part 4 of 4 — drainage tray. Closed floor, water stays in the well.",
                "Four corner pads with L-lips. Sieve drops in snug; extra gutter catches sleeve side-holes.",
                `${str(values, "brand", "D3DD")} is recessed in the centre.`,
                "Tell me if the pads and tray look right.",
              ]
            : [`${part} is next.`];
  notes.push("0.20 mm layers, 3 walls, no supports. PETG if the mix is wet.");
  return {
    layer: "0.20 mm",
    walls: "3 perimeters (1.26 mm)",
    infill: "20% gyroid",
    supports: "None",
    material: "PLA or PETG",
    notes,
  };
}
