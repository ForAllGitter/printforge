import {
  bboxOf,
  box2,
  boxAt,
  cClip,
  cylAlong,
  extrude,
  hexPrism,
  hollow,
  holeZ,
  packOnPlate,
  profile,
  raisedText,
  ring,
  scale,
  sitOnBed,
  subtract,
  translate,
  union,
} from "./geometry";
import { moneroAdvice, moneroCoin } from "./monero";
import {
  bitcoinAdvice,
  bitcoinCoin,
  digibyteAdvice,
  digibyteCoin,
  dogecoinAdvice,
  dogecoinCoin,
  litecoinAdvice,
  litecoinCoin,
} from "./coins";
import { cupLid, cupLidAdvice } from "./cup-lid";

import {
  bool,
  clamp,
  num,
  str,
  type Design,
  type PrintAdvice,
  type Values,
} from "./types";

function n(
  values: Values,
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  return clamp(num(values, key, fallback), min, max);
}

function advice(
  notes: string[],
  material = "PLA",
  supports = "None",
  infill = "15% gyroid",
): PrintAdvice {
  return {
    layer: "0.20 mm",
    walls: "3 perimeters (1.26 mm)",
    infill,
    supports,
    material,
    notes,
  };
}

function snapBox(values: Values) {
  const w = n(values, "width", 120, 20, 250);
  const d = n(values, "depth", 80, 20, 250);
  const h = n(values, "height", 40, 10, 200);
  const wall = n(values, "wall", 1.6, 0.8, 6);
  const floor = n(values, "floor", 1.6, 0.8, 6);
  const radius = n(values, "radius", 4, 0, 30);
  const lidH = n(values, "lidHeight", 8, 4, 30);
  const clearance = n(values, "clearance", 0.3, 0.15, 0.8);
  const withLid = bool(values, "withLid", true);

  const box = sitOnBed(hollow(w, d, h, wall, floor, radius));
  if (!withLid) return box;

  const lipW = Math.max(8, w - 2 * wall - 2 * clearance);
  const lipD = Math.max(8, d - 2 * wall - 2 * clearance);
  const top = extrude(floor, box2(w, d, radius));
  const lipOuter = extrude(
    Math.max(3, lidH - floor),
    box2(lipW, lipD, Math.max(0, radius - wall)),
  );
  const lipInnerW = lipW - 2 * wall;
  const lipInnerD = lipD - 2 * wall;
  const lip =
    lipInnerW > 2 && lipInnerD > 2
      ? subtract(
          lipOuter,
          translate(
            [0, 0, -0.2],
            extrude(
              lidH,
              box2(lipInnerW, lipInnerD, Math.max(0, radius - 2 * wall)),
            ),
          ),
        )
      : lipOuter;
  const lid = sitOnBed(union(top, translate([0, 0, floor], lip)));
  return packOnPlate([box, lid], 8);
}

function dividerBin(values: Values) {
  const w = n(values, "width", 180, 30, 250);
  const d = n(values, "depth", 120, 30, 250);
  const h = n(values, "height", 40, 10, 180);
  const wall = n(values, "wall", 1.6, 0.8, 5);
  const floor = n(values, "floor", 1.6, 0.8, 5);
  const radius = n(values, "radius", 4, 0, 24);
  const cols = Math.round(n(values, "cols", 3, 1, 8));
  const rows = Math.round(n(values, "rows", 2, 1, 8));
  const shell = hollow(w, d, h, wall, floor, radius);
  const innerW = w - 2 * wall;
  const innerD = d - 2 * wall;
  const parts = [shell];
  if (cols > 1) {
    const span = innerW / cols;
    for (let i = 1; i < cols; i++) {
      parts.push(
        boxAt(
          [wall, innerD, h - 0.4],
          [-w / 2 + wall + span * i - wall / 2, -innerD / 2, floor],
        ),
      );
    }
  }
  if (rows > 1) {
    const span = innerD / rows;
    for (let i = 1; i < rows; i++) {
      parts.push(
        boxAt(
          [innerW, wall, h - 0.4],
          [-innerW / 2, -d / 2 + wall + span * i - wall / 2, floor],
        ),
      );
    }
  }
  return sitOnBed(union(parts));
}

