import { ring, sitOnBed, subtract, translate, union, type Geom3 } from "./geometry";
import { primitives } from "./jscad";
import { bool, clamp, num, type PrintAdvice, type Values } from "./types";

const { cuboid, cylinder, cylinderElliptic } = primitives;

function n(values: Values, key: string, fallback: number, min: number, max: number) {
  return clamp(num(values, key, fallback), min, max);
}

function cyl(radius: number, height: number, zCenter: number, segments = 72): Geom3 {
  return cylinder({
    radius: Math.max(0.4, radius),
    height: Math.max(0.4, height),
    segments,
    center: [0, 0, zCenter],
  });
}

/**
 * Snap lid for foil-sealed dairy cups (Alpro 400 g kwark and the same family).
 * `cupOuter` is the rim OD — measure across the foil, the widest ring.
 *
 * Prints top-down on the bed: skirt and plug point +Z. The snap bead has a
 * 20° lead-in so it needs no supports.
 */
export function cupLid(values: Values): Geom3 {
  const cupOD = n(values, "cupOuter", 95, 60, 180);
  const flange = n(values, "flange", 3.4, 1.6, 8);
  const clearance = n(values, "clearance", 0.25, 0.08, 0.9);
  const snap = n(values, "snap", 0.55, 0.15, 1.6);
  const wall = n(values, "wall", 1.6, 1.2, 3.2);
  const top = n(values, "top", 1.8, 1.2, 4);
  const skirtH = n(values, "skirt", 9, 6, 20);
  const plugH = n(values, "plug", 5.5, 0, 14);
  const rimH = n(values, "rimHeight", 3.8, 2, 10);
  const withTab = bool(values, "tab", true);
  const segs = 72;

  const cupR = cupOD / 2;
  const mouthR = Math.max(18, cupR - flange);
  const skirtInner = cupR + clearance;
  const skirtOuter = skirtInner + wall;
  const topR = skirtOuter + 1.8;
  const beadInner = Math.max(mouthR + 0.6, cupR - snap);
  const plugOuter = Math.max(12, mouthR - 0.22);
  const plugInner = Math.max(6, plugOuter - wall);

  let lid = cyl(topR, top, top / 2, segs);

  const skirt = ring(skirtOuter, skirtInner, skirtH);
  lid = union(lid, translate([0, 0, top], skirt));

  const beadH = 1.3;
  const beadZ = top + rimH;
  const catchOuter = skirtInner + 0.35;
  const bead = ring(catchOuter, beadInner, beadH);
  lid = union(lid, translate([0, 0, beadZ], bead));

  const chamferH = Math.max(2.2, Math.min(3.2, skirtH - rimH - beadH - 0.4));
  const chamferBody = cyl(catchOuter, chamferH, chamferH / 2, segs);
  const chamferHole = cylinderElliptic({
    height: chamferH + 0.6,
    startRadius: [beadInner, beadInner],
    endRadius: [skirtInner + 0.2, skirtInner + 0.2],
    segments: segs,
    center: [0, 0, chamferH / 2],
  });
  const chamfer = subtract(chamferBody, chamferHole);
  lid = union(lid, translate([0, 0, beadZ + beadH], chamfer));

  if (plugH >= 1.6 && plugOuter > plugInner + 0.8) {
    const plugRing = ring(plugOuter, plugInner, plugH);
    lid = union(lid, translate([0, 0, top], plugRing));
  }

  if (withTab) {
    const tabW = 22;
    const tabD = 16;
    const tab = cuboid({
      size: [tabW, tabD, top],
      center: [topR + tabW / 2 - 3, 0, top / 2],
    });
    const tip = cylinder({
      radius: tabD / 2,
      height: top,
      segments: 24,
      center: [topR + tabW - 3, 0, top / 2],
    });
    lid = union(lid, tab, tip);
  }

  return sitOnBed(lid);
}

export function cupLidAdvice(values: Values): PrintAdvice {
  const cupOD = n(values, "cupOuter", 95, 60, 180);
  const clearance = n(values, "clearance", 0.25, 0.08, 0.9);
  const snap = n(values, "snap", 0.55, 0.15, 1.6);
  return {
    layer: "0.20 mm",
    walls: "3 perimeters (1.26 mm)",
    infill: "20% gyroid",
    supports: "None",
    material: "PLA (cold use) or PETG",
    notes: [
      `Sized for a ${cupOD.toFixed(1)} mm rim OD — measure across the foil, the widest ring.`,
      "Prints on its top. Skirt and snap point up. No supports.",
      "Push on until the bead clicks under the rim. Pull the tab to open.",
      `Clearance ${clearance.toFixed(2)} mm, snap ${snap.toFixed(2)} mm. Too tight: raise clearance or drop snap 0.1. Too loose: the opposite.`,
      "Hand-wash. PLA is fine for cold kwark in the fridge; PETG if you want it tougher. Not dishwasher-safe in PLA.",
    ],
  };
}
