import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { padDryer } from "../src/lib/print/pad-dryer.ts";
import { bboxOf, type Geom3 } from "../src/lib/print/geometry.ts";
import { writeBinaryStl } from "../src/lib/print/stl.ts";
import { asParts } from "../src/lib/print/types.ts";

const values = { pad: 70, height: 108, brand: "D3DD" };
const outDirs = [
  "/workspace/public/prints/d3dd-pad-dryer",
  "/workspace/artifacts/d3dd-pad-dryer",
];

function writeStl(dir: string, name: string, geom: Geom3) {
  const buf = writeBinaryStl(geom, name);
  writeFileSync(join(dir, `${name}.stl`), Buffer.from(buf));
  const b = bboxOf(geom);
  console.log(`${name}.stl  ${b.size.map((n) => n.toFixed(1)).join(" × ")} mm  ${(buf.byteLength / 1024).toFixed(0)} kB`);
}

for (const dir of outDirs) mkdirSync(dir, { recursive: true });

for (const part of ["base", "basket"] as const) {
  const result = padDryer({ ...values, part });
  const geom = asParts(result)[0]!.geom;
  const name = part === "base" ? "D3DD_pad_base" : "D3DD_pad_holder";
  for (const dir of outDirs) writeStl(dir, name, geom);
}
console.log("done");