function stackingBin(values: Values) {
  const w = n(values, "width", 84, 40, 250);
  const d = n(values, "depth", 84, 40, 250);
  const h = n(values, "height", 35, 16, 180);
  const wall = n(values, "wall", 1.6, 1.2, 4);
  const floor = n(values, "floor", 1.6, 1.2, 4);
  const radius = n(values, "radius", 4, 0, 16);
  const lip = n(values, "lip", 3.2, 2, 6);
  const body = hollow(w, d, h - lip, wall, floor, radius);
  const outerLip = extrude(lip, box2(w - 2, d - 2, Math.max(0, radius - 1)));
  const innerLip = extrude(
    lip + 0.4,
    box2(
      Math.max(4, w - 2 - 2 * wall),
      Math.max(4, d - 2 - 2 * wall),
      Math.max(0, radius - 1 - wall),
    ),
  );
  const rim = subtract(outerLip, translate([0, 0, -0.2], innerLip));
  return sitOnBed(union(body, translate([0, 0, h - lip], rim)));
}

function phoneStand(values: Values) {
  const width = n(values, "width", 80, 40, 200);
  const depth = n(values, "depth", 78, 50, 160);
  const backH = n(values, "backHeight", 72, 40, 160);
  const wall = n(values, "wall", 4, 2.4, 10);
  const groove = n(values, "groove", 14, 8, 28);
  const lip = n(values, "lip", 12, 8, 24);
  const cable = bool(values, "cableSlot", true);
  const t = wall;
  const slotBack = lip + groove;
  const points: [number, number][] = [
    [0, 0],
    [depth, 0],
    [depth, t],
    [slotBack + t, t],
    [slotBack + t, backH],
    [slotBack, backH],
    [slotBack, t + 10],
    [lip, t + 10],
    [lip, lip],
    [0, lip],
  ];
  let body = profile(points, width);
  if (cable) {
    const slotW = Math.min(16, width * 0.3);
    body = subtract(
      body,
      boxAt([depth + 2, t + 0.8, slotW], [-1, -0.2, (width - slotW) / 2]),
    );
  }
  return sitOnBed(body);
}

function wallHook(values: Values) {
  const height = n(values, "height", 70, 30, 180);
  const reach = n(values, "reach", 28, 12, 80);
  const width = n(values, "width", 22, 10, 60);
  const hole = n(values, "hole", 4.2, 2.5, 8);
  const plate = n(values, "plate", 18, 10, 40);

  const shape = profile(
    [
      [0, 0],
      [plate, 0],
      [plate, height - reach * 0.35],
      [plate + reach, height - reach * 0.15],
      [plate + reach - 3, height],
      [plate + 4, height - 8],
      [plate, height],
      [0, height],
    ],
    width,
  );
  const h1 = holeZ(hole / 2, width + 2, [plate / 2, height * 0.22]);
  const h2 = holeZ(hole / 2, width + 2, [plate / 2, height * 0.62]);
  return sitOnBed(subtract(shape, h1, h2));
}

function cableClip(values: Values) {
  const cable = n(values, "cable", 6, 2.5, 20);
  const wall = n(values, "wall", 2.2, 1.2, 5);
  const width = n(values, "width", 12, 6, 40);
  const opening = n(values, "opening", 70, 30, 120);
  return sitOnBed(cClip(cable / 2, wall, width, opening));
}

function lBracket(values: Values) {
  const a = n(values, "armA", 40, 16, 120);
  const b = n(values, "armB", 40, 16, 120);
  const width = n(values, "width", 24, 10, 80);
  const t = n(values, "thickness", 4, 2.4, 10);
  const hole = n(values, "hole", 3.4, 2.2, 6);
  const inset = n(values, "inset", 10, 6, 30);
  const arm1 = boxAt([a, width, t], [0, 0, 0]);
  const arm2 = boxAt([t, width, b], [0, 0, 0]);
  let body = union(arm1, arm2);
  body = subtract(
    body,
    holeZ(hole / 2, t + 2, [inset, width / 2]),
    holeZ(hole / 2, t + 2, [a - inset, width / 2]),
    cylAlong("y", hole / 2, width + 6, [t / 2, width / 2, t + inset]),
    cylAlong("y", hole / 2, width + 6, [t / 2, width / 2, b - inset]),
  );
  return sitOnBed(body);
}

