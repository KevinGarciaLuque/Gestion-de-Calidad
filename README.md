# Calidad 360 Hospitalaria

Sistema de Gestión de Calidad (SGC) para el Departamento de Gestión de Calidad de un hospital,
basado en el enfoque por procesos de **ISO 9001**.

Especificación funcional completa: `Propuesta_Sistema_Gestion_Calidad_Hospitalaria_ISO9001_v1.1.docx`.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + TypeScript + **Ant Design** |
| Backend | **NestJS 11** + TypeScript |
| ORM | Prisma 6 |
| Base de datos | MySQL 8 |
| Auth | JWT propio (access + refresh en cookie httpOnly), preparado para SSO (Entra ID) a futuro |

## Estructura

```
apps/
  api/   → API NestJS (reglas de negocio, permisos, automatizaciones)
  web/   → SPA React + Ant Design
db/      → scripts SQL de aprovisionamiento
```

## Puesta en marcha (desarrollo)

### 1. Base de datos

MySQL 8 debe estar corriendo. Crear la base y el usuario de la aplicación (una sola vez):

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < db\001_create_database_and_user.sql
```

> Edita antes la contraseña dentro del `.sql` y usa la misma en `apps/api/.env`.

### 2. Backend

```bash
cd apps/api
cp .env.example .env        # ajustar credenciales
npm install
npm run db:migrate          # crea las tablas
npm run db:seed             # datos iniciales (permisos, roles, super admin)
npm run start:dev           # http://localhost:3000/api
```

**Usuario inicial:** `admin@calidad360.local` / `Admin.123456` (definidos en `.env`;
al primer ingreso pide cambiar la contraseña).

### 3. Frontend

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

### Todo junto (desde la raíz)

```bash
npm install
npm run dev
```

## Roadmap por fases

- **Fase 0 — Fundaciones** ✅ estructura, stack, base de datos, layout base, bitácora.
- **Fase 1 — Identidad y acceso** ✅ login (JWT + refresh), usuarios, roles + permisos + alcance,
  estructura organizacional, bitácora, cambio de contraseña obligatorio.
- **Fase 2** ✅ mapa de procesos, ficha de caracterización versionada, flujo de aprobación
  (borrador → revisión → aprobada), relaciones proveedor/cliente, alcance de permisos por proceso.
- **Fase 3** Indicadores / KPI.
- **Fase 4** Riesgos y oportunidades.
- **Fase 5** Control documental.
- **Fase 6** Auditorías.
- **Fase 7** Hallazgos y no conformidades.
- **Fase 8** Planes de mejora y acciones (CAPA).
- **Fase 9** Motor de automatizaciones + calendario y notificaciones.
- **Fase 10** Dashboard gerencial + reportes → **fin del MVP**.
