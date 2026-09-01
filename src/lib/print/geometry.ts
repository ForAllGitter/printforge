import { clamp } from "./types";
import {
  booleans,
  expansions,
  extrusions,
  geometries,
  measurements,
  primitives,
  text,
  transforms,
  type Geom2,
  type Geom3,
} from "./jscad";

export type { Geom3, Geom2 };

const { cuboid, cylinder, roundedRectangle, rectangle, polygon, circle, line } =
  primitives;
const { subtract, union, intersect } = booleans;
const { translate, rotate, rotateZ, scale } = transforms;

const { extrudeLinear } = extrusions;
const { expand } = expansions;
const { measureBoundingBox, measureVolume, measureAggregateBoundingBox } =
  measurements;
const { vectorText } = text;

export { translate, rotate, rotateZ, scale, union, subtract, intersect };

export function roundR(w: number, d: number, r: number): number {
  const cap = Math.min(w, d) / 2 - 0.05;
  return cap < 0.2 ? 0 : clamp(r, 0, cap);
}

export function box2(w: number, d: number, r: number): Geom2 {
  const rr = roundR(w, d, r);
  if (rr < 0.2) return rectangle({ size: [w, d] });
  return roundedRectangle({
    size: [w, d],
    roundRadius: rr,
    segments: 12,
  });
}

export function circle2(radius: number, segments = 48): Geom2 {
  return circle({ radius: Math.max(0.2, radius), segments });
}

export function circleAt(
  radius: number,
  cx: number,
  cy: number,
  segments = 32,
): Geom2 {
  return circle({
    radius: Math.max(0.2, radius),
    center: [cx, cy],
    segments,
  });
}

export function rect2(w: number, h: number, cx = 0, cy = 0): Geom2 {
  return rectangle({
    size: [Math.max(0.3, w), Math.max(0.3, h)],
    center: [cx, cy],
  });
}

export function poly2(points: [number, number][]): Geom2 {
  return polygon({ points });
}

export function extrude(h: number, shape: Geom2): Geom3 {
  return extrudeLinear({ height: Math.max(0.4, h) }, shape);
}

export function boxAt(
  size: [number, number, number],
  min: [number, number, number],
): Geom3 {
  const [w, d, h] = size;
  return translate(
    [min[0] + w / 2, min[1] + d / 2, min[2] + h / 2],
    cuboid({ size: [Math.max(0.4, w), Math.max(0.4, d), Math.max(0.4, h)] }),
  );
}

export function cylAlong(
  axis: "x" | "y" | "z",
  radius: number,
  length: number,
  center: [number, number, number],
): Geom3 {
  const c = cylinder({
    radius: Math.max(0.2, radius),
    height: Math.max(0.4, length),
    segments: 24,
  });
  const rotated =
    axis === "z"
      ? c
      : axis === "y"
        ? rotate([Math.PI / 2, 0, 0], c)
        : rotate([0, Math.PI / 2, 0], c);
  return translate(center, rotated);
}

export function holeZ(
  radius: number,
  height: number,
  xy: [number, number],
  z = -0.4,
): Geom3 {
  return cylAlong("z", radius, height + 0.8, [xy[0], xy[1], z + (height + 0.8) / 2]);
}

export function hollow(
  w: number,
  d: number,
  h: number,
  wall: number,
  floor: number,
  radius: number,
): Geom3 {
  const W = Math.max(8, w);
  const D = Math.max(8, d);
  const H = Math.max(4, h);
  const T = clamp(wall, 0.8, Math.min(W, D) / 2 - 0.4);
  const F = clamp(floor, 0.6, H - 0.6);
  const outer = extrude(H, box2(W, D, radius));
  const innerW = W - 2 * T;
  const innerD = D - 2 * T;
  if (innerW < 1 || innerD < 1) return outer;
  const inner = extrude(H - F + 0.4, box2(innerW, innerD, Math.max(0, radius - T)));
  return subtract(outer, translate([0, 0, F], inner));
}