function hexCoaster(values: Values) {
  const size = n(values, "size", 90, 30, 180);
  const height = n(values, "height", 4, 2, 16);
  const rimH = n(values, "rim", 1.6, 0, 6);
  const rimW = n(values, "rimWidth", 4, 2, 12);
  const hollowCenter = bool(values, "window", false);
  let body = hexPrism(size, height + rimH);
  if (rimH > 0.2) {
    const inner = hexPrism(size - 2 * rimW, rimH + 0.4);
    body = subtract(body, translate([0, 0, height], inner));
  }
  if (hollowCenter) {
    body = subtract(body, translate([0, 0, -0.2], hexPrism(size * 0.42, height + rimH + 0.6)));
  }
  return sitOnBed(body);
}

function nameplate(values: Values) {
  const w = n(values, "width", 140, 40, 250);
  const d = n(values, "depth", 50, 20, 120);
  const t = n(values, "thickness", 3.2, 1.6, 10);
  const border = n(values, "border", 4, 0, 12);
  const textH = n(values, "textHeight", 14, 6, 32);
  const label = str(values, "label", "PRINTFORGE");
  let plate = extrude(t, box2(w, d, 3));
  if (border > 0.4) {
    const frame = subtract(
      extrude(t + 1.2, box2(w, d, 3)),
      translate([0, 0, -0.1], extrude(t + 2, box2(w - 2 * border, d - 2 * border, 2))),
    );
    plate = union(plate, frame);
  }
  try {
    const letters = raisedText(label, textH, 0.9, 2.2);
    if (letters) {
      const bb = bboxOf(letters);
      const maxW = Math.max(10, w - 2 * border - 10);
      const maxD = Math.max(8, d - 2 * border - 8);
      const s = Math.min(maxW / Math.max(bb.size[0], 1), maxD / Math.max(bb.size[1], 1), 1);
      const fitted = sitOnBed(scale([s, s, 1], letters));
      plate = union(plate, translate([0, 0, t - 0.6], fitted));
    }
  } catch {
    // plate-only fallback
  }
  return sitOnBed(plate);
}

function bagClip(values: Values) {
  const width = n(values, "width", 70, 30, 160);
  const length = n(values, "length", 42, 24, 90);
  const gap = n(values, "gap", 2.2, 0.8, 6);
  const t = n(values, "thickness", 3.2, 2, 8);
  const jaw = (length - 8) / 2;
  const shape = profile(
    [
      [0, 0],
      [length, 0],
      [length, t],
      [length - 6, t],
      [length - 10, t + gap],
      [8, t + gap],
      [6, t + gap + jaw],
      [0, t + gap + jaw],
      [0, t + gap + 4],
      [4, t + 2],
      [0, t],
    ],
    width,
  );
  return sitOnBed(shape);
}

function toolBlock(values: Values) {
  const w = n(values, "width", 90, 40, 200);
  const d = n(values, "depth", 60, 30, 160);
  const h = n(values, "height", 40, 16, 100);
  const hole = n(values, "hole", 8, 3, 18);
  const cols = Math.round(n(values, "cols", 4, 1, 8));
  const rows = Math.round(n(values, "rows", 2, 1, 5));
  const radius = n(values, "radius", 4, 0, 16);
  let body = extrude(h, box2(w, d, radius));
  const marginX = 14;
  const marginY = 14;
  const spanX = cols === 1 ? 0 : (w - 2 * marginX) / (cols - 1);
  const spanY = rows === 1 ? 0 : (d - 2 * marginY) / (rows - 1);
  const holes = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + marginX + c * spanX;
      const y = -d / 2 + marginY + r * spanY;
      holes.push(holeZ(hole / 2, h + 2, [x, y]));
    }
  }
  if (holes.length) body = subtract(body, ...holes);
  return sitOnBed(body);
}

