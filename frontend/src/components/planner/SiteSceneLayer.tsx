'use client';

import { useMemo } from 'react';
import {
  FENCE_POST_SPACING_FT,
  SITE_STRUCTURE_PRESETS,
  isBuildingKind,
} from '@/config/siteStructurePresets';
import { computeRoadSegments } from '@/lib/siteRoads';
import { structureBounds } from '@/lib/siteLayout';
import type {
  RoomWallSide,
  SiteFenceStyle,
  SitePavingMaterial,
  SiteSettings,
  SiteStructure,
} from '@/types';

const DOOR_WIDTH_FT = 3;
const DOOR_HEIGHT_FT = 7;

const DRIVEWAY_COLORS: Record<SitePavingMaterial, string> = {
  asphalt: '#3f3f46',
  concrete: '#9ca3af',
  gravel: '#78716c',
  pavers: '#57534e',
};

const FENCE_COLORS: Record<SiteFenceStyle, { post: string; rail: string }> = {
  wood: { post: '#78350f', rail: '#92400e' },
  vinyl: { post: '#e7e5e4', rail: '#f5f5f4' },
  'chain-link': { post: '#a8a29e', rail: '#d6d3d1' },
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

      {structures.map((structure) => {
        if (structure.kind === 'driveway') {
          return <DrivewayMesh key={structure.structureId} structure={structure} />;
        }
        if (structure.kind === 'fence') {
          return <FenceMesh key={structure.structureId} structure={structure} />;
        }
        if (structure.kind === 'breezeway') {
          return <BreezewayMesh key={structure.structureId} structure={structure} />;
        }
        return <BuildingMesh key={structure.structureId} structure={structure} />;
      })}
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

function FenceMesh({ structure }: { structure: SiteStructure }) {
  const bounds = useMemo(() => structureBounds(structure), [structure]);
  if (!bounds) return null;

  const preset = SITE_STRUCTURE_PRESETS.fence;
  const widthFt = structure.widthFt ?? bounds.widthFt;
  const depthFt = structure.depthFt ?? bounds.depthFt;
  const heightFt = structure.heightFt ?? preset.heightFt ?? 6;
  const rotationY = structure.rotationY ?? 0;
  const style = structure.fenceStyle ?? preset.fenceStyle ?? 'wood';
  const colors = FENCE_COLORS[style];
  const postCount = Math.max(2, Math.floor(widthFt / FENCE_POST_SPACING_FT) + 1);

  return (
    <group position={[bounds.centerX, 0, bounds.centerZ]} rotation={[0, rotationY, 0]}>
      {Array.from({ length: postCount }, (_, i) => {
        const t = postCount === 1 ? 0 : i / (postCount - 1);
        const x = -widthFt / 2 + t * widthFt;
        return (
          <mesh key={`post-${i}`} position={[x, heightFt / 2, 0]} castShadow>
            <boxGeometry args={[0.2, heightFt, Math.max(depthFt, 0.35)]} />
            <meshStandardMaterial color={colors.post} roughness={0.9} />
          </mesh>
        );
      })}
      <mesh position={[0, heightFt * 0.35, 0]} castShadow>
        <boxGeometry args={[widthFt, 0.12, Math.max(depthFt * 0.6, 0.12)]} />
        <meshStandardMaterial color={colors.rail} roughness={0.88} />
      </mesh>
      <mesh position={[0, heightFt * 0.7, 0]} castShadow>
        <boxGeometry args={[widthFt, 0.12, Math.max(depthFt * 0.6, 0.12)]} />
        <meshStandardMaterial color={colors.rail} roughness={0.88} />
      </mesh>
      {style === 'chain-link' ? (
        <mesh position={[0, heightFt * 0.5, 0]}>
          <boxGeometry args={[widthFt * 0.98, heightFt * 0.85, 0.04]} />
          <meshStandardMaterial color={colors.rail} transparent opacity={0.35} roughness={0.7} metalness={0.4} />
        </mesh>
      ) : (
        <mesh position={[0, heightFt * 0.5, 0]} castShadow>
          <boxGeometry args={[widthFt * 0.96, heightFt * 0.75, Math.max(depthFt * 0.4, 0.08)]} />
          <meshStandardMaterial color={colors.rail} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

function BreezewayMesh({ structure }: { structure: SiteStructure }) {
  const bounds = useMemo(() => structureBounds(structure), [structure]);
  if (!bounds) return null;

  const preset = SITE_STRUCTURE_PRESETS.breezeway;
  const widthFt = structure.widthFt ?? bounds.widthFt;
  const depthFt = structure.depthFt ?? bounds.depthFt;
  const heightFt = structure.heightFt ?? preset.heightFt ?? 9;
  const rotationY = structure.rotationY ?? 0;
  const roofY = heightFt;
  const postH = heightFt - 0.2;

  return (
    <group position={[bounds.centerX, 0, bounds.centerZ]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[widthFt, 0.08, depthFt]} />
        <meshStandardMaterial color="#a8a29e" roughness={0.92} />
      </mesh>
      {(
        [
          [-widthFt / 2 + 0.4, -depthFt / 2 + 0.4],
          [widthFt / 2 - 0.4, -depthFt / 2 + 0.4],
          [-widthFt / 2 + 0.4, depthFt / 2 - 0.4],
          [widthFt / 2 - 0.4, depthFt / 2 - 0.4],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={`col-${i}`} position={[x, postH / 2, z]} castShadow>
          <boxGeometry args={[0.35, postH, 0.35]} />
          <meshStandardMaterial color="#78716c" roughness={0.88} />
        </mesh>
      ))}
      <mesh position={[0, roofY, 0]} castShadow>
        <boxGeometry args={[widthFt + 0.6, 0.2, depthFt + 0.6]} />
        <meshStandardMaterial color="#57534e" roughness={0.9} />
      </mesh>
    </group>
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
      <BuildingDoorMesh
        widthFt={bounds.widthFt}
        depthFt={bounds.depthFt}
        heightFt={heightFt}
        doorSide={structure.doorSide ?? preset.doorSide ?? 'front'}
      />
      <mesh position={[0, heightFt + 0.06, 0]}>
        <boxGeometry args={[bounds.widthFt + 0.15, 0.12, bounds.depthFt + 0.15]} />
        <meshStandardMaterial color="#57534e" roughness={0.9} />
      </mesh>
    </group>
  );
}

function BuildingDoorMesh({
  widthFt,
  depthFt,
  heightFt,
  doorSide,
}: {
  widthFt: number;
  depthFt: number;
  heightFt: number;
  doorSide: RoomWallSide;
}) {
  const doorY = Math.min(DOOR_HEIGHT_FT / 2 + 0.05, heightFt * 0.45);
  const headerY = Math.min(DOOR_HEIGHT_FT + 0.35, heightFt - 0.15);
  const inset = 0.04;
  const halfW = widthFt / 2;
  const halfD = depthFt / 2;

  let position: [number, number, number] = [0, doorY, halfD - inset];
  let headerPos: [number, number, number] = [0, headerY, halfD - inset];
  let rotation: [number, number, number] = [0, 0, 0];
  let headerSize: [number, number, number] = [DOOR_WIDTH_FT + 0.2, 0.18, 0.08];

  switch (doorSide) {
    case 'back':
      position = [0, doorY, -halfD + inset];
      headerPos = [0, headerY, -halfD + inset];
      break;
    case 'left':
      position = [-halfW + inset, doorY, 0];
      headerPos = [-halfW + inset, headerY, 0];
      rotation = [0, Math.PI / 2, 0];
      headerSize = [0.08, 0.18, DOOR_WIDTH_FT + 0.2];
      break;
    case 'right':
      position = [halfW - inset, doorY, 0];
      headerPos = [halfW - inset, headerY, 0];
      rotation = [0, Math.PI / 2, 0];
      headerSize = [0.08, 0.18, DOOR_WIDTH_FT + 0.2];
      break;
  }

  return (
    <group>
      <mesh position={position} rotation={rotation} castShadow>
        <boxGeometry args={[DOOR_WIDTH_FT, DOOR_HEIGHT_FT, 0.1]} />
        <meshStandardMaterial color="#57534e" roughness={0.82} metalness={0.08} />
      </mesh>
      <mesh position={headerPos} rotation={rotation}>
        <boxGeometry args={headerSize} />
        <meshStandardMaterial color="#44403c" roughness={0.9} />
      </mesh>
    </group>
  );
}
