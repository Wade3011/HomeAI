'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { defaultPlacementY } from '@/config/catalogCategories';
import type { CatalogItem, Placement } from '@/types';

interface PlannerContextValue {
  placements: Placement[];
  selectedPlacementId: string | null;
  catalogDragItem: CatalogItem | null;
  setCatalogDragItem: (item: CatalogItem | null) => void;
  addPlacement: (
    item: CatalogItem,
    position: { x: number; z: number; rotationY?: number; positionY?: number },
  ) => void;
  updatePlacement: (placementId: string, patch: Partial<Placement>) => void;
  removePlacement: (placementId: string) => void;
  selectPlacement: (placementId: string | null) => void;
  setPlacements: (placements: Placement[]) => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

function newId() {
  return crypto.randomUUID();
}

export function PlannerProvider({
  children,
  roomId,
  initialPlacements = [],
}: {
  children: ReactNode;
  roomId: string;
  initialPlacements?: Placement[];
}) {
  const [placements, setPlacementsState] = useState<Placement[]>(initialPlacements);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [catalogDragItem, setCatalogDragItem] = useState<CatalogItem | null>(null);

  const addPlacement = useCallback(
    (
      item: CatalogItem,
      position: { x: number; z: number; rotationY?: number; positionY?: number },
    ) => {
      const placement: Placement = {
        placementId: newId(),
        roomId,
        catalogItemId: item.itemId,
        positionX: position.x,
        positionY: position.positionY ?? defaultPlacementY(item),
        positionZ: position.z,
        rotationY: position.rotationY ?? 0,
      };
      setPlacementsState((prev) => [...prev, placement]);
      setSelectedPlacementId(placement.placementId);
    },
    [roomId],
  );

  const updatePlacement = useCallback((placementId: string, patch: Partial<Placement>) => {
    setPlacementsState((prev) =>
      prev.map((p) => (p.placementId === placementId ? { ...p, ...patch } : p)),
    );
  }, []);

  const removePlacement = useCallback((placementId: string) => {
    setPlacementsState((prev) => prev.filter((p) => p.placementId !== placementId));
    setSelectedPlacementId((id) => (id === placementId ? null : id));
  }, []);

  const value = useMemo(
    () => ({
      placements,
      selectedPlacementId,
      catalogDragItem,
      setCatalogDragItem,
      addPlacement,
      updatePlacement,
      removePlacement,
      selectPlacement: setSelectedPlacementId,
      setPlacements: setPlacementsState,
    }),
    [
      placements,
      selectedPlacementId,
      catalogDragItem,
      addPlacement,
      updatePlacement,
      removePlacement,
    ],
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider');
  return ctx;
}
