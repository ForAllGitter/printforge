import {
  bboxOf,
  circle2,
  circleAt,
  extrude,
  intersect,
  rect2,
  rotateZ,
  subtract,
  translate,
  union,
  type Geom2,
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

export const WHITE = "#FFFFFF";
export const BTC_ORANGE = "#F7931A";
export const LTC_BLUE = "#345D9D";
export const DOGE_GOLD = "#C2A633";
export const DGB_BLUE = "#0066CC";
export const DGB_NAVY = "#002352";

function n(values: Values, key: string, fallback: number, min: number, max: number) {
  return clamp(num(values, key, fallback), min, max);
}

function cyl(radius: number, height: number, zCenter: number, segments = 48): Geom3 {
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

/** Bitcoin ₿ — double vertical stroke + two bowls. */
export function bitcoinB(d: number): Geom2 {
  const t = d * 0.092;
  const h = d * 0.58;
  const xL = -d * 0.13;
  const xR = -d * 0.02;
  const bar1 = rect2(t, h, xL, 0);
  const bar2 = rect2(t, h, xR, 0);
  const serifW = t * 3.55;
  const serifX = (xL + xR) / 2;
  const top = rect2(serifW, t, serifX, h / 2 - t * 0.42);
  const bot = rect2(serifW, t, serifX, -h / 2 + t * 0.42);

  const ur = d * 0.152;
  const ucx = xR + ur * 0.42;
  const ucy = h * 0.155;
  const upper = subtract(
    circleAt(ur, ucx, ucy, 28),
    circleAt(Math.max(0.35, ur - t), ucx, ucy, 28),
    rect2(ur * 2.1, ur * 2.4, ucx - ur * 0.95, ucy),
  );

  const lr = d * 0.188;
  const lcx = xR + lr * 0.38;
  const lcy = -h * 0.155;
  const lower = subtract(
    circleAt(lr, lcx, lcy, 28),
    circleAt(Math.max(0.35, lr - t), lcx, lcy, 28),
    rect2(lr * 2.1, lr * 2.4, lcx - lr * 0.95, lcy),
  );

  const joinU = rect2(t * 1.4, t, xR + t * 0.4, ucy);
  const joinL = rect2(t * 1.4, t, xR + t * 0.4, lcy);
  const mid = rect2(t * 2.2, t, xR + t * 0.6, 0);
  return union(bar1, bar2, top, bot, upper, lower, joinU, joinL, mid);
}

/** Litecoin Ł — L with a slash. */
export function litecoinL(d: number): Geom2 {
  const t = d * 0.11;
  const stem = rect2(t, d * 0.5, -d * 0.1, d * 0.02);
  const foot = rect2(d * 0.36, t, d * 0.04, -d * 0.23);
  const slash = rotateZ((-18 * Math.PI) / 180, rect2(d * 0.46, t, d * 0.02, d * 0.05));
  return union(stem, foot, slash);
}

/** Dogecoin D with the mid bar. */
export function dogeD(d: number): Geom2 {
  const t = d * 0.11;
  const h = d * 0.52;
  const stemX = -d * 0.13;
  const stem = rect2(t, h, stemX, 0);
  const r = d * 0.26;
  const cx = -d * 0.01;
  const bowl = subtract(
    circleAt(r, cx, 0, 32),
    circleAt(Math.max(0.4, r - t), cx, 0, 32),
    rect2(r * 1.7, r * 2.3, cx - r * 0.78, 0),
  );
  const bar = rect2(d * 0.4, t, -d * 0.02, 0);
  return union(stem, bowl, bar);
}

/** DigiByte D — bold D, no crossbar. */
export function digibyteD(d: number): Geom2 {
  const t = d * 0.125;
  const h = d * 0.5;
  const stemX = -d * 0.12;
  const stem = rect2(t, h, stemX, 0);
  const r = d * 0.25;
  const cx = 0;
  const bowl = subtract(
    circleAt(r, cx, 0, 32),
    circleAt(Math.max(0.4, r - t), cx, 0, 32),
    rect2(r * 1.65, r * 2.3, cx - r * 0.8, 0),
  );
  return union(stem, bowl);
}

type CoinSpec = {
  field: string;
  fieldName: string;
  symbol: (d: number) => Geom2;
  ring?: { color: string; name: string; innerFrac: number };
};

function sized(values: Values) {
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
  const D = Math.max(14, diameter * scaleFit);
  const H = Math.max(1.6, height * scaleFit);
  const rimW = Math.min(rim * scaleFit, D / 2 - 3);
  return { diameter, height, D, H, rimW, wall, inlay, through, fit, scaleFit };
}

function buildCoin(spec: CoinSpec, values: Values): ColorPart[] {
  const { D, H, rimW, wall, inlay, through } = sized(values);
  const segs = D > 180 ? 64 : 48;
  const logoD = Math.max(10, D - 2 * Math.max(0, rimW));
  const logoR = logoD / 2;
  const symbolD = logoD * 0.7;
  const raw = spec.symbol(symbolD);
  let symbol2: Geom2;
  try {
    symbol2 = intersect(raw, circle2(logoR * 0.9, segs));
  } catch {
    symbol2 = raw;
  }

  const logoH = through ? H : Math.min(inlay, H - 0.6);
  const logoZ = through ? 0 : H - logoH;
  const innerR = spec.ring ? logoR * spec.ring.innerFrac : 0;

  let field2: Geom2;
  let ring2: Geom2 | null = null;
  if (spec.ring && innerR > 2) {
    ring2 = subtract(circle2(logoR, segs), circle2(innerR, segs));
    field2 = subtract(circle2(innerR * 0.998, segs), symbol2);
  } else {
    field2 = subtract(circle2(logoR * 0.996, segs), symbol2);
  }

  let field = translate([0, 0, logoZ], extrude(logoH, field2));
  let ring =
    ring2 && spec.ring
      ? translate([0, 0, logoZ], extrude(logoH, ring2))
      : null;
  const symbol = translate([0, 0, logoZ], extrude(logoH, symbol2));

  let white: Geom3;
  if (through) {
    white = symbol;
    if (rimW > 0.35) {
      const outer = cyl(D / 2, H, H / 2, segs);
      const inner = cyl(logoR + 0.02, H + 1, H / 2, segs);
      white = union(white, subtract(outer, inner));
    }
  } else {
    const body = cyl(D / 2, H, H / 2, segs);
    const pocketF = translate([0, 0, logoZ - 0.05], extrude(logoH + 0.2, field2));
    const pocketR =
      ring2 && spec.ring
        ? translate([0, 0, logoZ - 0.05], extrude(logoH + 0.2, ring2))
        : null;
    white = pocketR ? subtract(body, pocketF, pocketR) : subtract(body, pocketF);
  }

  if (wall >= 1.6 && D > 60 && H > wall * 2 + 8) {
    const cavityR = Math.max(6, D / 2 - wall);
    const cavityH = Math.max(2, H - 2 * wall);
    const cavity = cyl(cavityR, cavityH, wall + cavityH / 2, segs);
    field = subtract(field, cavity);
    if (ring) ring = subtract(ring, cavity);
    if (!through) white = subtract(white, cavity);
  }

  const parts: ColorPart[] = [
    { name: spec.fieldName, color: spec.field, geom: field },
    { name: "white", color: WHITE, geom: white },
  ];
  if (ring && spec.ring) {
    parts.splice(1, 0, { name: spec.ring.name, color: spec.ring.color, geom: ring });
  }
  return sitParts(parts);
}

function adviceFor(
  label: string,
  colors: string,
  values: Values,
): PrintAdvice {
  const { diameter, height, D, H, through, fit, scaleFit, wall } = sized(values);
  const notes = [
    `AMS STLs — ${colors}. White rim and mark.`,
    "Bambu Studio: import the first STL, right-click → Add part → remaining files. Assign filaments to match.",
    through
      ? "Through-colour: the mark is white all the way through. Both faces read."
      : "Face inlay: logo sits in the top millimetres. Body and rim are white.",
  ];
  if (D > P2S.bed + 0.4 || H > P2S.height + 0.4) {
    notes.unshift(
      `${D.toFixed(0)} × ${H.toFixed(0)} mm is larger than the P2S. Turn on Fit P2S.`,
    );
  } else if (fit && scaleFit < 0.999) {
    notes.unshift(
      `Requested ${diameter.toFixed(0)} × ${height.toFixed(0)} mm, scaled to ${D.toFixed(0)} × ${H.toFixed(0)} mm for the P2S.`,
    );
  }
  if (wall >= 1.6) notes.push(`Shelled at ${wall.toFixed(1)} mm.`);
  notes.push("Prints on its face. 0.20 mm layers, 3 walls. No supports.");
  return {
    layer: "0.20 mm",
    walls: "3 perimeters (1.26 mm)",
    infill: wall >= 1.6 ? "15% gyroid (shell)" : "15% gyroid",
    supports: "None",
    material: `PLA — ${label}`,
    notes,
  };
}

const BTC: CoinSpec = {
  field: BTC_ORANGE,
  fieldName: "orange",
  symbol: bitcoinB,
};

const LTC: CoinSpec = {
  field: LTC_BLUE,
  fieldName: "blue",
  symbol: litecoinL,
};

const DOGE: CoinSpec = {
  field: DOGE_GOLD,
  fieldName: "gold",
  symbol: dogeD,
};

const DGB: CoinSpec = {
  field: DGB_NAVY,
  fieldName: "navy",
  symbol: digibyteD,
  ring: { color: DGB_BLUE, name: "blue", innerFrac: 0.78 },
};

export function bitcoinCoin(values: Values) {
  return buildCoin(BTC, values);
}
export function litecoinCoin(values: Values) {
  return buildCoin(LTC, values);
}
export function dogecoinCoin(values: Values) {
  return buildCoin(DOGE, values);
}
export function digibyteCoin(values: Values) {
  return buildCoin(DGB, values);
}

export function bitcoinAdvice(v: Values) {
  return adviceFor("Bitcoin orange / white", "orange #F7931A, white #FFFFFF", v);
}
export function litecoinAdvice(v: Values) {
  return adviceFor("Litecoin blue / white", "blue #345D9D, white #FFFFFF", v);
}
export function dogecoinAdvice(v: Values) {
  return adviceFor("Dogecoin gold / white", "gold #C2A633, white #FFFFFF", v);
}
export function digibyteAdvice(v: Values) {
  return adviceFor(
    "DigiByte navy / blue / white",
    "navy #002352, blue #0066CC, white #FFFFFF",
    v,
  );
}
