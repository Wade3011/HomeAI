'use client';

import { RoundedBox } from '@react-three/drei';
import type { MeshMaterialKind } from '@/lib/planner/meshMaterials';
import { materialSurface } from '@/lib/planner/meshMaterials';

type EmissiveProps = {
  emissive: string;
  emissiveIntensity: number;
};

type BasePartProps = EmissiveProps & {
  x?: number;
  y?: number;
  z?: number;
  color: string;
  material?: MeshMaterialKind;
  opacity?: number;
  transparent?: boolean;
  pickable?: boolean;
};

function StandardMaterial({
  color,
  material = 'matte',
  emissive,
  emissiveIntensity,
  opacity = 1,
  transparent = false,
}: BasePartProps) {
  const surface = materialSurface(material);
  return (
    <meshStandardMaterial
      color={color}
      roughness={surface.roughness}
      metalness={surface.metalness}
      envMapIntensity={surface.envMapIntensity}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      transparent={transparent}
      opacity={opacity}
    />
  );
}

export function Part({
  w,
  h,
  d,
  x = 0,
  y = 0,
  z = 0,
  color,
  material = 'matte',
  emissive,
  emissiveIntensity,
  opacity = 1,
  transparent = false,
  pickable = true,
}: BasePartProps & { w: number; h: number; d: number }) {
  return (
    <mesh position={[x, y, z]} raycast={pickable ? undefined : () => null}>
      <boxGeometry args={[w, h, d]} />
      <StandardMaterial
        color={color}
        material={material}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        opacity={opacity}
        transparent={transparent}
      />
    </mesh>
  );
}

export function RoundedPart({
  w,
  h,
  d,
  radius,
  x = 0,
  y = 0,
  z = 0,
  color,
  material = 'matte',
  emissive,
  emissiveIntensity,
  opacity = 1,
  transparent = false,
  pickable = true,
}: BasePartProps & { w: number; h: number; d: number; radius?: number }) {
  const r = radius ?? Math.min(w, h, d) * 0.06;
  return (
    <RoundedBox
      args={[w, h, d]}
      radius={Math.max(r, 0.008)}
      smoothness={4}
      position={[x, y, z]}
      raycast={pickable ? undefined : () => null}
    >
      <StandardMaterial
        color={color}
        material={material}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        opacity={opacity}
        transparent={transparent}
      />
    </RoundedBox>
  );
}

export function CylinderPart({
  radiusTop,
  radiusBottom,
  height,
  x = 0,
  y = 0,
  z = 0,
  color,
  material = 'matte',
  emissive,
  emissiveIntensity,
  opacity = 1,
  transparent = false,
  pickable = true,
}: BasePartProps & {
  radiusTop: number;
  radiusBottom: number;
  height: number;
}) {
  return (
    <mesh position={[x, y, z]} raycast={pickable ? undefined : () => null}>
      <cylinderGeometry args={[radiusTop, radiusBottom, height, 24]} />
      <StandardMaterial
        color={color}
        material={material}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        opacity={opacity}
        transparent={transparent}
      />
    </mesh>
  );
}

export function SpherePart({
  radius,
  x = 0,
  y = 0,
  z = 0,
  scale,
  color,
  material = 'matte',
  emissive,
  emissiveIntensity,
  opacity = 1,
  transparent = false,
  pickable = true,
}: BasePartProps & {
  radius: number;
  scale?: [number, number, number];
}) {
  return (
    <mesh position={[x, y, z]} scale={scale} raycast={pickable ? undefined : () => null}>
      <sphereGeometry args={[radius, 20, 16]} />
      <StandardMaterial
        color={color}
        material={material}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        opacity={opacity}
        transparent={transparent}
      />
    </mesh>
  );
}

export function TorusPart({
  radius,
  tube,
  x = 0,
  y = 0,
  z = 0,
  rotation,
  color,
  material = 'matte',
  emissive,
  emissiveIntensity,
  opacity = 1,
  transparent = false,
  pickable = true,
}: BasePartProps & {
  radius: number;
  tube: number;
  rotation?: [number, number, number];
}) {
  return (
    <mesh
      position={[x, y, z]}
      rotation={rotation ?? [Math.PI / 2, 0, 0]}
      raycast={pickable ? undefined : () => null}
    >
      <torusGeometry args={[radius, tube, 12, 24]} />
      <StandardMaterial
        color={color}
        material={material}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        opacity={opacity}
        transparent={transparent}
      />
    </mesh>
  );
}

/** Horizontal bar pull on a cabinet face (z = front). */
export function CabinetPullBar({
  w,
  y,
  z,
  emissive,
  emissiveIntensity,
  pickable,
}: {
  w: number;
  y: number;
  z: number;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
}) {
  return (
    <Part
      w={w * 0.32}
      h={0.018}
      d={0.022}
      y={y}
      z={z}
      color="#b8bcc0"
      material="chrome"
      emissive={emissive}
      emissiveIntensity={0}
      pickable={pickable}
    />
  );
}

/** Recessed door panel inset on cabinet face. */
export function CabinetDoorInset({
  w,
  h,
  y,
  z,
  color,
  emissive,
  emissiveIntensity,
  pickable,
}: {
  w: number;
  h: number;
  y: number;
  z: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
}) {
  return (
    <Part
      w={w * 0.86}
      h={h * 0.78}
      d={0.012}
      y={y}
      z={z}
      color={color}
      material="wood"
      emissive={emissive}
      emissiveIntensity={emissiveIntensity * 0.35}
      pickable={pickable}
    />
  );
}

/** Simple chrome faucet above a sink. */
export function FaucetHint({
  x,
  y,
  z,
  emissive,
  emissiveIntensity,
  pickable,
}: {
  x: number;
  y: number;
  z: number;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
}) {
  return (
    <>
      <CylinderPart
        radiusTop={0.015}
        radiusBottom={0.018}
        height={0.14}
        x={x}
        y={y}
        z={z}
        color="#c8ccd0"
        material="chrome"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <CylinderPart
        radiusTop={0.012}
        radiusBottom={0.012}
        height={0.06}
        x={x}
        y={y + 0.08}
        z={z + 0.04}
        color="#c8ccd0"
        material="chrome"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
    </>
  );
}
