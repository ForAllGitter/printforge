import type { Geom3 } from "./jscad";

export type Scalar = number | boolean | string;
export type Values = Record<string, Scalar>;

export type NumberParam = {
  key: string;
  kind: "number";
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  default: number;
};

export type BoolParam = {
  key: string;
  kind: "bool";
  label: string;
  default: boolean;
};

export type TextParam = {
  key: string;
  kind: "text";
  label: string;
  default: string;
  maxLength: number;
};

export type SelectParam = {
  key: string;
  kind: "select";
  label: string;
  options: { value: string; label: string }[];
  default: string;
};

export type ParamDef = NumberParam | BoolParam | TextParam | SelectParam;

export type PrintAdvice = {
  layer: string;
  walls: string;
  infill: string;
  supports: string;
  material: string;
  notes: string[];
};

export type ColorPart = {
  name: string;
  color: string;
  geom: Geom3;
};

export type Design = {
  id: string;
  name: string;
  category: "Storage" | "Desk" | "Mount" | "Everyday" | "Printer" | "Crypto";
  blurb: string;
  keywords: string[];
  params: ParamDef[];
  build: (values: Values) => Geom3 | ColorPart[];
  advice: (values: Values) => PrintAdvice;
};

export const P2S = {
  bed: 256,
  height: 256,
  nozzle: 0.4,
  name: "Bambu Lab P2S",
} as const;

export function defaultsOf(design: Design): Values {
  const values: Values = {};
  for (const p of design.params) values[p.key] = p.default;
  return values;
}

export function num(values: Values, key: string, fallback: number): number {
  const v = values[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function bool(values: Values, key: string, fallback: boolean): boolean {
  const v = values[key];
  return typeof v === "boolean" ? v : fallback;
}

export function str(values: Values, key: string, fallback: string): string {
  const v = values[key];
  return typeof v === "string" ? v : fallback;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function asParts(
  result: Geom3 | ColorPart[],
  fallbackColor = "#e6dfd2",
): ColorPart[] {
  if (Array.isArray(result)) return result;
  return [{ name: "body", color: fallbackColor, geom: result }];
}
