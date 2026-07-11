# GearFlow v1.1.0 release

## Release identity

- Version: `v1.1.0`
- Application commit: `fa64abe98b923510e986c3bcfb520019adb628e2`
- Production release: `/www/wwwroot/gearflow/releases/20260711-213438`
- Current symlink: `/www/wwwroot/gearflow/current`
- Backup: `/root/gearflow-backups/20260711-213146`
- PM2 process: `gearflow-api-v1-1`
- API listener: `127.0.0.1:3003`
- Database: MySQL 8, `gearflow_rc`
- Nginx site: `/www/server/panel/vhost/nginx/extension/120.26.32.163/gearflow.conf`
- Public URL: `http://120.26.32.163`

## Shipped interface

- A single persistent Carbon Gold Wavy Cubes WebGL scene across authentication and every application page.
- The original Merida Dashboard Hero and garage data surfaces.
- Route Field Recomposition page transitions with rapid-navigation state synchronization.
- A shared Wavy scene on the login surface with three-cycle authentication validation.
- The full Dashboard, Rides, Ride Planner, Bikes, Gear, Maintenance, and Insights flows.
- A production favicon and a current-state Playwright release smoke test.

## Validation

- `npm ci` succeeded for root, server, and client lockfiles.
- Server test suite: 9 passed, 0 failed.
- Vue typecheck and Vite production build passed.
- Prisma Client generation passed.
- `prisma migrate deploy`: one migration present, no pending migrations.
- Production seed: not run; the database already contained the Demo user and data.
- API health, unauthenticated 401, login, `auth/me`, read, temporary create, and delete passed.
- OpenRouteService/Open-Meteo production integration generated a 175-point, 9.49 km route.
- Local, tunneled production preview, and public Playwright smoke tests passed.
- Login/logout passed three consecutive cycles with exactly one Wavy Canvas.
- Dashboard Hero loaded at natural size.
- Ordered and rapid page switching, reduced motion, SPA fallback, favicon, and static assets passed.
- Leaflet route rendering and Expand/Close Map passed during local release validation.
- New PM2 process remained online with zero restarts during release validation.
- `nginx -t` passed before and after public traffic replacement.

## Production state

The public Nginx route points to the v1.1.0 release and proxies `/api/` to port 3003. The previous `gearflow` and `gearflow-rc` PM2 entries are stopped, not deleted. Their directories, database artifacts, configurations, and the full pre-switch backup remain available for rollback.

## Known limitations

- The deployment currently serves plain HTTP because no HTTPS certificate is configured for the IP-only site. `COOKIE_SECURE` must remain `false` until HTTPS is introduced.
- The Vite build reports a non-blocking large-chunk warning for the Three.js renderer.
- Nginx receives routine internet scanner requests; no release-related application or WebGL errors were observed.
- Production uses the existing `gearflow_rc` database because it already had the compatible migration and validated Demo data.

See [DEPLOYMENT.md](DEPLOYMENT.md) for health checks and rollback commands.
