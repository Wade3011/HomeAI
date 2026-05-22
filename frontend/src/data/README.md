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

List prices are approximate **2024–2026 US retail** averages for planning only—not quotes. Brand metadata includes reference prices (e.g. 24" base, $/sq ft). See `priceDisclaimer` in the JSON file.
