import jscad from "@jscad/modeling";

type Modeling = typeof jscad;

const modeling: Modeling =
  ((jscad as { default?: Modeling }).default ?? jscad);

export const {
  primitives,
  booleans,
  transforms,
  extrusions,
  expansions,
  measurements,
  geometries,
  text,
} = modeling;

export type Geom3 = ReturnType<typeof primitives.cuboid>;
export type Geom2 = ReturnType<typeof primitives.rectangle>;
