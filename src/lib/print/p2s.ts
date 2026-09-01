import { bboxOf, volumeMm3, type Geom3 } from "./geometry";
import { P2S } from "./types";

export type Check = {
  ok: boolean;
  label: string;
  detail: string;
};

function combinedSize(geoms: Geom3[]): [number, number, number] {
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (const g of geoms) {
    const { min, max } = bboxOf(g);
    minX = Math.min(minX, min[0]);
    minY = Math.min(minY, min[1]);
    minZ = Math.min(minZ, min[2]);
    maxX = Math.max(maxX, max[0]);
    maxY = Math.max(maxY, max[1]);
    maxZ = Math.max(maxZ, max[2]);
  }
  if (!Number.isFinite(minX)) return [0, 0, 0];
  return [maxX - minX, maxY - minY, maxZ - minZ];
}

export function inspect(geom: Geom3 | Geom3[]): {
  size: [number, number, number];
  volume: number;
  gramsPla: number;
  minutes: number;
  checks: Check[];
} {
  const geoms = Array.isArray(geom) ? geom : [geom];
  const size = combinedSize(geoms);
  const volume = geoms.reduce((sum, g) => sum + volumeMm3(g), 0);
  const gramsPla = (volume / 1000) * 1.24;
  const minutes = volume / 15 / 60;
  const [x, y, z] = size;
  const checks: Check[] = [
    {
      ok: x <= P2S.bed + 0.4 && y <= P2S.bed + 0.4,
      label: "Bed fit",
      detail:
        x <= P2S.bed && y <= P2S.bed
          ? `${fmt(x)} × ${fmt(y)} mm on a ${P2S.bed} mm plate`
          : `${fmt(x)} × ${fmt(y)} mm exceeds the ${P2S.bed} mm P2S plate`,
    },
    {
      ok: z <= P2S.height + 0.4,
      label: "Height",
      detail:
        z <= P2S.height
          ? `${fmt(z)} mm of ${P2S.height} mm Z`
          : `${fmt(z)} mm is taller than the P2S`,
    },
    {
      ok: gramsPla < 400,
      label: "Filament",
      detail: `~${gramsPla.toFixed(1)} g PLA`,
    },
  ];
  return { size, volume, gramsPla, minutes, checks };
}

export function fmt(n: number) {
  return Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1);
}

export const FILAMENTS = [
  { id: "xmr-orange", name: "XMR Orange", color: "#FF6600" },
  { id: "btc-orange", name: "BTC Orange", color: "#F7931A" },
  { id: "doge-gold", name: "DOGE Gold", color: "#C2A633" },
  { id: "ltc-blue", name: "LTC Blue", color: "#345D9D" },
  { id: "dgb-blue", name: "DGB Blue", color: "#0066CC" },
  { id: "true-white", name: "True White", color: "#FFFFFF" },
  { id: "xmr-grey", name: "XMR Grey", color: "#4C4C4C" },
] as const;
