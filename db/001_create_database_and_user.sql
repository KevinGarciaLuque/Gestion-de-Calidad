-- ============================================================================
-- Calidad 360 Hospitalaria — creación de base de datos y usuario de aplicación
-- Ejecutar UNA sola vez, conectado como root:
--
--   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < db\001_create_database_and_user.sql
--
-- IMPORTANTE: cambia 'CAMBIA_ESTA_CLAVE' por una contraseña fuerte antes de ejecutar,
-- y usa esa misma contraseña en apps/api/.env (DATABASE_URL).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS calidad360
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'calidad360'@'localhost'
  IDENTIFIED BY 'CAMBIA_ESTA_CLAVE';

GRANT ALL PRIVILEGES ON calidad360.* TO 'calidad360'@'localhost';

FLUSH PRIVILEGES;