function purgeBin(values: Values) {
  const w = n(values, "width", 110, 50, 220);
  const d = n(values, "depth", 70, 30, 160);
  const h = n(values, "height", 55, 20, 160);
  const wall = n(values, "wall", 1.6, 1.2, 4);
  const lip = n(values, "lip", 18, 8, 40);
  const box = hollow(w, d, h, wall, wall, 4);
  const hanger = boxAt([lip, w * 0.7, wall], [-lip + 1, -w * 0.35, h - wall]);
  const drop = boxAt([wall, w * 0.7, 12], [0, -w * 0.35, h - 12]);
  return sitOnBed(union(box, hanger, drop));
}

function pegHook(values: Values) {
  const reach = n(values, "reach", 36, 16, 80);
  const width = n(values, "width", 14, 8, 36);
  const peg = n(values, "peg", 6, 4, 8);
  const spacing = n(values, "spacing", 25.4, 20, 40);
  const plate = 12;
  const height = spacing + 28;
  const body = profile(
    [
      [0, 0],
      [plate, 0],
      [plate, 10],
      [plate + reach, 10],
      [plate + reach, 16],
      [plate, 16],
      [plate, height],
      [0, height],
    ],
    width,
  );
  const peg1 = cylAlong("x", peg / 2, 12, [-6, height - 10, width / 2]);
  const peg2 = cylAlong("x", peg / 2, 12, [-6, height - 10 - spacing, width / 2]);
  return sitOnBed(union(body, peg1, peg2));
}

function washer(values: Values) {
  const outer = n(values, "outer", 16, 6, 80);
  const inner = n(values, "inner", 6, 2, 70);
  const h = n(values, "height", 3, 0.8, 20);
  return sitOnBed(ring(outer / 2, Math.min(inner / 2, outer / 2 - 0.8), h));
}

function cableComb(values: Values) {
  const slots = Math.round(n(values, "slots", 6, 2, 16));
  const pitch = n(values, "pitch", 8, 5, 16);
  const slotW = n(values, "slot", 4, 2, 10);
  const h = n(values, "height", 16, 8, 40);
  const t = n(values, "thickness", 8, 4, 20);
  const w = slots * pitch + 10;
  let body = extrude(t, box2(w, h, 2));
  for (let i = 0; i < slots; i++) {
    const x = -w / 2 + 8 + i * pitch;
    body = subtract(
      body,
      boxAt([slotW, h, t + 1], [x - slotW / 2, -h / 2 + 5, -0.5]),
    );
  }
  return sitOnBed(body);
}

const mm = (
  key: string,
  label: string,
  def: number,
  min: number,
  max: number,
  step = 0.2,
) =>
  ({
    key,
    kind: "number" as const,
    label,
    min,
    max,
    step,
    unit: "mm",
    default: def,
  });

const count = (
  key: string,
  label: string,
  def: number,
  min: number,
  max: number,
) =>
  ({
    key,
    kind: "number" as const,
    label,
    min,
    max,
    step: 1,
    unit: "",
    default: def,
  });

const coinParams = (): Design["params"] => [
  mm("diameter", "Diameter", 28, 12, 500, 0.5),
  mm("height", "Height", 14, 2, 500, 0.5),
  mm("rim", "White rim", 1, 0, 40, 0.5),
  mm("wall", "Shell wall (0 = solid)", 0, 0, 12, 0.2),
  mm("inlay", "Face inlay", 1.6, 0.8, 8, 0.2),
  {
    key: "fill",
    kind: "select",
    label: "Colour fill",
    options: [
      { value: "through", label: "Through — both faces" },
      { value: "face", label: "Face inlay only" },
    ],
    default: "through",
  },
  { key: "fitP2s", kind: "bool", label: "Scale to fit P2S", default: false },
];

