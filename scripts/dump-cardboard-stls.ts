import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cardboardPress } from "../src/lib/print/cardboard-press.ts";
import { bboxOf, type Geom3 } from "../src/lib/print/geometry.ts";
import { writeBinaryStl } from "../src/lib/print/stl.ts";
import { asParts } from "../src/lib/print/types.ts";

const values = {
  innerL: 140,
  innerW: 70,
  wall: 5,
  height: 50,
  hole: 1.9,
  brand: "D3DD",
};
const outDirs = [
  "/workspace/public/prints/d3dd-cardboard",
  "/workspace/artifacts/d3dd-cardboard",
];

function writeStl(dir: string, name: string, geom: Geom3) {
  const buf = writeBinaryStl(geom, name);
  writeFileSync(join(dir, `${name}.stl`), Buffer.from(buf));
  const b = bboxOf(geom);
  console.log(`${name}.stl  ${b.size.map((n) => n.toFixed(1)).join(" × ")} mm  ${(buf.byteLength / 1024).toFixed(0)} kB`);
}

for (const dir of outDirs) mkdirSync(dir, { recursive: true });

const jobs = [
  { name: "D3DD_cardboard_sleeve", part: "sleeve" },
  { name: "D3DD_cardboard_stamp", part: "stamp" },
  { name: "D3DD_cardboard_sieve", part: "sieve" },
  { name: "D3DD_cardboard_tray", part: "tray" },
];

const t0 = Date.now();
for (const job of jobs) {
  const parts = asParts(cardboardPress({ ...values, part: job.part }));
  for (const dir of outDirs) writeStl(dir, job.name, parts[0]!.geom);
}
console.log("done in", Date.now() - t0, "ms");
