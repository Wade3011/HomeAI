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
import type { CustomDragTemplate } from '@/lib/customItems';
import type { CatalogItem, CustomItemSpec, Placement } from '@/types';

interface PlannerContextValue {
  placements: Placement[];
  selectedPlacementId: string | null;
  catalogDragItem: CatalogItem | null;
  setCatalogDragItem: (item: CatalogItem | null) => void;
  customDragItem: CustomDragTemplate | null;
  setCustomDragItem: (item: CustomDragTemplate | null) => void;
  addCatalogPlacement: (
    item: CatalogItem,
    position: { x: number; z: number; rotationY?: number; positionY?: number },
  ) => void;
  addCustomPlacement: (
    customItem: CustomItemSpec,
    position: { x: number; z: number; rotationY?: number },
  ) => void;
  updatePlacement: (placementId: string, patch: Partial<Placement>) => void;
  updateCustomItem: (placementId: string, patch: Partial<CustomItemSpec>) => void;
  removePlacement: (placementId: string) => void;
  selectPlacement: (placementId: string | null) => void;
  setPlacements: (placements: Placement[]) => void;
  cancelPlaceMode: () => void;
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
  const [customDragItem, setCustomDragItem] = useState<CustomDragTemplate | null>(null);

  const cancelPlaceMode = useCallback(() => {
    setCatalogDragItem(null);
    setCustomDragItem(null);
  }, []);

  const addCatalogPlacement = useCallback(
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

  const addCustomPlacement = useCallback(
    (customItem: CustomItemSpec, position: { x: number; z: number; rotationY?: number }) => {
      const placement: Placement = {
        placementId: newId(),
        roomId,
        customItem: { ...customItem },
        positionX: position.x,
        positionY: 0,
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

  const updateCustomItem = useCallback(
    (placementId: string, patch: Partial<CustomItemSpec>) => {
      setPlacementsState((prev) =>
        prev.map((p) => {
          if (p.placementId !== placementId || !p.customItem) return p;
          return { ...p, customItem: { ...p.customItem, ...patch } };
        }),
      );
    },
    [],
  );

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
      customDragItem,
      setCustomDragItem,
      addCatalogPlacement,
      addCustomPlacement,
      updatePlacement,
      updateCustomItem,
      removePlacement,
      selectPlacement: setSelectedPlacementId,
      setPlacements: setPlacementsState,
      cancelPlaceMode,
    }),
    [
      placements,
      selectedPlacementId,
      catalogDragItem,
      customDragItem,
      addCatalogPlacement,
      addCustomPlacement,
      updatePlacement,
      updateCustomItem,
      removePlacement,
      cancelPlaceMode,
    ],
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider');
  return ctx;
}
