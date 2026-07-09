# GearFlow

GearFlow is a cycling record and gear management system built with Vue 3, Vite, Node.js, Express, Prisma, and MySQL. It supports user registration, login, bikes, rides, gear assets, maintenance records, and dashboard statistics.

## Requirements

- Node.js 20 LTS or higher.
- npm.
- MySQL Server 8.x or compatible local MySQL service.
- MySQL Workbench is optional.
- No Docker required.

## MySQL Setup

Install and start MySQL first. This repository does not create or overwrite any production database automatically.

Create the local database and user:

```sql
CREATE DATABASE gearflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gearflow_user'@'localhost' IDENTIFIED BY 'replace_password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON gearflow.* TO 'gearflow_user'@'localhost';
FLUSH PRIVILEGES;
```

The review SQL file is available at `docs/database.sql`.

## Local Development

Install dependencies:

```bash
npm run install:all
```

Create `server/.env` from `server/.env.example` and replace the password:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL="mysql://gearflow_user:replace_password@localhost:3306/gearflow"
DEMO_EMAIL=demo@gearflow.app
DEMO_PASSWORD=ride123
SESSION_SECRET=replace-with-a-long-random-string
COOKIE_SECURE=false
```

After MySQL is installed and `DATABASE_URL` is correct, initialize the schema and seed local demo data:

```bash
npm run db:migrate
npm run db:seed
```

Do not run these commands against production without a verified backup.

Start the backend and frontend:

```bash
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Health: `http://localhost:3001/api/health`
- Status: `http://localhost:3001/api/status`

Demo seed account:

- Email: `demo@gearflow.app`
- Password: `ride123`

## Scripts

Root scripts:

- `npm run install:all`: install root, server, and client dependencies.
- `npm run dev`: run server and client together.
- `npm run build`: generate Prisma client and build the frontend.
- `npm run start`: start the backend server.
- `npm run db:migrate`: run Prisma migration against the configured MySQL database.
- `npm run db:seed`: insert local demo data when the user table is empty.

Server scripts:

- `npm run start --prefix server`: start Express on port `3001`.
- `npm run dev --prefix server`: start Express with nodemon.
- `npm run prisma:generate --prefix server`: generate Prisma client.
- `npm run prisma:migrate --prefix server`: run `prisma migrate dev`.
- `npm run seed --prefix server`: seed local demo data.

Client scripts:

- `npm run dev --prefix client`: start Vite on port `5173`.
- `npm run build --prefix client`: build `client/dist`.
- `npm run preview --prefix client`: preview the built frontend.

## API and Auth

The frontend calls relative `/api/...` paths with `credentials: 'include'`. Auth uses an HTTP-only cookie named `gearflow_session`.

Auth endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Main API paths:

- `/api/bikes`
- `/api/rides`
- `/api/gears`
- `/api/maintenance`
- `/api/wishlist`
- `/api/dashboard/summary`
- `/api/insights/overview`
- `/api/health`
- `/api/status`

## Data Model

Core tables:

- `User`: registered users and roles.
- `Bike`: independently managed bicycles.
- `Ride`: cycling records with distance, duration, elevation, and route.
- `Gear`: equipment assets linked to a user and optionally a bike.
- `Maintenance`: maintenance records linked to gear.
- `WishlistItem`: optional upgrade planning.

Money and distance fields use Prisma Decimal and are serialized to JavaScript numbers in API responses.

## Production Notes

The previous deployment report describes an older SQLite deployment. For MySQL deployment, verify locally first, then configure production `DATABASE_URL` to a dedicated MySQL database. Back up any existing production data before migration.

Nginx should serve `client/dist` for the frontend and proxy `/api` to the backend:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /www/wwwroot/gearflow/client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Cookie $http_cookie;
        proxy_pass_header Set-Cookie;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Set `COOKIE_SECURE=true` only when serving over HTTPS.
