import {
  bboxOf,
  circle2,
  extrude,
  poly2,
  subtract,
  translate,
  union,
  type Geom3,
} from "./geometry";
import { primitives } from "./jscad";
import {
  bool,
  clamp,
  num,
  P2S,
  str,
  type ColorPart,
  type PrintAdvice,
  type Values,
} from "./types";

const { cylinder } = primitives;

/** Official press-kit orange and grey. True white for the M. */
export const XMR_ORANGE = "#FF6600";
export const XMR_GREY = "#4C4C4C";
export const XMR_WHITE = "#FFFFFF";

type Pt = [number, number];

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return [
    uu * u * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + tt * t * p3[0],
    uu * u * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + tt * t * p3[1],
  ];
}

function sampleCubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps: number, skipStart = true): Pt[] {
  const out: Pt[] = [];
  const start = skipStart ? 1 : 0;
  for (let i = start; i <= steps; i++) out.push(bezier(p0, p1, p2, p3, i / steps));
  return out;
}

function closeEnough(a: Pt, b: Pt) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
}

function dedupe(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || !closeEnough(last, p)) out.push(p);
  }
  if (out.length > 2 && closeEnough(out[0]!, out[out.length - 1]!)) out.pop();
  return out;
}

/**
 * Official Monero symbol, traced from the Simple Icons / press-kit mark
 * on a 24×24 viewBox (circle diameter 24, centre 12,12, SVG Y-down).
 */
function orangeSvg(steps = 16): Pt[] {
  const pts: Pt[] = [[12, 0]];
  pts.push(
    ...sampleCubic([12, 0], [5.365, 0], [0, 5.373], [0, 12.015], steps, true),
    ...sampleCubic([0, 12.015], [0, 13.35], [0.228, 14.622], [0.618, 15.825], 8, true),
    [4.195, 15.825],
    [4.195, 5.729],
    [12, 13.545],
    [19.805, 5.73],
    [19.805, 15.825],
    [23.382, 15.825],
    ...sampleCubic([23.382, 15.825], [23.771, 14.622], [24, 13.35], [24, 12.015], 8, true),
    ...sampleCubic([24, 12.015], [24, 5.375], [18.635, 0], [12, 0], steps, true),
  );
  return dedupe(pts);
}

function greySvg(steps = 16): Pt[] {
  const pts: Pt[] = [
    [10.212, 15.307],
    [6.795, 11.886],
    [6.795, 18.237],
    [1.758, 18.237],
  ];
  pts.push(
    ...sampleCubic([1.758, 18.237], [3.87, 21.689], [7.678, 24], [12, 24], steps, true),
    ...sampleCubic([12, 24], [16.322, 24], [20.162, 21.689], [22.245, 18.236], steps, true),
    [17.205, 18.236],
    [17.205, 11.885],
    [13.819, 15.306],
    [12.031, 17.096],
    [10.217, 15.306],
  );
  return dedupe(pts);
}

function toMm(points: Pt[], diameter: number): Pt[] {
  const s = diameter / 24;
  return points.map(([x, y]) => [(x - 12) * s, (12 - y) * s]);
}

function n(values: Values, key: string, fallback: number, min: number, max: number) {
  return clamp(num(values, key, fallback), min, max);
}

function cyl(radius: number, height: number, zCenter: number, segments = 64): Geom3 {
  return cylinder({
    radius: Math.max(0.4, radius),
    height: Math.max(0.4, height),
    segments,
    center: [0, 0, zCenter],
  });
}

function sitParts(parts: ColorPart[]): ColorPart[] {
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of parts) {
    const { min, max } = bboxOf(p.geom);
    minX = Math.min(minX, min[0]);
    minY = Math.min(minY, min[1]);
    minZ = Math.min(minZ, min[2]);
    maxX = Math.max(maxX, max[0]);
    maxY = Math.max(maxY, max[1]);
  }
  const dx = -(minX + maxX) / 2;
  const dy = -(minY + maxY) / 2;
  const dz = -minZ;
  return parts.map((p) => ({
    ...p,
    geom: translate([dx, dy, dz], p.geom),
  }));
}

