# Calidad 360 Hospitalaria

Sistema de Gestión de Calidad (SGC) para el Departamento de Gestión de Calidad de un hospital,
basado en el enfoque por procesos de **ISO 9001**.

- Especificación funcional (propuesta): `Propuesta_Sistema_Gestion_Calidad_Hospitalaria_ISO9001_v1.1.docx`.
- **Manual de usuario**: [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md) (fuente) · `Manual_de_Usuario_Calidad360.docx` (Word).
- Despliegue en Railway: ver [`DEPLOY.md`](DEPLOY.md).

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
- **Fase 3** ✅ indicadores / KPI: definición, cálculo automático (numerador/denominador),
  semáforo por meta y umbral, captura por periodo, tendencia entre periodos, alertas de
  captura pendiente / fuera de meta / reincidencia, análisis y consolidado anual.
- **Fase 4** ✅ riesgos y oportunidades: matriz configurable (prob × impacto), nivel inherente
  y residual, controles y plan de tratamiento, revisiones, mapa de calor, riesgos
  transversales, y el candado de "no cerrar riesgo alto/crítico sin responsable ni plan".
- **Fase 5** ✅ control documental: documentos versionados con flujo de aprobación,
  archivos subidos al servidor (con hash y descarga autenticada), vigencias y próxima
  revisión, lista maestra, obsolescencia automática de la versión anterior.
- **Fase 6** ✅ auditorías: programa anual, planes, ejecución del checklist (cumple/no
  cumple/observación/N/A), generación de hallazgos desde el checklist, informe automático
  y flujo de aprobación/cierre. Incluye módulo base de Hallazgos y no conformidades.
- **Fase 7** ✅ hallazgos y no conformidades — ciclo completo: análisis de causa
  (5 porqués / Ishikawa / lluvia de causas), máquina de estados con transiciones
  guardadas, evidencias adjuntas, verificación de eficacia y línea de tiempo.
- **Fase 8** ✅ planes de mejora y acciones (CAPA): acciones individuales rastreables con
  origen (hallazgo / riesgo / indicador / comité / MCC), % de avance con historial,
  evidencias y verificación de eficacia. Incluye el registro de Mejora Continua (MCC).
- **Fase 9** ✅ motor de automatizaciones (reglas configurables, cron diario, escalamiento),
  notificaciones in-app con campana + correo opcional, y calendario transversal del SGC.
- **Fase 10** ✅ dashboard gerencial con radar de calidad (tarjetas de prioridad, semáforos,
  distribuciones y alertas inteligentes) y módulo de reportes (listados con descarga CSV +
  informe ejecutivo imprimible para la revisión por la dirección). **Fin del MVP.**
