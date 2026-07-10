# GearFlow Current Handoff

Updated: 2026-07-10

## Stack

- Frontend: Vue 3 + Vite + TypeScript
- Backend: Express
- Data: MySQL + Prisma
- Auth: HTTP-only cookie session
- Views are switched locally through `currentView`; there is no Vue Router.

## Completed Product Stages

- 4A-1: Directional Shared-Axis page transitions and navigation indicator.
- 4A-2: Private garage App Shell, Dashboard, and Bikes visual direction.
- 4A-3: Rides performance log and Gear mechanical asset UI.
- 4B-1: Interactive Value Estimator.

The transition implementation is locked: Vue `mode="out-in"`, directional shared-axis motion, fixed sidebar, and no View Transitions API.

## Value Estimator

- Endpoint: `POST /api/gears/:id/valuation/preview`.
- It is authenticated and only reads the current user's Gear record.
- Temporary overrides: `purchasePrice`, `purchaseDate`, `condition`, `expectedLifespanMonths`, and `minResidualRate`.
- The backend reuses `server/services/depreciation.service.js` through `server/services/valuation/local-rule.provider.js`.
- It does not write the database, update Gear data, create estimate history, or provide Apply Estimate.
- There is no market API, manual comparables provider, or eBay provider.
- Valid condition values are `new`, `excellent`, `good`, `fair`, and `poor`.
- The UI shows residual rate as a percentage and sends the existing 0-1 API value.

## GSAP Status

- `client` includes `gsap@3.15.0`.
- GSAP is not imported or used by current page source.
- `@gsap/react` is not installed because the client is Vue.

## Current Assets

The active page assets are local files in `client/src/assets/raw/`:

- `my-merida-dashboard-original.jpeg`
- `scultura-garage-original.jpg`
- `reacto-rides-original.jpg`
- `gear-dura-ace-brake-original.jpg`

## Next Stage

Ride Recommendation Rules Prototype:

- No Open-Meteo integration yet.
- No openrouteservice integration yet.
- No map UI yet.
- ScrollMap is reserved for future route result presentation.
- Wavy Cubes is reserved for a future global interactive-background prototype.
- Neither reference is integrated into the production UI.

## Guardrails

- Do not edit `server/.env` or expose environment values.
- Do not run Prisma migrate, db push, seed, or destructive database commands unless explicitly requested.
- Do not import `docs/database.sql`; Prisma schema and migrations are the source of truth for local database structure.
- Preserve existing CRUD, authentication, and page transition behavior when adding future UI features.
