import { useEffect, useMemo, useState } from "react";
import { getDesign } from "./catalog";
import { geomToThree } from "./mesh";
import { inspect } from "./p2s";
import { useStudio } from "./store";
import { asParts } from "./types";
import type { ColorPart } from "./types";
import type { BufferGeometry } from "three";

export type BuiltPart = ColorPart & { geometry: BufferGeometry };

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

export function useBuiltModel() {
  const { designId, values } = useDebouncedValues();
  return useMemo(() => {
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
        error: null as string | null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not build this solid";
      return {
        design,
        parts: [] as BuiltPart[],
        geom: null,
        stats: null,
        geometry: null,
        error: message,
      };
    }
  }, [designId, values]);
}
