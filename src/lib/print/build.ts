import { useEffect, useMemo, useState } from "react";
import { getDesign } from "./catalog";
import { kitFilesFor, kitPartOf, kitScaleOf, loadKitPreview } from "./kit-stl";
import { geomToThree } from "./mesh";
import { inspect } from "./p2s";
import { useStudio } from "./store";
import { asParts } from "./types";
import type { ColorPart } from "./types";
import type { BufferGeometry } from "three";
import type { Geom3 } from "./geometry";

export type BuiltPart = ColorPart & { geometry: BufferGeometry };

export type BuiltModel = {
  design: ReturnType<typeof getDesign>;
  parts: BuiltPart[];
  geom: Geom3 | null;
  stats: ReturnType<typeof inspect> | null;
  geometry: BufferGeometry | null;
  error: string | null;
  kitFile: string | null;
};

export function useDebouncedValues() {
  const values = useStudio((s) => s.values);
  const designId = useStudio((s) => s.designId);
  const [ready, setReady] = useState({ designId, values });
  useEffect(() => {
    const t = window.setTimeout(() => setReady({ designId, values }), 50);
    return () => window.clearTimeout(t);
  }, [designId, values]);
  return ready;
}

function buildProcedural(designId: string, values: ReturnType<typeof useDebouncedValues>["values"]): BuiltModel {
  const design = getDesign(designId);
  try {
    const result = design.build(values);
    const colorParts = asParts(result);
    const stats = inspect(colorParts.map((p) => p.geom));
    const parts: BuiltPart[] = colorParts.map((p) => ({
      ...p,
      geometry: geomToThree(p.geom),
    }));
    return {
      design,
      parts,
      geom: colorParts[0]?.geom ?? null,
      stats,
      geometry: parts[0]?.geometry ?? null,
      error: null,
      kitFile: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not build this solid";
    return {
      design,
      parts: [],
      geom: null,
      stats: null,
      geometry: null,
      error: message,
      kitFile: null,
    };
  }
}

export function useBuiltModel(): BuiltModel {
  const { designId, values } = useDebouncedValues();
  const procedural = useMemo(() => buildProcedural(designId, values), [designId, values]);
  const [kit, setKit] = useState<BuiltModel | null>(null);

  const part = kitPartOf(values);
  const scale = kitScaleOf(values);
  const files = designId === "briquette-press" ? kitFilesFor(part) : null;

  useEffect(() => {
    if (!files) {
      setKit(null);
      return;
    }
    let live = true;
    loadKitPreview(files.preview, scale)
      .then(({ geometry, size }) => {
        if (!live) return;
        const volume = size[0] * size[1] * size[2] * 0.28;
        const gramsPla = (volume / 1000) * 1.24;
        const stats = {
          size,
          volume,
          gramsPla,
          minutes: volume / 15 / 60,
          checks: [
            {
              ok: size[0] <= 256.4 && size[1] <= 256.4,
              label: "Bed fit",
              detail:
                size[0] <= 256 && size[1] <= 256
                  ? `${size[0].toFixed(1)} × ${size[1].toFixed(1)} mm on a 256 mm plate`
                  : `${size[0].toFixed(1)} × ${size[1].toFixed(1)} mm exceeds the 256 mm P2S plate`,
            },
            {
              ok: size[2] <= 256.4,
              label: "Height",
              detail:
                size[2] <= 256
                  ? `${size[2].toFixed(1)} mm of 256 mm Z`
                  : `${size[2].toFixed(1)} mm is taller than the P2S`,
            },
            {
              ok: gramsPla < 400,
              label: "Filament",
              detail: `~${gramsPla.toFixed(1)} g PLA`,
            },
          ],
        };
        const design = getDesign(designId);
        setKit({
          design,
          parts: [
            {
              name: "body",
              color: "#e6dfd2",
              geom: procedural.geom as BuiltPart["geom"],
              geometry,
            },
          ],
          geom: procedural.geom,
          stats,
          geometry,
          error: null,
          kitFile: files.full,
        });
      })
      .catch(() => {
        if (live) setKit(null);
      });
    return () => {
      live = false;
    };
  }, [files?.preview, files?.full, scale, designId, part, procedural.geom]);

  return kit ?? procedural;
}
