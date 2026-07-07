'use client';

import clsx from 'clsx';
import { useMemo, useState } from 'react';
import {
  CATALOG_SECTIONS,
  catalogSectionForItem,
  SECTION_UI,
  type CatalogSectionId,
} from '@/config/catalogCategories';
import { filterItemsByBrand, getBrandsForSection } from '@/lib/catalog';
import type { CatalogItem } from '@/types';

const ALL_BRANDS = '';

export function CatalogPanel({
  items,
  activeItemId,
  allowedSections,
  onPick,
}: {
  items: CatalogItem[];
  activeItemId: string | null;
  /** When set, only these catalog sections are shown (kitchen/bath). */
  allowedSections?: CatalogSectionId[];
  onPick: (item: CatalogItem) => void;
}) {
  const [openSections, setOpenSections] = useState<Record<CatalogSectionId, boolean>>({
    'base-cabinets': true,
    'wall-cabinets': true,
    countertops: true,
    appliances: true,
    vanities: false,
    toilets: true,
    showers: true,
    other: false,
  });

  const [brandBySection, setBrandBySection] = useState<Record<CatalogSectionId, string>>({
    'base-cabinets': ALL_BRANDS,
    'wall-cabinets': ALL_BRANDS,
    countertops: ALL_BRANDS,
    appliances: ALL_BRANDS,
    vanities: ALL_BRANDS,
    toilets: ALL_BRANDS,
    showers: ALL_BRANDS,
    other: ALL_BRANDS,
  });

  const bySection = useMemo(
    () =>
      items.reduce<Record<CatalogSectionId, CatalogItem[]>>(
        (acc, item) => {
          const section = catalogSectionForItem(item);
          acc[section] = acc[section] ?? [];
          acc[section].push(item);
          return acc;
        },
        {} as Record<CatalogSectionId, CatalogItem[]>,
      ),
    [items],
  );

  const toggle = (id: CatalogSectionId) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-1 p-2">
      {CATALOG_SECTIONS.map((section) => {
        if (allowedSections && !allowedSections.includes(section.id)) return null;
        const sectionItems = bySection[section.id] ?? [];
        if (sectionItems.length === 0) return null;
        const isOpen = openSections[section.id] ?? true;
        const brands = getBrandsForSection(section.id, items);
        const selectedBrand = brandBySection[section.id] ?? ALL_BRANDS;
        const filtered = filterItemsByBrand(
          sectionItems,
          selectedBrand || null,
        );

        return (
          <div
            key={section.id}
            className={clsx('overflow-hidden rounded-xl border bg-white shadow-sm', SECTION_UI.border)}
          >
            <button
              type="button"
              onClick={() => toggle(section.id)}
              className={clsx(
                'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-[var(--sage-50)]',
                SECTION_UI.header,
              )}
            >
              <div className="min-w-0">
                <h3 className="truncate text-xs font-bold text-stone-800">{section.title}</h3>
                <p className="truncate text-[10px] text-stone-500">
                  {section.description} · {brands.length} brands
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-stone-400">
                {isOpen ? '▼' : '▶'}
              </span>
            </button>
            {isOpen && (
              <div className="space-y-2 border-t border-stone-100 bg-stone-50/30 p-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Brand
                  <select
                    value={selectedBrand}
                    onChange={(e) =>
                      setBrandBySection((prev) => ({
                        ...prev,
                        [section.id]: e.target.value,
                      }))
                    }
                    className="input-modern mt-1 py-1.5 text-xs"
                  >
                    <option value={ALL_BRANDS}>All brands ({sectionItems.length})</option>
                    {brands.map((brand) => {
                      const count = sectionItems.filter((i) => i.brand === brand).length;
                      return (
                        <option key={brand} value={brand}>
                          {brand} ({count})
                        </option>
                      );
                    })}
                  </select>
                </label>
                <ul className="max-h-56 space-y-1 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <li className="px-2 py-3 text-center text-xs text-slate-500">
                      No items for this brand
                    </li>
                  ) : (
                    filtered.map((item) => (
                      <li key={item.itemId}>
                        <button
                          type="button"
                          onClick={() => onPick(item)}
                          className={clsx(
                            'w-full rounded-lg border px-3 py-2 text-left text-sm transition',
                            activeItemId === item.itemId
                              ? SECTION_UI.active
                              : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50',
                          )}
                        >
                          <div className="font-medium leading-tight">{item.name}</div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.widthIn}&quot; × {item.depthIn}&quot;
                            {item.heightIn ? ` × ${item.heightIn}"` : ''} · $
                            {item.listPrice.toLocaleString()}
                          </p>
                          {item.brandTier && (
                            <span
                              className={clsx(
                                'mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                                SECTION_UI.badge,
                              )}
                            >
                              {item.brandTier.replace('-', ' ')}
                            </span>
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
