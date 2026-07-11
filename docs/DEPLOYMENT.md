# GearFlow production deployment

## Production architecture

```text
Browser (HTTP :80)
  -> Nginx /www/server/nginx
     -> /        /www/wwwroot/gearflow/current/client/dist
     -> /api/    http://127.0.0.1:3003/api/
  -> PM2 gearflow-api-v1-1
     -> MySQL 8 on 127.0.0.1:3306, database gearflow_rc
```

The production server is Alibaba Cloud Linux 3. Nginx is managed by the existing BaoTa installation. The application is deployed as immutable releases:

```text
/www/wwwroot/gearflow/
  releases/<timestamp>/
  shared/server.env
  current -> releases/<timestamp>
```

Do not put environment files in Git or inside a release. `server/.env` is a symlink to `shared/server.env` and must remain mode `600`.

## Environment keys

The production environment uses these keys without committing their values:

- `NODE_ENV`
- `PORT`
- `HOST`
- `CORS_ORIGIN`
- `DATABASE_URL`
- `DEMO_EMAIL`
- `DEMO_PASSWORD`
- `SESSION_SECRET`
- `JWT_SECRET`
- `COOKIE_SECURE`
- `ORS_API_KEY`

Production binds the API to `127.0.0.1`; it is exposed only through Nginx.

## Build and release

```bash
npm ci
npm ci --prefix server
npm ci --prefix client
npm test --prefix server
npm run build
npm run ui:smoke
```

On the server, install full server dependencies for Prisma migration, then prune development packages:

```bash
cd /www/wwwroot/gearflow/releases/<release>/server
npm ci
npx prisma generate
npx prisma migrate deploy
npm prune --omit=dev
```

Only `prisma migrate deploy` is allowed in production. Do not use `migrate dev`, `migrate reset`, `db push`, or destructive database commands.

## Health and operational checks

```bash
curl -fsS http://127.0.0.1:3003/api/health
curl -fsS http://127.0.0.1/api/health -H 'Host: 120.26.32.163'
pm2 list
pm2 logs gearflow-api-v1-1 --lines 100 --nostream
nginx -t
readlink -f /www/wwwroot/gearflow/current
```

Before reloading Nginx, always back up the active site extension, run `nginx -t`, and keep the previous application process available until browser and API validation pass.

## Rollback

The v1.1.0 pre-switch Nginx configuration is:

```text
/www/server/panel/vhost/nginx/extension/120.26.32.163/gearflow.conf.pre-v1.1.0-20260711-213909
```

Rollback the public site without changing or reversing the MySQL migration:

```bash
cp -a /www/server/panel/vhost/nginx/extension/120.26.32.163/gearflow.conf.pre-v1.1.0-20260711-213909 \
  /www/server/panel/vhost/nginx/extension/120.26.32.163/gearflow.conf
nginx -t
nginx -s reload
pm2 start gearflow
pm2 stop gearflow-api-v1-1
pm2 save
curl -I http://127.0.0.1/ -H 'Host: 120.26.32.163'
```

The complete pre-deployment backup is stored at `/root/gearflow-backups/20260711-213146`. Do not delete the backup, the stopped PM2 entries, the old static directory, or the old application directory during routine rollback.

