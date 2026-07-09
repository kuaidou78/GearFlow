# GearFlow Deployment Report

## 1. Local build

Status: success.

Command:

```bash
npm run build
```

Result:

- Prisma Client generated successfully.
- Vite production build completed successfully.
- `client/dist` exists.
- `README.md` exists.
- `server/prisma/schema.prisma` exists.
- `server/prisma/seed.js` exists.
- `node_modules` was not uploaded.
- `server/prisma/dev.db` was not uploaded.

## 2. Uploaded directories

Frontend uploaded:

```text
client/dist/* -> /www/wwwroot/gearflow
```

Backend uploaded:

```text
server/* -> /www/server/gearflow-api
```

Excluded from upload:

- `node_modules`
- local `.env`
- `server/prisma/dev.db`
- SQLite journal/WAL/SHM files

## 3. Deployment paths

Frontend deploy directory:

```text
/www/wwwroot/gearflow
```

Backend deploy directory:

```text
/www/server/gearflow-api
```

SQLite production database:

```text
/www/data/gearflow/prod.db
```

Production `DATABASE_URL`:

```text
file:/www/data/gearflow/prod.db
```

Production database was not placed under `/www/wwwroot/gearflow` or `/www/server/gearflow-api`.

## 4. Server runtime

Node/npm:

```text
node v24.18.0
npm 11.16.0
```

Node requirement met: Node.js 20 LTS or higher.

PM2:

```text
name: gearflow
version: 1.0.0
mode: fork
status: online
restart count: 0
watching: disabled
```

Backend port:

```text
3001
```

## 5. Database initialization

Production DB did not exist before deployment.

Actions:

```bash
npx prisma generate
npx prisma db push
```

Seed handling:

- Checked production Gear count before seeding.
- Count was `0`, so demo seed was applied once.
- Seed did not overwrite existing production data.

Final data counts:

```json
{"gear":5,"maintenance":3,"wishlist":3}
```

## 6. Nginx

Existing BaoTa server block already used:

```text
server_name 120.26.32.163
```

To avoid duplicate `server_name` conflicts and avoid rewriting the main BaoTa site config, GearFlow was added through the site extension include:

```text
/www/server/panel/vhost/nginx/extension/120.26.32.163/gearflow.conf
```

Backup created:

```text
/www/server/panel/vhost/nginx/extension/120.26.32.163/gearflow.conf.bak-20260709-115705
```

Nginx behavior:

- `/api/` proxies to `http://127.0.0.1:3001/api/`
- `/assets/` serves `/www/wwwroot/gearflow/assets`
- `/` serves GearFlow SPA with fallback to `index.html`
- Cookie and Set-Cookie are preserved

`nginx -t` result:

```text
nginx: the configuration file /www/server/nginx/conf/nginx.conf syntax is ok
nginx: configuration file /www/server/nginx/conf/nginx.conf test is successful
```

Reload status: performed only after `nginx -t` passed.

## 7. API checks

Server-local health:

```json
{"data":{"ok":true}}
```

Server-local status:

```json
{"data":{"api":"ok","database":"ok","env":"production","port":3001,"version":"1.0.0"}}
```

Public health:

```json
{"data":{"ok":true}}
```

Public status:

```json
{"data":{"api":"ok","database":"ok","env":"production","port":3001,"version":"1.0.0"}}
```

## 8. Public URLs

Homepage:

```text
http://120.26.32.163/
```

Login page:

```text
http://120.26.32.163/login
```

Health:

```text
http://120.26.32.163/api/health
```

Status:

```text
http://120.26.32.163/api/status
```

## 9. Demo account

```text
email: demo@gearflow.app
password: ride123
```

Demo session:

- HTTP-only cookie
- Cookie name: `gearflow_demo_session`
- `COOKIE_SECURE=false` for current HTTP deployment
- SameSite: Lax

## 10. Online validation

Verified online:

- Homepage returns GearFlow production build.
- Login page returns HTTP 200.
- Demo login succeeds.
- Dashboard loads real production SQLite data.
- Gear list loads.
- New Gear can be created.
- Refresh/search after creating Gear confirms persistence.
- Deleting Gear works and cascades associated temporary Maintenance.
- Maintenance can be created.
- Wishlist can be created.
- Wishlist can be deleted.
- Insights shows real statistics from production SQLite.
- Status API shows API/database ok.
- Logout succeeds.

Temporary validation data was removed after smoke testing.

## 11. Remaining issues

No blocking deployment issues remain.

Notes:

- The Nginx integration uses BaoTa's existing IP site extension include rather than a separate duplicate `server_name 120.26.32.163` block. This avoids a server-name conflict and leaves the main BaoTa site config intact.
- The current deployment is HTTP. If HTTPS is configured later, set `COOKIE_SECURE=true` and reload PM2 with updated environment variables.

## 12. Next steps

- Configure HTTPS when a domain or certificate is ready.
- Add a scheduled backup for `/www/data/gearflow/prod.db`.
- Keep `/www/data/gearflow/prod.db` outside release/upload directories.
- Use `pm2 logs gearflow` and `/api/status` for quick production checks.