export function profile(points: [number, number][], width: number): Geom3 {
  const clean = points.map(([x, y]) => [x, y] as [number, number]);
  return extrude(Math.max(4, width), polygon({ points: clean }));
}

export function sitOnBed(geom: Geom3): Geom3 {
  const bb = measureBoundingBox(geom);
  const [minX, minY, minZ] = bb[0];
  const [maxX, maxY] = bb[1];
  return translate([-(minX + maxX) / 2, -(minY + maxY) / 2, -minZ], geom);
}

export function packOnPlate(parts: Geom3[], gap = 6): Geom3 {
  if (parts.length === 1) return sitOnBed(parts[0]!);
  let x = 0;
  const placed: Geom3[] = [];
  for (const part of parts) {
    const bb = measureBoundingBox(part);
    const w = bb[1][0] - bb[0][0];
    placed.push(
      translate(
        [x - bb[0][0], -(bb[0][1] + bb[1][1]) / 2, -bb[0][2]],
        part,
      ),
    );
    x += w + gap;
  }
  return sitOnBed(union(placed));
}

export function raisedText(
  raw: string,
  height: number,
  stroke: number,
  thickness: number,
): Geom3 | null {
  const input = raw
    .toUpperCase()
    .replace(/[^A-Z0-9 +\-./]/g, "")
    .slice(0, 18)
    .trim();
  if (!input) return null;
  const strokes = vectorText({
    height: Math.max(4, height),
    align: "center",
    letterSpacing: 0.6,
    input,
  });
  if (!strokes.length) return null;
  const delta = clamp(stroke, 0.35, 2.4);
  const letters: Geom3[] = [];
  for (const strokePts of strokes) {
    if (!strokePts || strokePts.length < 2) continue;
    try {
      const trace = expand(
        { delta, corners: "round", segments: 8 },
        line(strokePts),
      );
      letters.push(extrude(Math.max(0.6, thickness), trace));
    } catch {
      // skip malformed stroke
    }
  }
  if (!letters.length) return null;
  return sitOnBed(letters.length === 1 ? letters[0]! : union(letters));
}

export function hexPrism(flatToFlat: number, height: number): Geom3 {
  const r = flatToFlat / Math.sqrt(3);
  return rotateZ(
    Math.PI / 6,
    cylinder({
      radius: r,
      height: Math.max(0.6, height),
      segments: 6,
      center: [0, 0, height / 2],
    }),
  );
}

export function bboxOf(geom: Geom3): {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
} {
  const bb = measureBoundingBox(geom);
  const min = bb[0] as [number, number, number];
  const max = bb[1] as [number, number, number];
  return {
    min,
    max,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
  };
}

export function volumeMm3(geom: Geom3): number {
  try {
    return Math.max(0, measureVolume(geom));
  } catch {
    return 0;
  }
}

export function aggregateBbox(geoms: Geom3[]) {
  return measureAggregateBoundingBox(geoms);
}

export function toPolygons(geom: Geom3) {
  return geometries.geom3.toPolygons(geom);
}

export function ring(outer: number, inner: number, height: number): Geom3 {
  const o = extrude(height, circle({ radius: outer, segments: 48 }));
  if (inner <= 0.2 || inner >= outer - 0.3) return o;
  const i = extrude(height + 0.4, circle({ radius: inner, segments: 48 }));
  return subtract(o, translate([0, 0, -0.2], i));
}

export function cClip(
  innerR: number,
  wall: number,
  width: number,
  openingDeg: number,
): Geom3 {
  const outerR = innerR + wall;
  const body = ring(outerR, innerR, width);
  const opening = clamp(openingDeg, 20, 140);
  const half = (opening / 2) * (Math.PI / 180);
  const reach = outerR + 4;
  const wedge = polygon({
    points: [
      [0, 0],
      [Math.sin(-half) * reach, Math.cos(-half) * reach],
      [Math.sin(half) * reach, Math.cos(half) * reach],
    ],
  });
  return subtract(body, translate([0, 0, -0.2], extrude(width + 0.4, wedge)));
}
