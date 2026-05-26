'use client';

import type { CustomItemSpec } from '@/types';
import { meshColorForResolved, meshEmissive } from '@/lib/planner/meshColors';
import type { ResolvedPlacementItem } from '@/lib/placementItem';
import { isSectionalShape, sectionalPartsCenteredFt } from '@/lib/sectionalGeometry';

export function CustomItemMesh({
  spec,
  resolved,
  selected,
  pickable = true,
  opacity = 1,
  transparent = false,
}: {
  spec: CustomItemSpec;
  resolved: ResolvedPlacementItem;
  selected: boolean;
  pickable?: boolean;
  opacity?: number;
  transparent?: boolean;
}) {
  const height = resolved.heightFt;
  const color = meshColorForResolved(resolved, selected);
  const emissive = meshEmissive(selected);
  const raycast = pickable ? undefined : (() => null);

  if (spec.shape === 'round') {
    const r = Math.min(resolved.widthFt, resolved.depthFt) / 2;
    return (
      <mesh raycast={raycast}>
        <cylinderGeometry args={[r, r, height, 24]} />
        <meshLambertMaterial
          color={color}
          emissive={emissive.color}
          emissiveIntensity={emissive.intensity}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>
    );
  }

  if (isSectionalShape(spec.shape)) {
    const parts = sectionalPartsCenteredFt(spec);
    return (
      <group>
        {parts.map((part, idx) => (
          <mesh
            key={idx}
            position={[part.cx, height / 2, part.cz]}
            raycast={raycast}
          >
            <boxGeometry args={[part.widthFt, height, part.depthFt]} />
            <meshLambertMaterial
              color={color}
              emissive={emissive.color}
              emissiveIntensity={emissive.intensity}
              transparent={transparent}
              opacity={opacity}
            />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <mesh raycast={raycast}>
      <boxGeometry args={[resolved.widthFt, height, resolved.depthFt]} />
      <meshLambertMaterial
        color={color}
        emissive={emissive.color}
        emissiveIntensity={emissive.intensity}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  );
}
