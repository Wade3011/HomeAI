'use client';

import { Suspense } from 'react';
import type { CatalogItem } from '@/types';
import {
  CABINET_FACE_RECESS_FT,
  catalogMeshProfile,
  COUNTERTOP_SLAB_FT,
  TOE_KICK_FT,
  yCenterFromFloor,
  zCenterFromBack,
  zCenterFromFront,
} from '@/lib/planner/catalogMeshShapes';
import {
  CabinetDoorInset,
  CabinetPullBar,
  CylinderPart,
  FaucetHint,
  Part,
  RoundedPart,
  SpherePart,
  TorusPart,
} from '@/components/planner/MeshPart';
import { meshColor, meshEmissive } from '@/lib/planner/meshColors';
import { catalogModelPath } from '@/lib/planner/catalogMeshModels';
import { CatalogModelMesh } from '@/components/planner/CatalogModelMesh';
import { effectiveItemHeightFt } from '@/lib/placementHeight';
import type { ResolvedPlacementItem } from '@/lib/placementItem';

const DETAIL = {
  toeKick: '#6b6156',
  doorGap: '#4a4339',
  doorInset: '#b8a894',
  sink: '#c8d0d8',
  porcelain: '#f4f0ea',
  applianceDark: '#3d434a',
  applianceGlass: '#1e242c',
  burner: '#141414',
  tub: '#a8bcc8',
  glass: '#9eb8cc',
  tile: '#bcc6ce',
  chrome: '#b8bcc0',
  granite: '#c4beb2',
} as const;

function BaseCabinetShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
  drawerFronts = false,
  pantryBands = 0,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
  drawerFronts?: boolean;
  pantryBands?: number;
}) {
  const bodyH = Math.max(h - TOE_KICK_FT, h * 0.88);
  const bodyD = d - CABINET_FACE_RECESS_FT;
  const toeY = yCenterFromFloor(0, TOE_KICK_FT, h);
  const bodyY = yCenterFromFloor(TOE_KICK_FT, bodyH, h);
  const faceZ = zCenterFromFront(CABINET_FACE_RECESS_FT, d);

  return (
    <>
      <Part
        w={w * 0.96}
        h={TOE_KICK_FT}
        d={bodyD}
        y={toeY}
        color={DETAIL.toeKick}
        material="woodDark"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <RoundedPart
        w={w}
        h={bodyH}
        d={bodyD}
        y={bodyY}
        color={color}
        material="wood"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <Part
        w={w * 0.98}
        h={bodyH * 0.92}
        d={CABINET_FACE_RECESS_FT}
        y={bodyY}
        z={faceZ}
        color={color}
        material="wood"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity * 0.6}
        pickable={pickable}
      />
      <CabinetDoorInset
        w={w}
        h={bodyH}
        y={bodyY}
        z={faceZ + 0.008}
        color={DETAIL.doorInset}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <CabinetPullBar
        w={w}
        y={bodyY - bodyH * 0.08}
        z={faceZ + 0.018}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      {drawerFronts &&
        [0.25, 0.5, 0.75].map((t) => (
          <Part
            key={t}
            w={w * 0.88}
            h={0.02}
            d={0.015}
            y={yCenterFromFloor(TOE_KICK_FT + bodyH * (t - 0.08), 0.02, h)}
            z={faceZ + 0.008}
            color={DETAIL.doorGap}
            material="woodDark"
            emissive={emissive}
            emissiveIntensity={0}
            pickable={pickable}
          />
        ))}
      {pantryBands > 0 &&
        Array.from({ length: pantryBands }, (_, i) => {
          const t = (i + 1) / (pantryBands + 1);
          return (
            <Part
              key={i}
              w={w * 0.88}
              h={0.02}
              d={0.015}
              y={yCenterFromFloor(TOE_KICK_FT + bodyH * t, 0.02, h)}
              z={faceZ + 0.008}
              color={DETAIL.doorGap}
              emissive={emissive}
              emissiveIntensity={0}
              pickable={pickable}
            />
          );
        })}
    </>
  );
}

function WallCabinetShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
}) {
  const bodyD = d - CABINET_FACE_RECESS_FT * 0.8;
  const faceZ = zCenterFromFront(CABINET_FACE_RECESS_FT, d);

  return (
    <>
      <RoundedPart
        w={w}
        h={h}
        d={bodyD}
        color={color}
        material="wood"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <Part
        w={w * 0.98}
        h={h * 0.94}
        d={CABINET_FACE_RECESS_FT}
        z={faceZ}
        color={color}
        material="wood"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity * 0.5}
        pickable={pickable}
      />
      <CabinetDoorInset
        w={w}
        h={h}
        y={0}
        z={faceZ + 0.008}
        color={DETAIL.doorInset}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <CylinderPart
        radiusTop={0.018}
        radiusBottom={0.018}
        height={0.025}
        y={-h * 0.12}
        z={faceZ + 0.02}
        color={DETAIL.chrome}
        material="chrome"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
    </>
  );
}

function CornerCabinetShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
}) {
  const leg = Math.min(w, d) * 0.55;
  const bodyH = h - TOE_KICK_FT;
  const bodyY = yCenterFromFloor(TOE_KICK_FT, bodyH, h);

  return (
    <>
      <Part
        w={w}
        h={TOE_KICK_FT}
        d={leg}
        z={zCenterFromBack(leg, d)}
        color={DETAIL.toeKick}
        material="woodDark"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <Part
        w={w}
        h={bodyH}
        d={leg}
        y={bodyY}
        z={zCenterFromBack(leg, d)}
        color={color}
        material="wood"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <Part
        w={leg}
        h={TOE_KICK_FT}
        d={d}
        x={-w / 2 + leg / 2}
        color={DETAIL.toeKick}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <Part
        w={leg}
        h={bodyH}
        d={d}
        x={-w / 2 + leg / 2}
        y={bodyY}
        color={color}
        material="wood"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
    </>
  );
}

function SinkCabinetShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
}) {
  const bowlR = Math.min(w, d) * 0.28;
  const bowlH = 0.15;
  const bowlY = yCenterFromFloor(h - bowlH - COUNTERTOP_SLAB_FT, bowlH, h);
  const slabY = yCenterFromFloor(h - COUNTERTOP_SLAB_FT, COUNTERTOP_SLAB_FT, h);
  const sinkZ = zCenterFromFront(d * 0.35, d);

  return (
    <>
      <BaseCabinetShape
        w={w}
        d={d}
        h={h}
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <Part
        w={w * 1.04}
        h={COUNTERTOP_SLAB_FT}
        d={d * 1.02}
        y={slabY}
        color={DETAIL.granite}
        material="granite"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <CylinderPart
        radiusTop={bowlR}
        radiusBottom={bowlR * 0.82}
        height={bowlH}
        y={bowlY}
        z={sinkZ}
        color={DETAIL.sink}
        material="stainless"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <FaucetHint
        x={0}
        y={slabY + COUNTERTOP_SLAB_FT * 0.5 + 0.06}
        z={sinkZ - d * 0.08}
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
    </>
  );
}

function ToiletTwoPieceShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
}) {
  const tankD = d * 0.32;
  const tankH = h * 0.42;
  const tankY = yCenterFromFloor(h - tankH, tankH, h);
  const bowlD = d * 0.58;
  const bowlH = h * 0.38;
  const bowlY = yCenterFromFloor(0, bowlH, h);
  const seatY = yCenterFromFloor(bowlH, 0.08, h);

  return (
    <>
      <RoundedPart
        w={w * 0.82}
        h={tankH}
        d={tankD}
        y={tankY}
        z={zCenterFromBack(tankD, d)}
        color={color}
        material="porcelain"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <Part
        w={w * 0.78}
        h={0.02}
        d={tankD * 0.9}
        y={tankY + tankH * 0.42}
        z={zCenterFromBack(tankD * 0.95, d)}
        color={DETAIL.doorGap}
        material="porcelain"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <SpherePart
        radius={w * 0.38}
        scale={[1, 0.55, 1.15]}
        y={bowlY - bowlH * 0.05}
        z={zCenterFromFront(bowlD * 0.45, d)}
        color={DETAIL.porcelain}
        material="porcelain"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity * 0.2}
        pickable={pickable}
      />
      <TorusPart
        radius={w * 0.26}
        tube={0.035}
        y={seatY}
        z={zCenterFromFront(bowlD * 0.55, d)}
        color={color}
        material="porcelain"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity * 0.5}
        pickable={pickable}
      />
    </>
  );
}

function ToiletOnePieceShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
}) {
  const tankH = h * 0.48;
  const bowlH = h * 0.42;
  const bodyH = tankH + bowlH * 0.55;
  const bodyY = yCenterFromFloor(0, bodyH, h);
  const bowlY = yCenterFromFloor(0, bowlH, h);

  return (
    <>
      <RoundedPart
        w={w * 0.88}
        h={bodyH}
        d={d * 0.72}
        y={bodyY}
        z={zCenterFromBack(d * 0.36, d)}
        color={color}
        material="porcelain"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <SpherePart
        radius={w * 0.42}
        scale={[1, 0.5, 1.2]}
        y={bowlY}
        z={zCenterFromFront(d * 0.32, d)}
        color={DETAIL.porcelain}
        material="porcelain"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity * 0.25}
        pickable={pickable}
      />
      <TorusPart
        radius={w * 0.24}
        tube={0.03}
        y={yCenterFromFloor(bowlH * 0.85, 0.02, h)}
        z={zCenterFromFront(d * 0.28, d)}
        color={color}
        material="porcelain"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity * 0.4}
        pickable={pickable}
      />
    </>
  );
}

function VanityShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
  isDouble,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
  isDouble: boolean;
}) {
  const cabinetH = h - COUNTERTOP_SLAB_FT;
  const slabY = yCenterFromFloor(cabinetH, COUNTERTOP_SLAB_FT, h);
  const bowlR = Math.min(w * (isDouble ? 0.18 : 0.28), d * 0.22);
  const bowlH = 0.12;
  const bowlY = yCenterFromFloor(cabinetH - bowlH * 0.5, bowlH, h);

  return (
    <>
      <BaseCabinetShape
        w={w}
        d={d}
        h={cabinetH}
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <Part
        w={w * 1.02}
        h={COUNTERTOP_SLAB_FT}
        d={d * 1.02}
        y={slabY}
        color={DETAIL.granite}
        material="granite"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <Part
        w={w}
        h={0.06}
        d={0.02}
        y={slabY + COUNTERTOP_SLAB_FT * 0.45}
        z={zCenterFromBack(0.02, d)}
        color={DETAIL.tile}
        material="tile"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      {isDouble ? (
        [-w * 0.22, w * 0.22].map((bx) => (
          <group key={bx}>
            <CylinderPart
              radiusTop={bowlR}
              radiusBottom={bowlR * 0.88}
              height={bowlH}
              x={bx}
              y={bowlY}
              color={DETAIL.sink}
              material="stainless"
              emissive={emissive}
              emissiveIntensity={0}
              pickable={pickable}
            />
            <FaucetHint
              x={bx}
              y={slabY + COUNTERTOP_SLAB_FT * 0.5 + 0.06}
              z={zCenterFromFront(d * 0.05, d)}
              emissive={emissive}
              emissiveIntensity={0}
              pickable={pickable}
            />
          </group>
        ))
      ) : (
        <>
          <CylinderPart
            radiusTop={bowlR}
            radiusBottom={bowlR * 0.88}
            height={bowlH}
            y={bowlY}
            z={zCenterFromFront(d * 0.15, d)}
            color={DETAIL.sink}
            material="stainless"
            emissive={emissive}
            emissiveIntensity={0}
            pickable={pickable}
          />
          <FaucetHint
            x={0}
            y={slabY + COUNTERTOP_SLAB_FT * 0.5 + 0.06}
            z={zCenterFromFront(d * 0.02, d)}
            emissive={emissive}
            emissiveIntensity={0}
            pickable={pickable}
          />
        </>
      )}
    </>
  );
}

function ShowerTubShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
}) {
  const tubH = Math.max(h * 0.55, 0.85);
  const tubY = yCenterFromFloor(0, tubH, h);
  const rimH = 0.08;
  const rimY = yCenterFromFloor(tubH - rimH * 0.5, rimH, h);

  return (
    <>
      <Part
        w={w * 0.96}
        h={tubH}
        d={d * 0.92}
        y={tubY}
        color={DETAIL.tub}
        material="acrylic"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity * 0.4}
        pickable={pickable}
      />
      <RoundedPart
        w={w}
        h={rimH}
        d={d}
        y={rimY}
        color={color}
        material="porcelain"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <Part
        w={w * 0.9}
        h={Math.max(h - tubH, 0.1)}
        d={0.08}
        y={yCenterFromFloor(tubH, Math.max(h - tubH, 0.1), h)}
        z={zCenterFromBack(0.08, d)}
        color={DETAIL.tile}
        material="tile"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
    </>
  );
}

function ShowerComboShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
}) {
  const tubH = h * 0.22;
  const tubY = yCenterFromFloor(0, tubH, h);
  const wallH = h - tubH;
  const wallY = yCenterFromFloor(tubH, wallH, h);
  const wallT = 0.08;

  return (
    <>
      <Part
        w={w * 0.94}
        h={tubH}
        d={d * 0.9}
        y={tubY}
        color={DETAIL.tub}
        material="acrylic"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity * 0.4}
        pickable={pickable}
      />
      <Part
        w={w}
        h={wallH}
        d={wallT}
        y={wallY}
        z={zCenterFromBack(wallT, d)}
        color={DETAIL.tile}
        material="tile"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <Part
        w={wallT}
        h={wallH}
        d={d}
        x={-w / 2 + wallT / 2}
        y={wallY}
        color={DETAIL.tile}
        material="tile"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <Part
        w={wallT}
        h={wallH}
        d={d}
        x={w / 2 - wallT / 2}
        y={wallY}
        color={DETAIL.glass}
        material="glass"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity * 0.15}
        transparent
        opacity={0.4}
        pickable={pickable}
      />
    </>
  );
}

function ShowerWalkInShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
}) {
  const baseH = Math.max(h * 0.08, 0.15);
  const baseY = yCenterFromFloor(0, baseH, h);
  const wallH = h * 0.88;
  const wallY = yCenterFromFloor(baseH, wallH, h);
  const wallT = 0.06;
  const glassZ = zCenterFromFront(wallT * 0.5, d);

  return (
    <>
      <Part
        w={w}
        h={baseH}
        d={d}
        y={baseY}
        color={DETAIL.tub}
        material="tile"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <Part
        w={w}
        h={wallH}
        d={wallT}
        y={wallY}
        z={zCenterFromBack(wallT, d)}
        color={DETAIL.tile}
        material="tile"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <Part
        w={wallT}
        h={wallH}
        d={d}
        x={-w / 2 + wallT / 2}
        y={wallY}
        color={DETAIL.tile}
        material="tile"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <Part
        w={wallT}
        h={wallH}
        d={d}
        x={w / 2 - wallT / 2}
        y={wallY}
        color={DETAIL.glass}
        material="glass"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity * 0.15}
        transparent
        opacity={0.42}
        pickable={pickable}
      />
      <Part
        w={0.025}
        h={wallH}
        d={0.025}
        x={w / 2 - wallT / 2}
        y={wallY}
        z={glassZ}
        color={DETAIL.chrome}
        material="chrome"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <CylinderPart
        radiusTop={w * 0.1}
        radiusBottom={w * 0.1}
        height={0.015}
        y={wallY + wallH * 0.46}
        z={zCenterFromBack(wallT + 0.04, d)}
        color={DETAIL.chrome}
        material="chrome"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <CylinderPart
        radiusTop={0.02}
        radiusBottom={0.015}
        height={0.08}
        y={wallY + wallH * 0.46 + 0.04}
        z={zCenterFromBack(wallT + 0.06, d)}
        color={DETAIL.chrome}
        material="chrome"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
    </>
  );
}

function ApplianceDishwasherShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
}) {
  const panelH = h * 0.08;
  const panelY = yCenterFromFloor(h - panelH, panelH, h);
  const bodyH = h - panelH;
  const bodyY = yCenterFromFloor(0, bodyH, h);
  const handleY = yCenterFromFloor(h * 0.72, 0.03, h);

  return (
    <>
      <RoundedPart
        w={w}
        h={bodyH}
        d={d}
        y={bodyY}
        color={color}
        material="stainless"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <Part
        w={w * 0.98}
        h={panelH}
        d={d}
        y={panelY}
        color={DETAIL.applianceDark}
        material="matte"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      <Part
        w={w * 0.7}
        h={0.025}
        d={0.02}
        y={handleY}
        z={zCenterFromFront(0.02, d)}
        color={DETAIL.chrome}
        material="chrome"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
    </>
  );
}

function ApplianceOvenShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
  isDouble = false,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
  isDouble?: boolean;
}) {
  const windowH = h * (isDouble ? 0.32 : 0.38);
  const windows = isDouble ? 2 : 1;

  return (
    <>
      <RoundedPart
        w={w}
        h={h}
        d={d}
        color={color}
        material="stainless"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      {Array.from({ length: windows }, (_, i) => {
        const bottom =
          isDouble && i === 0
            ? h * 0.52
            : isDouble
              ? h * 0.08
              : h * 0.28;
        const wy = yCenterFromFloor(bottom, windowH, h);
        return (
          <Part
            key={i}
            w={w * 0.78}
            h={windowH}
            d={0.03}
            y={wy}
            z={zCenterFromFront(0.03, d)}
            color={DETAIL.applianceGlass}
            material="glass"
            emissive={emissive}
            emissiveIntensity={0.08}
            transparent
            opacity={0.75}
            pickable={pickable}
          />
        );
      })}
      {isDouble && (
        <Part
          w={w * 0.82}
          h={h * 0.06}
          d={0.025}
          y={yCenterFromFloor(h * 0.46, h * 0.06, h)}
          z={zCenterFromFront(0.025, d)}
          color={DETAIL.applianceDark}
          emissive={emissive}
          emissiveIntensity={0}
          pickable={pickable}
        />
      )}
    </>
  );
}

function ApplianceRangeShape({
  w,
  d,
  h,
  color,
  emissive,
  emissiveIntensity,
  pickable,
  withMicrowave = false,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  pickable: boolean;
  withMicrowave?: boolean;
}) {
  const mwH = withMicrowave ? h * 0.28 : 0;
  const cooktopH = h * 0.06;
  const ovenH = h - mwH - cooktopH;
  const mwY = withMicrowave ? yCenterFromFloor(h - mwH, mwH, h) : 0;
  const cookY = yCenterFromFloor(h - mwH - cooktopH, cooktopH, h);
  const ovenY = yCenterFromFloor(0, ovenH, h);
  const burnerY = cookY + cooktopH * 0.15;
  const burnerPositions: [number, number][] = [
    [-w * 0.22, -d * 0.18],
    [w * 0.22, -d * 0.18],
    [-w * 0.22, d * 0.12],
    [w * 0.22, d * 0.12],
  ];

  return (
    <>
      {withMicrowave && (
        <RoundedPart
          w={w}
          h={mwH}
          d={d}
          y={mwY}
          color={DETAIL.applianceDark}
          material="matte"
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * 0.5}
          pickable={pickable}
        />
      )}
      <RoundedPart
        w={w}
        h={ovenH}
        d={d}
        y={ovenY}
        color={color}
        material="stainless"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        pickable={pickable}
      />
      <Part
        w={w * 0.98}
        h={cooktopH}
        d={d}
        y={cookY}
        color={DETAIL.applianceDark}
        material="matte"
        emissive={emissive}
        emissiveIntensity={0}
        pickable={pickable}
      />
      {burnerPositions.map(([bx, bz], i) => (
        <group key={i}>
          <CylinderPart
            radiusTop={w * 0.07}
            radiusBottom={w * 0.07}
            height={0.02}
            x={bx}
            y={burnerY}
            z={bz}
            color={DETAIL.burner}
            material="burner"
            emissive={emissive}
            emissiveIntensity={0}
            pickable={pickable}
          />
          <TorusPart
            radius={w * 0.055}
            tube={0.004}
            x={bx}
            y={burnerY + 0.012}
            z={bz}
            color="#555"
            material="chrome"
            emissive={emissive}
            emissiveIntensity={0}
            pickable={pickable}
          />
        </group>
      ))}
      {[-w * 0.32, -w * 0.16, 0, w * 0.16, w * 0.32].map((kx, i) => (
        <CylinderPart
          key={`knob-${i}`}
          radiusTop={0.018}
          radiusBottom={0.02}
          height={0.025}
          x={kx}
          y={ovenY + ovenH * 0.28}
          z={zCenterFromFront(0.02, d)}
          color={DETAIL.chrome}
          material="chrome"
          emissive={emissive}
          emissiveIntensity={0}
          pickable={pickable}
        />
      ))}
      <Part
        w={w * 0.75}
        h={ovenH * 0.45}
        d={0.03}
        y={yCenterFromFloor(ovenH * 0.22, ovenH * 0.45, h)}
        z={zCenterFromFront(0.03, d)}
        color={DETAIL.applianceGlass}
        material="glass"
        emissive={emissive}
        emissiveIntensity={0.08}
        transparent
        opacity={0.75}
        pickable={pickable}
      />
    </>
  );
}

