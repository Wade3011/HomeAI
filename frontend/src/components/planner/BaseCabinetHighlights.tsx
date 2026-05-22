'use client';

import type { CatalogItem, Placement } from '@/types';
import { catalogDimensionsFt, orientedDimensions } from '@/components/planner/placementCollision';
import { isBaseCabinetItem } from '@/lib/placementHeight';

export function BaseCabinetHighlights({
  placements,
  catalogById,
  active,
}: {
  placements: Placement[];
  catalogById: Record<string, CatalogItem>;
  active: boolean;
}) {
  if (!active) return null;

  return (
    <group>
      {placements.map((p) => {
        const item = catalogById[p.catalogItemId];
        if (!item || !isBaseCabinetItem(item)) return null;
        const { widthFt, depthFt } = catalogDimensionsFt(item);
        const o = orientedDimensions(widthFt, depthFt, p.rotationY);
        const y = p.positionY + 0.03;
        return (
          <mesh
            key={`highlight-${p.placementId}`}
            position={[p.positionX + o.widthFt / 2, y, p.positionZ + o.depthFt / 2]}
            rotation={[0, p.rotationY, 0]}
            raycast={() => null}
          >
            <boxGeometry args={[o.widthFt, 0.04, o.depthFt]} />
            <meshStandardMaterial color="#22c55e" transparent opacity={0.35} />
          </mesh>
        );
      })}
    </group>
  );
}