export function moneroCoin(values: Values): ColorPart[] {
  const diameter = n(values, "diameter", 28, 12, 500);
  const height = n(values, "height", 14, 2, 500);
  const rim = n(values, "rim", 1, 0, 40);
  const wall = n(values, "wall", 0, 0, 12);
  const inlay = n(values, "inlay", 1.6, 0.8, 8);
  const fit = bool(values, "fitP2s", false);
  const through = str(values, "fill", "through") !== "face";

  const usable = P2S.bed - 6;
  const scaleFit = fit
    ? Math.min(usable / Math.max(diameter, 1), P2S.height / Math.max(height, 1), 1)
    : 1;
  const D = Math.max(16, diameter * scaleFit);
  const H = Math.max(1.6, height * scaleFit);
  const logoD = Math.max(12, D - 2 * rim);
  const segs = D > 180 ? 64 : 48;

  const orangePts = toMm(orangeSvg(), logoD);
  const greyPts = toMm(greySvg(), logoD);
  const orange2 = poly2(orangePts);
  const grey2 = poly2(greyPts);
  const disc2 = circle2(logoD / 2 * 0.996, segs);

  const logoH = through ? H : Math.min(inlay, H - 0.6);
  const logoZ = through ? 0 : H - logoH;
  let orange = translate([0, 0, logoZ], extrude(logoH, orange2));
  let grey = translate([0, 0, logoZ], extrude(logoH, grey2));

  let white: Geom3;
  if (through) {
    const disc = extrude(H, disc2);
    white = subtract(disc, orange, grey);
  } else {
    const body = cyl(D / 2, H, H / 2, segs);
    const pocketO = translate([0, 0, logoZ - 0.05], extrude(logoH + 0.2, orange2));
    const pocketG = translate([0, 0, logoZ - 0.05], extrude(logoH + 0.2, grey2));
    white = subtract(body, pocketO, pocketG);
  }

  if (rim > 0.4 && through) {
    const outer = cyl(D / 2, H, H / 2, segs);
    const inner = cyl(logoD / 2 + 0.05, H + 1, H / 2, segs);
    const ring = subtract(outer, inner);
    white = union(white, ring);
  }

  // Hollow only orange + grey so the white M stays a solid core.
  if (wall >= 1.6 && D > 60 && H > wall * 2 + 8) {
    const innerR = Math.max(8, D / 2 - wall);
    const innerH = Math.max(2, H - 2 * wall);
    const cavity = cyl(innerR, innerH, wall + innerH / 2, segs);
    orange = subtract(orange, cavity);
    grey = subtract(grey, cavity);
    if (!through) white = subtract(white, cavity);
  }

  return sitParts([
    { name: "orange", color: XMR_ORANGE, geom: orange },
    { name: "white", color: XMR_WHITE, geom: white },
    { name: "grey", color: XMR_GREY, geom: grey },
  ]);
}

export function moneroAdvice(values: Values): PrintAdvice {
  const diameter = n(values, "diameter", 28, 12, 500);
  const height = n(values, "height", 14, 2, 500);
  const fit = bool(values, "fitP2s", false);
  const through = str(values, "fill", "through") !== "face";
  const wall = n(values, "wall", 0, 0, 12);
  const usable = P2S.bed - 6;
  const scaleFit = fit
    ? Math.min(usable / Math.max(diameter, 1), P2S.height / Math.max(height, 1), 1)
    : 1;
  const D = diameter * scaleFit;
  const H = height * scaleFit;
  const notes = [
    "Three STLs — orange #FF6600, true white #FFFFFF, grey #4C4C4C.",
    "Bambu Studio: import orange, right-click → Add part → white and grey. Assign AMS slots to match.",
    through
      ? "Through-colour: the M is true white all the way through. Both faces show the mark."
      : "Face inlay: logo sits in the top millimetres. Body is white.",
  ];
  if (D > P2S.bed + 0.4 || H > P2S.height + 0.4) {
    notes.unshift(
      `${D.toFixed(0)} × ${H.toFixed(0)} mm is larger than the P2S 256³ mm volume. Use Fit P2S, or the Desk 50 mm preset.`,
    );
  } else if (fit && scaleFit < 0.999) {
    notes.unshift(
      `Requested ${diameter.toFixed(0)} × ${height.toFixed(0)} mm, scaled to ${D.toFixed(0)} × ${H.toFixed(0)} mm to fit the P2S in one piece.`,
    );
  }
  if (wall >= 1.6) {
    notes.push(`Orange and grey are shelled at ${wall.toFixed(1)} mm. The white M stays solid.`);
  }
  notes.push("Prints on its face. 0.20 mm layers, 3 walls. No supports.");
  return {
    layer: "0.20 mm",
    walls: "3 perimeters (1.26 mm)",
    infill: wall >= 1.6 ? "15% gyroid (shell)" : "15% gyroid",
    supports: "None",
    material: "PLA — orange / white / grey AMS",
    notes,
  };
}