export const DESIGNS: Design[] = [
  {
    id: "monero-coin",
    name: "Monero coin",
    category: "Crypto",
    blurb: "Press-kit XMR mark. Orange, true white M, grey. 28 × 14 mm with a white rim.",
    keywords: [
      "monero",
      "xmr",
      "coin",
      "logo",
      "crypto",
      "token",
      "orange",
      "privacy",
    ],
    params: coinParams(),
    build: moneroCoin,
    advice: moneroAdvice,
  },
  {
    id: "bitcoin-coin",
    name: "Bitcoin coin",
    category: "Crypto",
    blurb: "Bitcoin ₿ on orange. White mark and 1 mm white rim. 28 × 14 mm.",
    keywords: ["bitcoin", "btc", "coin", "logo", "crypto", "token", "orange"],
    params: coinParams(),
    build: bitcoinCoin,
    advice: bitcoinAdvice,
  },
  {
    id: "litecoin-coin",
    name: "Litecoin coin",
    category: "Crypto",
    blurb: "Litecoin Ł on blue. White mark and 1 mm white rim. 28 × 14 mm.",
    keywords: ["litecoin", "ltc", "coin", "logo", "crypto", "token", "silver"],
    params: coinParams(),
    build: litecoinCoin,
    advice: litecoinAdvice,
  },
  {
    id: "dogecoin-coin",
    name: "Dogecoin coin",
    category: "Crypto",
    blurb: "Dogecoin D on gold. White mark and 1 mm white rim. 28 × 14 mm.",
    keywords: ["doge", "dogecoin", "coin", "logo", "crypto", "token", "gold"],
    params: coinParams(),
    build: dogecoinCoin,
    advice: dogecoinAdvice,
  },
  {
    id: "digibyte-coin",
    name: "DigiByte coin",
    category: "Crypto",
    blurb: "DigiByte D — navy field, blue ring, white mark and rim. 28 × 14 mm.",
    keywords: ["digibyte", "dgb", "coin", "logo", "crypto", "token", "blue"],
    params: coinParams(),
    build: digibyteCoin,
    advice: digibyteAdvice,
  },
  {
    id: "cup-lid",
    name: "Cup lid",
    category: "Storage",
    blurb: "Snap lid for Alpro-style 400 g cups. 95 mm rim, inner plug, pull tab.",
    keywords: [
      "lid",
      "cup",
      "yogurt",
      "yoghurt",
      "kwark",
      "quark",
      "alpro",
      "cover",
      "snap",
      "pot",
    ],
    params: [
      mm("cupOuter", "Cup rim outer", 95, 60, 180, 0.1),
      mm("flange", "Rim flange width", 3.4, 1.6, 8, 0.1),
      mm("clearance", "Skirt clearance", 0.25, 0.08, 0.9, 0.05),
      mm("snap", "Snap undercut", 0.55, 0.15, 1.6, 0.05),
      mm("rimHeight", "Rim height", 3.8, 2, 10, 0.1),
      mm("skirt", "Skirt depth", 9, 6, 20, 0.5),
      mm("plug", "Inner plug", 5.5, 0, 14, 0.5),
      mm("wall", "Wall", 1.6, 1.2, 3.2, 0.2),
      mm("top", "Top thickness", 1.8, 1.2, 4, 0.2),
      { key: "tab", kind: "bool", label: "Pull tab", default: true },
    ],
    build: cupLid,
    advice: cupLidAdvice,
  },
  {
    id: "snap-box",
    name: "Snap-lid box",
    category: "Storage",
    blurb: "Open box plus a friction-fit lid, packed side by side on the plate.",
    keywords: ["box", "lid", "container", "storage", "gift", "sock", "knoop"],
    params: [
      mm("width", "Width", 120, 20, 250, 1),
      mm("depth", "Depth", 80, 20, 250, 1),
      mm("height", "Height", 40, 10, 200, 1),
      mm("wall", "Wall", 1.6, 0.8, 6, 0.2),
      mm("floor", "Floor", 1.6, 0.8, 6, 0.2),
      mm("radius", "Corner radius", 4, 0, 30, 0.5),
      mm("lidHeight", "Lid height", 8, 4, 30, 0.5),
      mm("clearance", "Lid clearance", 0.3, 0.15, 0.8, 0.05),
      { key: "withLid", kind: "bool", label: "Include lid", default: true },
    ],
    build: snapBox,
    advice: () =>
      advice([
        "Box and lid print together. Open the box facing up.",
        "0.3 mm clearance is a snug P2S fit with a 0.4 mm nozzle.",
      ]),
  },
  {
    id: "divider-bin",
    name: "Divider bin",
    category: "Storage",
    blurb: "Open organizer with a grid of compartments.",
    keywords: ["bin", "divider", "organizer", "drawer", "grid", "compartments"],
    params: [
      mm("width", "Width", 180, 30, 250, 1),
      mm("depth", "Depth", 120, 30, 250, 1),
      mm("height", "Height", 40, 10, 180, 1),
      mm("wall", "Wall", 1.6, 0.8, 5, 0.2),
      mm("floor", "Floor", 1.6, 0.8, 5, 0.2),
      mm("radius", "Corner radius", 4, 0, 24, 0.5),
      count("cols", "Columns", 3, 1, 8),
      count("rows", "Rows", 2, 1, 8),
    ],
    build: dividerBin,
    advice: () =>
      advice(["Print open-up. No supports.", "Bump walls to 2.0 mm for heavy hardware."]),
  },
  {
    id: "stacking-bin",
    name: "Stacking bin",
    category: "Storage",
    blurb: "Open bin with a stacking lip so identical prints nest.",
    keywords: ["stack", "bin", "modular", "gridfinity", "nest"],
    params: [
      mm("width", "Width", 84, 40, 250, 1),
      mm("depth", "Depth", 84, 40, 250, 1),
      mm("height", "Height", 35, 16, 180, 1),
      mm("wall", "Wall", 1.6, 1.2, 4, 0.2),
      mm("floor", "Floor", 1.6, 1.2, 4, 0.2),
      mm("radius", "Corner radius", 4, 0, 16, 0.5),
      mm("lip", "Stack lip", 3.2, 2, 6, 0.2),
    ],
    build: stackingBin,
    advice: () => advice(["Print open-up. The lip on top receives the next bin."]),
  },
  {
    id: "phone-stand",
    name: "Phone stand",
    category: "Desk",
    blurb: "Dock with a front lip, tall back, and optional cable channel.",
    keywords: ["phone", "stand", "dock", "tablet", "desk"],
    params: [
      mm("width", "Width", 80, 40, 200, 1),
      mm("depth", "Depth", 78, 50, 160, 1),
      mm("backHeight", "Back height", 72, 40, 160, 1),
      mm("wall", "Thickness", 4, 2.4, 10, 0.2),
      mm("groove", "Groove", 14, 8, 28, 0.5),
      mm("lip", "Front lip", 12, 8, 24, 0.5),
      { key: "cableSlot", kind: "bool", label: "Cable slot", default: true },
    ],
    build: phoneStand,
    advice: () =>
      advice([
        "Prints on its side — the silhouette is the first layers. No supports.",
        "Groove 12–16 mm covers most phones in a case.",
      ]),
  },
  {
    id: "wall-hook",
    name: "Wall hook",
    category: "Mount",
    blurb: "Flat J-hook with two screw holes. Prints on its face.",
    keywords: ["hook", "wall", "coat", "key", "hanger"],
    params: [
      mm("height", "Height", 70, 30, 180, 1),
      mm("reach", "Reach", 28, 12, 80, 1),
      mm("width", "Width", 22, 10, 60, 1),
      mm("plate", "Back plate", 18, 10, 40, 1),
      mm("hole", "Screw hole", 4.2, 2.5, 8, 0.1),
    ],
    build: wallHook,
    advice: (v) =>
      advice(
        ["Prints flat on the bed — the J is the first layers.", "PETG if it will hold a coat."],
        n(v, "reach", 28, 12, 80) > 40 ? "PETG" : "PLA or PETG",
      ),
  },
  {
    id: "cable-clip",
    name: "Cable clip",
    category: "Desk",
    blurb: "Snap-on C-clip sized to a cable diameter.",
    keywords: ["cable", "clip", "wire", "desk", "cord"],
    params: [
      mm("cable", "Cable diameter", 6, 2.5, 20, 0.2),
      mm("wall", "Wall", 2.2, 1.2, 5, 0.2),
      mm("width", "Width", 12, 6, 40, 0.5),
      mm("opening", "Opening angle", 70, 30, 120, 5),
    ],
    build: cableClip,
    advice: () =>
      advice(["Print on its side (already oriented).", "PETG springs back better than PLA."], "PETG"),
  },
  {
    id: "l-bracket",
    name: "L-bracket",
    category: "Mount",
    blurb: "Right-angle bracket with through-holes on both arms.",
    keywords: ["bracket", "angle", "mount", "corner", "screw"],
    params: [
      mm("armA", "Base arm", 40, 16, 120, 1),
      mm("armB", "Upright arm", 40, 16, 120, 1),
      mm("width", "Width", 24, 10, 80, 1),
      mm("thickness", "Thickness", 4, 2.4, 10, 0.2),
      mm("hole", "Hole diameter", 3.4, 2.2, 6, 0.1),
      mm("inset", "Hole inset", 10, 6, 30, 0.5),
    ],
    build: lBracket,
    advice: () =>
      advice(["Prints with the base on the bed. No supports.", "M3 holes default to 3.4 mm for a clean tap."], "PETG", "None", "30% gyroid"),
  },
  {
    id: "hex-coaster",
    name: "Hex coaster",
    category: "Everyday",
    blurb: "Hexagonal coaster or token with an optional rim.",
    keywords: ["coaster", "hex", "token", "crypto", "disc", "coin"],
    params: [
      mm("size", "Flat-to-flat", 90, 30, 180, 1),
      mm("height", "Thickness", 4, 2, 16, 0.2),
      mm("rim", "Rim height", 1.6, 0, 6, 0.2),
      mm("rimWidth", "Rim width", 4, 2, 12, 0.5),
      { key: "window", kind: "bool", label: "Center cutout", default: false },
    ],
    build: hexCoaster,
    advice: () => advice(["Print flat. A 0.2 mm layer looks clean on the hex faces."]),
  },
  {
    id: "nameplate",
    name: "Nameplate",
    category: "Everyday",
    blurb: "Raised-letter plaque. Stick to A–Z, 0–9.",
    keywords: ["name", "plate", "sign", "label", "plaque", "text"],
    params: [
      mm("width", "Width", 140, 40, 250, 1),
      mm("depth", "Height", 50, 20, 120, 1),
      mm("thickness", "Plate", 3.2, 1.6, 10, 0.2),
      mm("border", "Frame", 4, 0, 12, 0.5),
      mm("textHeight", "Letter height", 14, 6, 32, 0.5),
      {
        key: "label",
        kind: "text",
        label: "Lettering",
        default: "PRINTFORGE",
        maxLength: 16,
      },
    ],
    build: nameplate,
    advice: () =>
      advice([
        "Prints flat. Paint the letters in Bambu Studio for AMS color.",
        "Simplex stroke font — keep labels short and uppercase.",
      ]),
  },
  {
    id: "bag-clip",
    name: "Bag clip",
    category: "Everyday",
    blurb: "Springy chip-bag / filament-bag clip.",
    keywords: ["clip", "bag", "filament", "seal", "food"],
    params: [
      mm("width", "Width", 70, 30, 160, 1),
      mm("length", "Length", 42, 24, 90, 1),
      mm("gap", "Jaw gap", 2.2, 0.8, 6, 0.1),
      mm("thickness", "Jaw thickness", 3.2, 2, 8, 0.2),
    ],
    build: bagClip,
    advice: () =>
      advice(["Prints on its side. PETG for a clip that stays springy."], "PETG"),
  },
  {
    id: "tool-block",
    name: "Tool block",
    category: "Desk",
    blurb: "Block with a grid of holes for drivers, pens, or bits.",
    keywords: ["tool", "holder", "pen", "screwdriver", "desk", "stand"],
    params: [
      mm("width", "Width", 90, 40, 200, 1),
      mm("depth", "Depth", 60, 30, 160, 1),
      mm("height", "Height", 40, 16, 100, 1),
      mm("hole", "Hole diameter", 8, 3, 18, 0.2),
      count("cols", "Columns", 4, 1, 8),
      count("rows", "Rows", 2, 1, 5),
      mm("radius", "Corner radius", 4, 0, 16, 0.5),
    ],
    build: toolBlock,
    advice: () => advice(["Print sitting on the base. Holes print cleanly as vertical wells."]),
  },
  {
    id: "purge-bin",
    name: "Purge bin",
    category: "Printer",
    blurb: "Catch bin with a rear hanger lip for a poop chute.",
    keywords: ["poop", "purge", "bin", "bambu", "waste", "chute", "p2s"],
    params: [
      mm("width", "Width", 110, 50, 220, 1),
      mm("depth", "Depth", 70, 30, 160, 1),
      mm("height", "Height", 55, 20, 160, 1),
      mm("wall", "Wall", 1.6, 1.2, 4, 0.2),
      mm("lip", "Hanger lip", 18, 8, 40, 1),
    ],
    build: purgeBin,
    advice: () =>
      advice([
        "Measure the chute lip on your P2S and set hanger depth to match.",
        "PETG near the hot end if the bin sits close to the printer.",
      ]),
  },
  {
    id: "peg-hook",
    name: "Pegboard hook",
    category: "Mount",
    blurb: "Hook with two pegs for 25.4 mm (1 in) pegboard.",
    keywords: ["pegboard", "peg", "hook", "workshop", "garage"],
    params: [
      mm("reach", "Reach", 36, 16, 80, 1),
      mm("width", "Width", 14, 8, 36, 1),
      mm("peg", "Peg diameter", 6, 4, 8, 0.1),
      mm("spacing", "Peg spacing", 25.4, 20, 40, 0.1),
    ],
    build: pegHook,
    advice: () =>
      advice(["Prints with the plate on the bed, pegs sticking out.", "Default 6 mm pegs fit most 1/4 in boards."], "PETG"),
  },
  {
    id: "washer",
    name: "Washer / spacer",
    category: "Mount",
    blurb: "Parametric washer. Set inner, outer, and height.",
    keywords: ["washer", "spacer", "ring", "standoff"],
    params: [
      mm("outer", "Outer diameter", 16, 6, 80, 0.2),
      mm("inner", "Inner diameter", 6, 2, 70, 0.2),
      mm("height", "Height", 3, 0.8, 20, 0.2),
    ],
    build: washer,
    advice: () =>
      advice(["Add a 5 mm brim for small washers.", "Inner hole prints slightly undersized — add 0.2 mm if it must clear a bolt."]),
  },
  {
    id: "cable-comb",
    name: "Cable comb",
    category: "Desk",
    blurb: "Slotted comb to keep a run of cables in line.",
    keywords: ["comb", "cable", "management", "desk", "wire"],
    params: [
      count("slots", "Slots", 6, 2, 16),
      mm("pitch", "Pitch", 8, 5, 16, 0.5),
      mm("slot", "Slot width", 4, 2, 10, 0.2),
      mm("height", "Height", 16, 8, 40, 1),
      mm("thickness", "Thickness", 8, 4, 20, 0.5),
    ],
    build: cableComb,
    advice: () => advice(["Prints flat. Slot width = cable diameter + 0.4 mm."]),
  },
];

export const DESIGNS_BY_ID = Object.fromEntries(
  DESIGNS.map((d) => [d.id, d]),
) as Record<string, Design>;

export function getDesign(id: string): Design {
  return DESIGNS_BY_ID[id] ?? DESIGNS[0]!;
}

export function catalogSchema() {
  return DESIGNS.map((d) => ({
    id: d.id,
    name: d.name,
    blurb: d.blurb,
    keywords: d.keywords,
    params: d.params.map((p) => {
      if (p.kind === "number") {
        return {
          key: p.key,
          kind: p.kind,
          min: p.min,
          max: p.max,
          unit: p.unit,
          default: p.default,
        };
      }
      if (p.kind === "bool") {
        return { key: p.key, kind: p.kind, default: p.default };
      }
      if (p.kind === "select") {
        return { key: p.key, kind: p.kind, default: p.default, options: p.options };
      }
      return { key: p.key, kind: p.kind, default: p.default };
    }),
  }));
}
