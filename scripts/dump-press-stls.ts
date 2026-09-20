import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handPress } from "../src/lib/print/handpress.ts";
import { bboxOf, type Geom3 } from "../src/lib/print/geometry.ts";
import { writeBinaryStl } from "../src/lib/print/stl.ts";
import { asParts } from "../src/lib/print/types.ts";

const values = { scale: 114, brand: "D3DD", hole: 7.5, holes: 8 };
const outDirs = [
  "/workspace/public/prints/d3dd-press",
  "/workspace/artifacts/d3dd-press",
];

function writeStl(dir: string, name: string, geom: Geom3) {
  const buf = writeBinaryStl(geom, name);
  const path = join(dir, `${name}.stl`);
  writeFileSync(path, Buffer.from(buf));
  const b = bboxOf(geom);
  const size = b.size.map((n) => n.toFixed(1)).join(" × ");
  console.log(`${name}.stl  ${size} mm  ${(buf.byteLength / 1024).toFixed(0)} kB`);
}

for (const dir of outDirs) mkdirSync(dir, { recursive: true });

const jobs: { name: string; part: string }[] = [
  { name: "D3DD_handle", part: "handle" },
  { name: "D3DD_sleeve", part: "sleeve" },
  { name: "D3DD_hex-plate", part: "plate" },
  { name: "D3DD_sieve", part: "ring" },
];

const t0 = Date.now();
for (const job of jobs) {
  const result = handPress({ ...values, part: job.part });
  const parts = asParts(result);
  if (job.part === "sleeve") {
    for (const p of parts) {
      const fname = p.name.startsWith("sleeve") ? `D3DD_${p.name}` : `D3DD_${p.name}`;
      for (const dir of outDirs) writeStl(dir, fname, p.geom);
    }
  } else {
    for (const dir of outDirs) writeStl(dir, job.name, parts[0]!.geom);
  }
}
console.log("done in", Date.now() - t0, "ms");