export function CatalogItemMesh({
  item,
  resolved,
  selected,
  pickable = true,
  opacity = 1,
  transparent = false,
  roomHeightFt,
}: {
  item: CatalogItem;
  resolved: ResolvedPlacementItem;
  selected: boolean;
  pickable?: boolean;
  opacity?: number;
  transparent?: boolean;
  /** Cap tall fixtures (showers) to the room ceiling for display. */
  roomHeightFt?: number;
}) {
  const w = resolved.widthFt;
  const d = resolved.depthFt;
  const h =
    roomHeightFt != null
      ? effectiveItemHeightFt(item, roomHeightFt)
      : resolved.heightFt;
  const profile = catalogMeshProfile(item);
  const modelPath = catalogModelPath(profile);

  if (modelPath) {
    return (
      <Suspense fallback={null}>
        <CatalogModelMesh
          modelPath={modelPath}
          widthFt={w}
          depthFt={d}
          heightFt={h}
          selected={selected}
          pickable={pickable}
          opacity={opacity}
          transparent={transparent}
        />
      </Suspense>
    );
  }

  const color = meshColor(item, selected);
  const { color: emissive, intensity: emissiveIntensity } = meshEmissive(selected);
  const common = { w, d, h, color, emissive, emissiveIntensity, pickable };

  switch (profile) {
    case 'base-cabinet':
      return <BaseCabinetShape {...common} />;
    case 'wall-cabinet':
      return <WallCabinetShape {...common} />;
    case 'cabinet-corner':
      return <CornerCabinetShape {...common} />;
    case 'cabinet-sink':
      return <SinkCabinetShape {...common} />;
    case 'cabinet-drawer':
      return <BaseCabinetShape {...common} drawerFronts />;
    case 'cabinet-pantry':
      return <BaseCabinetShape {...common} pantryBands={4} />;
    case 'countertop':
      return (
        <RoundedPart
          w={w}
          h={Math.max(COUNTERTOP_SLAB_FT, h * 0.15)}
          d={d}
          color={DETAIL.granite}
          material="granite"
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          opacity={opacity}
          transparent={transparent}
          pickable={pickable}
        />
      );
    case 'toilet-two-piece':
      return <ToiletTwoPieceShape {...common} />;
    case 'toilet-one-piece':
      return <ToiletOnePieceShape {...common} />;
    case 'vanity':
      return (
        <VanityShape
          {...common}
          isDouble={item.subcategory === 'double' || item.widthIn >= 60}
        />
      );
    case 'shower-tub':
      return <ShowerTubShape {...common} />;
    case 'shower-combo':
      return <ShowerComboShape {...common} />;
    case 'shower-walk-in':
      return <ShowerWalkInShape {...common} />;
    case 'shower-base':
      return (
        <RoundedPart
          w={w}
          h={Math.max(h, 0.2)}
          d={d}
          y={yCenterFromFloor(0, Math.max(h, 0.2), h)}
          color={DETAIL.tub}
          material="tile"
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * 0.3}
          opacity={opacity}
          transparent={transparent}
          pickable={pickable}
        />
      );
    case 'shower-enclosure':
      return (
        <>
          <Part
            w={w}
            h={h}
            d={0.04}
            z={zCenterFromFront(0.04, d)}
            color={DETAIL.glass}
            material="glass"
            emissive={emissive}
            emissiveIntensity={0}
            transparent
            opacity={0.48}
            pickable={pickable}
          />
          <Part
            w={0.04}
            h={h}
            d={d}
            x={-w / 2 + 0.02}
            color={DETAIL.chrome}
            material="chrome"
            emissive={emissive}
            emissiveIntensity={0}
            opacity={opacity}
            transparent={transparent}
            pickable={pickable}
          />
          <Part
            w={w}
            h={0.04}
            d={0.04}
            y={h / 2 - 0.02}
            z={zCenterFromFront(0.04, d)}
            color={DETAIL.chrome}
            material="chrome"
            emissive={emissive}
            emissiveIntensity={0}
            pickable={pickable}
          />
        </>
      );
    case 'appliance-dishwasher':
      return <ApplianceDishwasherShape {...common} />;
    case 'appliance-oven':
      return (
        <ApplianceOvenShape
          {...common}
          isDouble={item.name.toLowerCase().includes('double')}
        />
      );
    case 'appliance-range':
      return <ApplianceRangeShape {...common} />;
    case 'appliance-range-microwave':
      return <ApplianceRangeShape {...common} withMicrowave />;
    default:
      return (
        <RoundedPart
          w={w}
          h={h}
          d={d}
          color={color}
          material="wood"
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          opacity={opacity}
          transparent={transparent}
          pickable={pickable}
        />
      );
  }
}
