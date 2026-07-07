# Product catalog data

`catalog.json` is the source of truth for the planner catalog (~2,600 SKUs as of last generate).

## Regenerate

```bash
cd frontend && node scripts/generate-catalog.mjs
```

## AWS S3 (planned)

The same JSON shape will be published to S3. Replace `getCatalogFile()` in `src/lib/catalog.ts` with a fetch to the bucket URL; keep the `CatalogFile` TypeScript interface unchanged.

## Scale (v2 catalog)

| Category | Brands | Example SKUs per brand |
|----------|--------|-------------------------|
| Cabinets | 62 | Base widths, wall, corner, sink base, drawer base, pantry |
| Countertops | 39 | 11 slab lengths × laminate, quartz, granite, marble, porcelain, etc. |
| Vanities | 38 | 8 widths (18"–72") |

Regenerate after editing `scripts/generate-catalog.mjs`.

## Pricing

**Material-only** list prices. Menards-focused lines, toilets, and showers were manually calibrated (`priceSource: manual`, see `priceCalibratedAt` in JSON). Other cabinet brands scale from 24" reference anchors. Regenerate after editing `scripts/generate-catalog.mjs`.
