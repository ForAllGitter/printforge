import { DESIGNS, getDesign } from "./catalog";
import { defaultsOf, type Values } from "./types";

export type BriefResult = {
  designId: string;
  values: Values;
  note: string;
  source: "local" | "ai";
};

const SIZE_RE = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?/i;
const MM_RE = /(\d+(?:\.\d+)?)\s*mm/gi;

export function parseBrief(prompt: string): BriefResult {
  const q = prompt.trim().toLowerCase();
  if (!q) {
    const d = DESIGNS[0]!;
    return {
      designId: d.id,
      values: defaultsOf(d),
      note: "Pick a model or describe what you want in millimetres.",
      source: "local",
    };
  }

  let best = DESIGNS[0]!;
  let bestScore = 0;
  for (const d of DESIGNS) {
    let score = 0;
    if (q.includes(d.id.replace("-", " ")) || q.includes(d.name.toLowerCase())) {
      score += 8;
    }
    for (const kw of d.keywords) {
      if (q.includes(kw)) score += 3;
    }
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }

  const values = defaultsOf(best);
  const size = q.match(SIZE_RE);
  if (size) {
    const a = Number(size[1]);
    const b = Number(size[2]);
    const c = size[3] ? Number(size[3]) : undefined;
    if ("width" in values) values.width = a;
    if ("depth" in values) values.depth = b;
    if (c !== undefined && "height" in values) values.height = c;
    else if (c !== undefined && "backHeight" in values) values.backHeight = c;
    if ("size" in values && best.id === "hex-coaster") values.size = a;
    if ("outer" in values && best.id === "washer") {
      values.outer = a;
      values.inner = b;
      if (c !== undefined) values.height = c;
    }
    if (best.id.endsWith("-coin")) {
      values.diameter = a;
      values.height = b;
      if (c !== undefined) values.rim = c;
    }
  }

  if (/no lid|without lid|open/.test(q) && "withLid" in values) values.withLid = false;
  if (/with lid|lidded/.test(q) && "withLid" in values) values.withLid = true;

  const grid = q.match(/(\d+)\s*(?:x|by|×)\s*(\d+)\s*(?:grid|div|comp|bin|cell)?/);
  if (grid && "cols" in values) {
    values.cols = Number(grid[1]);
    if ("rows" in values) values.rows = Number(grid[2]);
  }
  const compartments = q.match(/(\d+)\s*(?:compartment|divider|slot)/);
  if (compartments && "cols" in values) values.cols = Number(compartments[1]);

  const quoted = prompt.match(/["“]([^"”]+)["”]/);
  if (quoted && "label" in values) {
    values.label = quoted[1]!.slice(0, 16).toUpperCase();
  } else if (best.id === "nameplate") {
    const as = prompt.match(/(?:saying|text|that says)\s+([a-z0-9 \-]+)/i);
    if (as) values.label = as[1]!.trim().slice(0, 16).toUpperCase();
  }

  const mmHits = [...prompt.matchAll(MM_RE)].map((m) => Number(m[1]));
  if (!size && mmHits.length === 1 && "cable" in values) values.cable = mmHits[0]!;
  if (!size && mmHits.length === 1 && best.id === "washer" && "outer" in values) {
    values.outer = mmHits[0]!;
  }
  if (!size && mmHits.length >= 1 && best.id.endsWith("-coin")) {
    values.diameter = mmHits[0]!;
    if (mmHits[1]) values.height = mmHits[1]!;
  }

  if (/fit p2s|fit the p2s|scale to p2s/.test(q) && "fitP2s" in values) {
    values.fitP2s = true;
  }
  if (/desk coin|small coin/.test(q) && best.id.endsWith("-coin")) {
    values.diameter = 50;
    values.height = 6;
    values.wall = 0;
    values.fill = "face";
    values.fitP2s = false;
    values.rim = 1.5;
  }

  const design = getDesign(best.id);
  const note =
    bestScore > 0
      ? `Mapped to ${design.name}. Dial in millimetres on the right, then download the STL.`
      : `No close match — opened ${design.name}. Name the object (box, hook, stand…) and sizes like 120x80x40.`;

  return { designId: best.id, values, note, source: "local" };
}
