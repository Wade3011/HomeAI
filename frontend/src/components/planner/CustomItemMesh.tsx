'use client';

import type { CustomItemSpec } from '@/types';
import { CylinderPart, RoundedPart } from '@/components/planner/MeshPart';
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

  if (spec.shape === 'round') {
    const r = Math.min(resolved.widthFt, resolved.depthFt) / 2;
    return (
      <CylinderPart
        radiusTop={r}
        radiusBottom={r}
        height={height}
        color={color}
        material="wood"
        emissive={emissive.color}
        emissiveIntensity={emissive.intensity}
        transparent={transparent}
        opacity={opacity}
        pickable={pickable}
      />
    );
  }

  if (isSectionalShape(spec.shape)) {
    const parts = sectionalPartsCenteredFt(spec);
    return (
      <group>
        {parts.map((part, idx) => (
          <RoundedPart
            key={idx}
            w={part.widthFt}
            h={height}
            d={part.depthFt}
            x={part.cx}
            y={height / 2}
            z={part.cz}
            color={color}
            material="wood"
            emissive={emissive.color}
            emissiveIntensity={emissive.intensity}
            transparent={transparent}
            opacity={opacity}
            pickable={pickable}
          />
        ))}
      </group>
    );
  }

  return (
    <RoundedPart
      w={resolved.widthFt}
      h={height}
      d={resolved.depthFt}
      color={color}
      material="wood"
      emissive={emissive.color}
      emissiveIntensity={emissive.intensity}
      transparent={transparent}
      opacity={opacity}
      pickable={pickable}
    />
  );
}
