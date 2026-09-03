/** SVG path → polygon contours. Supports M L H V C S Q T Z (absolute + relative). */

export type Pt = [number, number];

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function quad(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
}

function closeEnough(a: Pt, b: Pt) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
}

function sampleCubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i <= steps; i++) out.push(bezier(p0, p1, p2, p3, i / steps));
  return out;
}

function sampleQuad(p0: Pt, p1: Pt, p2: Pt, steps: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i <= steps; i++) out.push(quad(p0, p1, p2, i / steps));
  return out;
}

function tokenize(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    if (m[1]) out.push(m[1]);
    else out.push(Number(m[2]));
  }
  return out;
}

function area(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export function pathContours(d: string, curveSteps = 10): Pt[][] {
  const tok = tokenize(d);
  const contours: Pt[][] = [];
  let cur: Pt[] = [];
  let i = 0;
  let cmd = "M";
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let px = 0;
  let py = 0;
  let prev = "M";

  const num = () => Number(tok[i++]);
  const push = (p: Pt) => {
    const last = cur[cur.length - 1];
    if (!last || !closeEnough(last, p)) cur.push(p);
    x = p[0];
    y = p[1];
  };
  const startContour = () => {
    if (cur.length > 2) contours.push(cur);
    cur = [];
  };

  while (i < tok.length) {
    const t = tok[i];
    if (typeof t === "string") {
      cmd = t;
      i++;
    }
    const rel = cmd === cmd.toLowerCase();
    const c = cmd.toUpperCase();

    if (c === "Z") {
      if (cur.length > 2) {
        if (!closeEnough(cur[0]!, cur[cur.length - 1]!)) {
          /* closed by polygon() */
        }
        contours.push(cur);
      }
      cur = [];
      x = sx;
      y = sy;
      prev = "Z";
      continue;
    }

    if (c === "M") {
      startContour();
      const nx = num();
      const ny = num();
      x = rel ? x + nx : nx;
      y = rel ? y + ny : ny;
      sx = x;
      sy = y;
      push([x, y]);
      cmd = rel ? "l" : "L";
      prev = "M";
      continue;
    }

    if (c === "L") {
      const nx = num();
      const ny = num();
      push([rel ? x + nx : nx, rel ? y + ny : ny]);
      prev = "L";
      continue;
    }
    if (c === "H") {
      const nx = num();
      push([rel ? x + nx : nx, y]);
      prev = "L";
      continue;
    }
    if (c === "V") {
      const ny = num();
      push([x, rel ? y + ny : ny]);
      prev = "L";
      continue;
    }
    if (c === "C") {
      const x1 = rel ? x + num() : num();
      const y1 = rel ? y + num() : num();
      const x2 = rel ? x + num() : num();
      const y2 = rel ? y + num() : num();
      const x3 = rel ? x + num() : num();
      const y3 = rel ? y + num() : num();
      for (const p of sampleCubic([x, y], [x1, y1], [x2, y2], [x3, y3], curveSteps)) push(p);
      px = x2;
      py = y2;
      prev = "C";
      continue;
    }
    if (c === "S") {
      const x2 = rel ? x + num() : num();
      const y2 = rel ? y + num() : num();
      const x3 = rel ? x + num() : num();
      const y3 = rel ? y + num() : num();
      const x1 = prev === "C" || prev === "S" ? 2 * x - px : x;
      const y1 = prev === "C" || prev === "S" ? 2 * y - py : y;
      for (const p of sampleCubic([x, y], [x1, y1], [x2, y2], [x3, y3], curveSteps)) push(p);
      px = x2;
      py = y2;
      prev = "S";
      continue;
    }
    if (c === "Q") {
      const x1 = rel ? x + num() : num();
      const y1 = rel ? y + num() : num();
      const x2 = rel ? x + num() : num();
      const y2 = rel ? y + num() : num();
      for (const p of sampleQuad([x, y], [x1, y1], [x2, y2], curveSteps)) push(p);
      px = x1;
      py = y1;
      prev = "Q";
      continue;
    }
    if (c === "T") {
      const x2 = rel ? x + num() : num();
      const y2 = rel ? y + num() : num();
      const x1 = prev === "Q" || prev === "T" ? 2 * x - px : x;
      const y1 = prev === "Q" || prev === "T" ? 2 * y - py : y;
      for (const p of sampleQuad([x, y], [x1, y1], [x2, y2], curveSteps)) push(p);
      px = x1;
      py = y1;
      prev = "T";
      continue;
    }
    if (c === "A") {
      // Approximate arc as a line. These logos barely use arcs.
      i += 5;
      const nx = num();
      const ny = num();
      push([rel ? x + nx : nx, rel ? y + ny : ny]);
      prev = "A";
      continue;
    }
    throw new Error(`unhandled SVG command ${cmd}`);
  }
  if (cur.length > 2) contours.push(cur);
  return contours.filter((c) => Math.abs(area(c)) > 1e-4);
}

export function scaleFlip(contours: Pt[][], cx: number, cy: number, s: number): Pt[][] {
  return contours.map((c) => c.map(([x, y]) => [(x - cx) * s, (cy - y) * s] as Pt));
}

export function largestFirst(contours: Pt[][]): Pt[][] {
  return [...contours].sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
}
