# Floor plan presets

Blueprint-based project templates — rooms, connections, and exterior doors in one shot.

## Kraenzlein 7629 (`kraenzlein-7629`)

Source: BZAK Builders **30' Wide Floor Plan** for Wade & Angela Sanmiguel, 7629 Kraenzlein Rd, Saginaw MI (sheet dated 01/22/26).

| Area | Rooms |
|------|--------|
| Entry | Covered porch |
| Public | Living, dining, kitchen (open), pantry |
| Work | Office, office 2 |
| Circulation | 42" hallway |
| Beds | Master, bedroom, bedroom 2, walk-in closet |
| Bath | Master bath, shared bath, half bath |
| Service | Utility, 40×30 garage |

Dimensions match stud-face sizes on the sheet (feet and inches with eighths, not rounded decimals). Open connections match the open living/dining/kitchen; doors on bedrooms, baths, pantry, and garage.

**Seeded project id:** `kraenzlein-7629` (available on dev/mock backend).

**Create a copy:** Projects → “+ Kraenzlein blueprint”, or `POST /api/projects` with `{ "presetId": "kraenzlein-7629" }`.

To adjust room sizes, edit `kraenzlein-7629.ts` and restart the dev server.
