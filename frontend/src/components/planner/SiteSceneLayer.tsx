'use client';

import { useMemo } from 'react';
import { SITE_STRUCTURE_PRESETS, isBuildingKind } from '@/config/siteStructurePresets';
import { computeRoadSegments } from '@/lib/siteRoads';
import { structureBounds } from '@/lib/siteLayout';
import type { SitePavingMaterial, SiteSettings, SiteStructure } from '@/types';

const DRIVEWAY_COLORS: Record<SitePavingMaterial, string> = {
  asphalt: '#3f3f46',
  concrete: '#9ca3af',
  gravel: '#78716c',
  pavers: '#57534e',
};

export function SiteSceneLayer({
  site,
  structures,
}: {
  site: SiteSettings;
  structures: SiteStructure[];
}) {
  const ox = site.houseOffsetX ?? 0;
  const oz = site.houseOffsetZ ?? 0;
  const lotCx = ox + site.lotWidthFt / 2;
  const lotCz = oz + site.lotDepthFt / 2;

  return (
    <group>
      {computeRoadSegments(site).map((segment, index) => (
        <mesh
          key={`road-${index}`}
          position={[segment.centerX, 0.03, segment.centerZ]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[segment.widthFt, segment.depthFt]} />
          <meshStandardMaterial color="#3f3f46" roughness={0.96} metalness={0.02} />
        </mesh>
      ))}

      <mesh position={[lotCx, -0.025, lotCz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[site.lotWidthFt, site.lotDepthFt]} />
        <meshStandardMaterial color="#6b9e6b" roughness={0.92} metalness={0.02} />
      </mesh>

      <mesh position={[lotCx, -0.01, lotCz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[site.lotWidthFt, site.lotDepthFt]} />
        <meshBasicMaterial color="#4d7c4d" wireframe transparent opacity={0.08} />
      </mesh>

      {structures.map((structure) =>
        structure.kind === 'driveway' ? (
          <DrivewayMesh key={structure.structureId} structure={structure} />
        ) : (
          <BuildingMesh key={structure.structureId} structure={structure} />
        ),
      )}
    </group>
  );
}

function DrivewayMesh({ structure }: { structure: SiteStructure }) {
  const bounds = useMemo(() => structureBounds(structure), [structure]);
  if (!bounds) return null;

  const material = structure.material ?? 'asphalt';
  const thickness = 0.1;
  const rotationY = structure.rotationY ?? 0;

  return (
    <mesh
      position={[bounds.centerX, thickness / 2 + 0.01, bounds.centerZ]}
      rotation={[0, rotationY, 0]}
      receiveShadow
    >
      <boxGeometry args={[bounds.widthFt, thickness, bounds.depthFt]} />
      <meshStandardMaterial
        color={DRIVEWAY_COLORS[material]}
        roughness={material === 'asphalt' ? 0.95 : 0.82}
        metalness={material === 'concrete' ? 0.05 : 0}
      />
    </mesh>
  );
}

function BuildingMesh({ structure }: { structure: SiteStructure }) {
  const bounds = useMemo(() => structureBounds(structure), [structure]);
  if (!bounds || !isBuildingKind(structure.kind)) return null;

  const preset = SITE_STRUCTURE_PRESETS[structure.kind];
  const heightFt = structure.heightFt ?? preset.heightFt ?? 10;
  const rotationY = structure.rotationY ?? 0;

  return (
    <group
      position={[bounds.centerX, 0, bounds.centerZ]}
      rotation={[0, rotationY, 0]}
    >
      <mesh position={[0, heightFt / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[bounds.widthFt, heightFt, bounds.depthFt]} />
        <meshStandardMaterial color={preset.planFill} roughness={0.88} metalness={0.04} />
      </mesh>
      <mesh position={[0, heightFt + 0.06, 0]}>
        <boxGeometry args={[bounds.widthFt + 0.15, 0.12, bounds.depthFt + 0.15]} />
        <meshStandardMaterial color="#57534e" roughness={0.9} />
      </mesh>
    </group>
  );
}
