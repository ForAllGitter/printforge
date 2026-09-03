import {
  bboxOf,
  circle2,
  circleAt,
  extrude,
  intersect,
  poly2,
  rect2,
  subtract,
  translate,
  union,
  type Geom2,
  type Geom3,
} from "./geometry";
import { primitives } from "./jscad";
import { largestFirst, pathContours, scaleFlip } from "./svg-path";
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
export const DOGE_GOLD = "#C3A634";
export const DOGE_CREAM = "#F4E0A8";
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

/** Bitcoin ₿ from cryptocurrency-icons / Bitcoin.svg, 32×32 viewBox. */
const BTC_PATH =
  "M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z";

/** Litecoin Ł from cryptocurrency-icons, 32×32 viewBox. */
const LTC_PATH =
  "M10.427 19.214L9 19.768l.688-2.759 1.444-.58L13.213 8h5.129l-1.519 6.196 1.41-.571-.68 2.75-1.427.571-.848 3.483H23L22.127 24H9.252z";

/** Official DigiByte D, 1280 viewBox, centre 640. */
const DGB_PATH =
  "M769.9,428l15-39.1c1.5-4-1.4-8.2-5.6-8.2h-55.7L706,426.5h-24.7l14.4-37.6c1.5-4-1.4-8.2-5.6-8.2h-55.7 l-17.6,45.8H442.6c-7.9,0-15.3,4.3-19.2,11.2L380,514.3h60.7h264.8c10.8,0,21.5,2,31.5,6.1c19.2,7.9,41.9,25.8,36.2,66.1 c-9.5,67.5-78.3,187.1-227.6,189l77.2-201c3.2-8.3-2.9-17.1-11.8-17.1H507.5l-125,307.2c0,0,25.2,3.1,64.7,3.1L434.8,900h56.9 c4.5,0,8.6-2.8,10.3-7l10.7-27.8c8.4-0.7,16.9-1.6,25.7-2.6L524,900h56.9c4.5,0,8.6-2.8,10.3-7l16.2-42.3 c93.5-21.3,194-67.7,253.7-165.6C981.6,487.7,856.4,436.7,769.9,428z";

function markFromPath(d: string, view: number, logoD: number, cx?: number, cy?: number): Geom2 {
  const s = logoD / view;
  const c = cx ?? view / 2;
  const k = cy ?? view / 2;
  const contours = largestFirst(scaleFlip(pathContours(d, 8), c, k, s));
  if (!contours.length) return circle2(logoD * 0.1, 12);
  let g = poly2(contours[0]!);
  for (let i = 1; i < contours.length; i++) {
    try {
      g = subtract(g, poly2(contours[i]!));
    } catch {
      /* skip degenerate hole */
    }
  }
  return g;
}

export function bitcoinB(d: number): Geom2 {
  return markFromPath(BTC_PATH, 32, d);
}

export function litecoinL(d: number): Geom2 {
  return markFromPath(LTC_PATH, 32, d);
}

/** Bold geometric D matching the CoinMarketCap overlay. */
export function dogeD(d: number): Geom2 {
  const t = d * 0.155;
  const h = d * 0.56;
  const stem = rect2(t, h, -d * 0.13, 0);
  const r = d * 0.28;
  const cx = 0;
  const bowl = subtract(
    circleAt(r, cx, 0, 36),
    circleAt(Math.max(0.5, r - t), cx, 0, 36),
    rect2(r * 1.65, r * 2.3, cx - r * 0.78, 0),
  );
  return union(stem, bowl);
}

/** Simplified Shiba silhouette — ears and snout peek around the D. */
export function shibaHead(d: number): Geom2 {
  const head = circleAt(d * 0.34, 0.02 * d, -0.02 * d, 28);
  const leftEar = poly2([
    [-0.26 * d, 0.04 * d],
    [-0.34 * d, 0.42 * d],
    [-0.08 * d, 0.16 * d],
  ]);
  const rightEar = poly2([
    [0.08 * d, 0.16 * d],
    [0.34 * d, 0.42 * d],
    [0.26 * d, 0.04 * d],
  ]);
  const snout = circleAt(0.15 * d, -0.12 * d, -0.22 * d, 18);
  const cheek = circleAt(0.12 * d, 0.16 * d, -0.16 * d, 16);
  return union(head, leftEar, rightEar, snout, cheek);
}

