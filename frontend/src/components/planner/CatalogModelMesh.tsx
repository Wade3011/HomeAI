'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  applySelectionTint,
  cloneSceneGraph,
  fitModelToFootprint,
  setRaycastEnabled,
} from '@/lib/planner/fitModelToFootprint';

export function CatalogModelMesh({
  modelPath,
  widthFt,
  depthFt,
  heightFt,
  selected,
  pickable = true,
  opacity = 1,
  transparent = false,
}: {
  modelPath: string;
  widthFt: number;
  depthFt: number;
  heightFt: number;
  selected: boolean;
  pickable?: boolean;
  opacity?: number;
  transparent?: boolean;
}) {
  const { scene } = useGLTF(modelPath);

  const root = useMemo(() => {
    const group = cloneSceneGraph(scene);
    fitModelToFootprint(group, widthFt, depthFt, heightFt);
    return group;
  }, [scene, widthFt, depthFt, heightFt]);

  useEffect(() => {
    setRaycastEnabled(root, pickable);
    applySelectionTint(root, selected);
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        mat.transparent = transparent || opacity < 1;
        mat.opacity = opacity;
      }
    });
  }, [root, pickable, selected, opacity, transparent]);

  return <primitive object={root} />;
}
