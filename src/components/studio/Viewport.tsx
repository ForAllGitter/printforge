import { ContactShadows, Grid, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import type { BufferGeometry } from "three";
import { P2S } from "@/lib/print/types";

function FitCamera({
  size,
}: {
  size: [number, number, number];
}) {
  const { camera, controls } = useThree();
  useLayoutEffect(() => {
    const maxDim = Math.max(size[0], size[1], size[2], 36);
    const dist = maxDim * 2.15;
    camera.position.set(dist * 0.48, dist * 0.92, dist * 0.7);
    camera.near = Math.max(0.1, maxDim / 400);
    camera.far = Math.max(4000, maxDim * 12);
    camera.updateProjectionMatrix();
    const ty = Math.max(size[1] * 0.5, 4);
    camera.lookAt(0, ty, 0);
    const orbit = controls as unknown as
      | { target: { set: (x: number, y: number, z: number) => void }; update?: () => void }
      | null;
    if (orbit?.target) {
      orbit.target.set(0, ty, 0);
      orbit.update?.();
    }
  }, [camera, controls, size]);
  return null;
}

function ModelMesh({
  geometry,
  color,
}: {
  geometry: BufferGeometry;
  color: string;
}) {
  const isWhite = color.toLowerCase() === "#ffffff" || color.toLowerCase() === "#fff";
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color={color}
        roughness={isWhite ? 0.32 : 0.42}
        metalness={0.06}
        clearcoat={isWhite ? 0.35 : 0.18}
        clearcoatRoughness={0.45}
        sheen={0.18}
        sheenColor={color}
      />
    </mesh>
  );
}

export type ViewPart = {
  geometry: BufferGeometry;
  color: string;
};

export function Viewport({
  parts,
  size,
}: {
  parts: ViewPart[];
  size: [number, number, number];
}) {
  const plate = P2S.bed;
  const key = useMemo(
    () => size.map((n) => n.toFixed(2)).join("x") + String(parts.length),
    [size, parts.length],
  );
  const maxDim = Math.max(size[0], size[1], size[2], plate);
  const far = Math.max(4000, maxDim * 12);

  return (
    <div className="relative h-full min-h-[220px] w-full overflow-hidden bg-background">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [140, 110, 160], fov: 38, near: 0.1, far }}
        onCreated={({ gl }) => {
          gl.setClearColor("#0b0c0e");
        }}
      >
        <hemisphereLight args={["#f2efe8", "#1c1e22", 1.05]} />
        <directionalLight position={[90, 160, 70]} intensity={1.55} />
        <directionalLight position={[-70, 80, -40]} intensity={0.45} />
        <directionalLight position={[0, 40, 120]} intensity={0.55} />

        <FitCamera key={key} size={size} />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2.02}
          minPolarAngle={0.12}
          minDistance={20}
          maxDistance={Math.max(900, maxDim * 5)}
        />
        <Grid
          args={[plate, plate]}
          cellSize={10}
          cellThickness={0.6}
          cellColor="#2a2d33"
          sectionSize={50}
          sectionThickness={1.1}
          sectionColor="#3d434c"
          fadeDistance={Math.max(420, maxDim * 1.2)}
          fadeStrength={1.2}
          infiniteGrid={false}
          position={[0, 0.02, 0]}
        />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.4, 0]}
          receiveShadow
        >
          <planeGeometry args={[plate, plate]} />
          <meshStandardMaterial color="#1e2228" roughness={0.92} metalness={0.08} />
        </mesh>
        {parts.map((p, i) => (
          <ModelMesh key={`${p.color}-${i}`} geometry={p.geometry} color={p.color} />
        ))}
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.28}
          scale={Math.max(plate, size[0] * 1.2)}
          blur={2.2}
          far={Math.max(50, size[1] * 1.4)}
        />
      </Canvas>
    </div>
  );
}