export function digibyteD(d: number): Geom2 {
  return markFromPath(DGB_PATH, 519.9 * 2, d, 640, 640);
}

type CoinSpec = {
  field: string;
  fieldName: string;
  symbol: (d: number) => Geom2;
  /** Extra colour under the white mark (Dogecoin Shiba). */
  overlay?: { name: string; color: string; shape: (d: number) => Geom2 };
  ring?: { color: string; name: string; innerFrac: number };
  /** Scale of the mark relative to the inner disc. Official icons fill the circle. */
  markScale?: number;
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
  const markScale = spec.markScale ?? 1;
  const symbolD = logoD * markScale;
  const raw = spec.symbol(symbolD);
  let symbol2: Geom2;
  try {
    symbol2 = intersect(raw, circle2(logoR * 0.94, segs));
  } catch {
    symbol2 = raw;
  }

  let overlay2: Geom2 | null = null;
  if (spec.overlay) {
    try {
      overlay2 = subtract(
        intersect(spec.overlay.shape(logoD), circle2(logoR * 0.996, segs)),
        symbol2,
      );
    } catch {
      overlay2 = spec.overlay.shape(logoD);
    }
  }

  const logoH = through ? H : Math.min(inlay, H - 0.6);
  const logoZ = through ? 0 : H - logoH;
  const innerR = spec.ring ? logoR * spec.ring.innerFrac : 0;

  let field2: Geom2;
  let ring2: Geom2 | null = null;
  if (spec.ring && innerR > 2) {
    ring2 = subtract(circle2(logoR, segs), circle2(innerR, segs));
    field2 = overlay2
      ? subtract(circle2(innerR * 0.998, segs), overlay2, symbol2)
      : subtract(circle2(innerR * 0.998, segs), symbol2);
  } else {
    field2 = overlay2
      ? subtract(circle2(logoR * 0.996, segs), overlay2, symbol2)
      : subtract(circle2(logoR * 0.996, segs), symbol2);
  }

  let field = translate([0, 0, logoZ], extrude(logoH, field2));
  let ring =
    ring2 && spec.ring
      ? translate([0, 0, logoZ], extrude(logoH, ring2))
      : null;
  let overlayGeom: Geom3 | null = overlay2
    ? translate([0, 0, logoZ], extrude(logoH, overlay2))
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
    const pocketO = overlay2
      ? translate([0, 0, logoZ - 0.05], extrude(logoH + 0.2, overlay2))
      : null;
    const pocketR =
      ring2 && spec.ring
        ? translate([0, 0, logoZ - 0.05], extrude(logoH + 0.2, ring2))
        : null;
    const pockets = [pocketF, pocketO, pocketR].filter(Boolean) as Geom3[];
    white = pockets.length === 1 ? subtract(body, pockets[0]!) : subtract(body, ...(pockets as [Geom3, ...Geom3[]]));
  }

  if (wall >= 1.6 && D > 60 && H > wall * 2 + 8) {
    const cavityR = Math.max(6, D / 2 - wall);
    const cavityH = Math.max(2, H - 2 * wall);
    const cavity = cyl(cavityR, cavityH, wall + cavityH / 2, segs);
    field = subtract(field, cavity);
    if (ring) ring = subtract(ring, cavity);
    if (overlayGeom) overlayGeom = subtract(overlayGeom, cavity);
    if (!through) white = subtract(white, cavity);
  }

  const parts: ColorPart[] = [
    { name: spec.fieldName, color: spec.field, geom: field },
    { name: "white", color: WHITE, geom: white },
  ];
  if (overlayGeom && spec.overlay) {
    parts.splice(1, 0, { name: spec.overlay.name, color: spec.overlay.color, geom: overlayGeom });
  }
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
  overlay: { name: "cream", color: DOGE_CREAM, shape: shibaHead },
  markScale: 0.64,
};

const DGB: CoinSpec = {
  field: DGB_NAVY,
  fieldName: "navy",
  symbol: digibyteD,
  ring: { color: DGB_BLUE, name: "blue", innerFrac: 0.812 },
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
  return adviceFor(
    "Dogecoin gold / cream / white",
    "gold #C3A634, cream #F4E0A8, white #FFFFFF",
    v,
  );
}
export function digibyteAdvice(v: Values) {
  return adviceFor(
    "DigiByte navy / blue / white",
    "navy #002352, blue #0066CC, white #FFFFFF",
    v,
  );
}
