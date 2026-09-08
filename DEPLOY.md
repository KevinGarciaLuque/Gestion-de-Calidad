# Despliegue en Railway

El proyecto se despliega como **tres servicios** dentro de un mismo proyecto de Railway:

| Servicio | Qué es | Carpeta raíz |
|----------|--------|--------------|
| `MySQL`  | Base de datos gestionada | — (plugin de Railway) |
| `api`    | API NestJS + Prisma | `apps/api` |
| `web`    | SPA React (Vite), servida como estáticos | `apps/web` |

El repo ya trae `apps/api/railway.json` y `apps/web/railway.json` con los comandos de
build, migración y arranque. Solo hay que crear los servicios y poner las variables.

---

## 1. Crear el proyecto y la base de datos

1. En [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** →
   elige `KevinGarciaLuque/Gestion-de-Calidad`.
2. Railway creará un primer servicio a partir del repo. Bórralo o reconfigúralo en el paso 2
   (es más claro empezar de cero).
3. **+ New** → **Database** → **Add MySQL**. Queda un servicio llamado `MySQL`.

---

## 2. Servicio `api`

**+ New → GitHub Repo →** el mismo repo. En el servicio:

- **Settings → Service Name:** `api`
- **Settings → Root Directory:** `apps/api`
- **Settings → Networking → Public Networking:** *Generate Domain* (anota la URL, p. ej.
  `api-production-xxxx.up.railway.app`).

**Variables** (Settings → Variables → *Raw editor*):

```
NODE_ENV=production
COOKIE_SECURE=true
DATABASE_URL=${{MySQL.MYSQL_URL}}
JWT_ACCESS_SECRET=<pega un secreto largo>
JWT_REFRESH_SECRET=<pega otro secreto distinto>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
CORS_ORIGINS=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
ARCHIVOS_DIR=/data/archivos
SEED_ADMIN_EMAIL=admin@tu-hospital.org
SEED_ADMIN_PASSWORD=<clave inicial fuerte>
SEED_ADMIN_NOMBRE=Administrador de Calidad
```

Genera cada secreto con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> `CORS_ORIGINS` referencia al servicio `web`; si aún no existe, deja el valor y vuelve a
> guardarlo después de crear `web` (paso 3).

**Volumen para archivos** (los adjuntos se perderían en cada despliegue sin esto):

- Settings → **Volumes → New Volume** → *Mount path:* `/data`

**Qué hace el despliegue automáticamente** (`apps/api/railway.json`):

- build: `npm run build`
- pre-deploy: `npm run deploy:release` → `prisma migrate deploy && prisma db seed`
  (crea/actualiza tablas y siembra permisos, roles y el súper administrador; es idempotente
  y se ejecuta en cada despliegue para mantener el catálogo de permisos al día).
- arranque: `npm run start:prod`
- healthcheck: `GET /api/health`

---

## 3. Servicio `web`

**+ New → GitHub Repo →** el mismo repo.

- **Settings → Service Name:** `web`
- **Settings → Root Directory:** `apps/web`
- **Settings → Networking:** *Generate Domain* (será la URL que abren los usuarios).

**Variables:**

```
VITE_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api
```

> `VITE_API_URL` se **incrusta en el build**. Si la cambias, hay que **Redeploy** del
> servicio `web`.

**Build/arranque** (`apps/web/railway.json`): `npm run build` → `serve -s dist`.

---

## 4. Enlazar y desplegar

1. Vuelve a `api` → Variables → confirma que `CORS_ORIGINS` ya resuelve al dominio real de
   `web` (si lo pusiste antes de crear `web`, guárdalo de nuevo).
2. **Redeploy** de `api` y luego de `web` (Deployments → ⋮ → Redeploy), o haz un `git push`:
   Railway redepliega ambos.
3. Espera a que `api` quede *Active* (el healthcheck `/api/health` debe pasar). Revisa
   **Deployments → View Logs** si algo falla; el pre-deploy imprime las migraciones aplicadas
   y el resumen del seed.

---

## 5. Primer ingreso

1. Abre el dominio de `web`.
2. Entra con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
3. Crea usuarios reales, asígnales rol y alcance, y desde *Mi perfil* cambia la clave del
   administrador. (El `SEED_ADMIN_PASSWORD` solo se usa si el usuario aún no existe; cambiarlo
   después en las variables no reescribe la clave.)

---

## Notas

- **Cookies:** con `COOKIE_SECURE=true` la cookie del *refresh* usa `SameSite=None; Secure`,
  necesaria porque `web` y `api` están en dominios distintos. `CORS_ORIGINS` debe ser
  **exactamente** el origen de `web` (sin barra final).
- **Correo:** opcional. Si defines `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  `SMTP_FROM` en `api`, las notificaciones también se envían por correo; sin ellas solo
  quedan dentro del sistema.
- **Migraciones nuevas:** al crear una migración en local (`npm run db:migrate`), commitea la
  carpeta en `apps/api/prisma/migrations/` y haz push; el pre-deploy la aplica sola.
- **Dominio propio:** Settings → Networking → *Custom Domain* en `web` (y opcionalmente en
  `api`). Si cambias dominios, actualiza `CORS_ORIGINS` (api) y `VITE_API_URL` (web) y
  redepliega.
- **Ejecutar el seed manualmente** (si lo necesitas), con la CLI de Railway:
  `railway run --service api npm run db:seed`
