-- AlterTable
ALTER TABLE `eventos_mcc` MODIFY `estado_nuevo` ENUM('NUEVO', 'EN_REVISION', 'ACEPTADO', 'NO_PROCEDE', 'EN_EJECUCION', 'VERIFICACION', 'CERRADO', 'SIN_ESTADO') NULL;

-- AlterTable
ALTER TABLE `registros_mcc` ADD COLUMN `acyp_codigo` VARCHAR(191) NULL,
    ADD COLUMN `area_reporta` VARCHAR(191) NULL,
    ADD COLUMN `area_responsable` VARCHAR(191) NULL,
    ADD COLUMN `causa_raiz` TEXT NULL,
    ADD COLUMN `codigo_tipo` VARCHAR(191) NULL,
    ADD COLUMN `compromisos_adquiridos` INTEGER NULL,
    ADD COLUMN `compromisos_cumplidos` INTEGER NULL,
    ADD COLUMN `costo_calidad` DECIMAL(14, 2) NULL,
    ADD COLUMN `donde_impacto` VARCHAR(191) NULL,
    ADD COLUMN `escalamiento` VARCHAR(191) NULL,
    ADD COLUMN `fecha_compromiso_respuesta` DATETIME(3) NULL,
    ADD COLUMN `fecha_limite` DATETIME(3) NULL,
    ADD COLUMN `fecha_notificacion` DATETIME(3) NULL,
    ADD COLUMN `fecha_recepcion` DATETIME(3) NULL,
    ADD COLUMN `fuente` VARCHAR(191) NULL,
    ADD COLUMN `fuente_secundaria` VARCHAR(191) NULL,
    ADD COLUMN `gestor_calidad` VARCHAR(191) NULL,
    ADD COLUMN `importado_at` DATETIME(3) NULL,
    ADD COLUMN `lean_defecto` VARCHAR(191) NULL,
    ADD COLUMN `lean_espera` VARCHAR(191) NULL,
    ADD COLUMN `lean_movimiento` VARCHAR(191) NULL,
    ADD COLUMN `lean_retrabajo` VARCHAR(191) NULL,
    ADD COLUMN `logros` TEXT NULL,
    ADD COLUMN `macroproceso` VARCHAR(191) NULL,
    ADD COLUMN `nota_evidencia` TEXT NULL,
    ADD COLUMN `numero_expediente` VARCHAR(191) NULL,
    ADD COLUMN `phva` ENUM('PLANIFICAR', 'HACER', 'VERIFICAR', 'ACTUAR') NULL,
    ADD COLUMN `porques` JSON NULL,
    ADD COLUMN `procedimiento` VARCHAR(191) NULL,
    ADD COLUMN `proceso_afectado` VARCHAR(191) NULL,
    ADD COLUMN `requiere_acyp` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `responsable_nombre` VARCHAR(191) NULL,
    ADD COLUMN `subproceso` VARCHAR(191) NULL,
    ADD COLUMN `subrogado` VARCHAR(191) NULL,
    ADD COLUMN `tiene_costos` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `tipo_registro` ENUM('NO_CONFORMIDAD', 'SALIDA_NO_CONFORME', 'ENTRADA_NO_CONFORME', 'QUEJA', 'FELICITACION', 'SUGERENCIA', 'OTRO') NULL,
    ADD COLUMN `turno` VARCHAR(191) NULL,
    ADD COLUMN `usuario_encuentra` VARCHAR(191) NULL,
    ADD COLUMN `validacion_calidad` VARCHAR(191) NULL,
    MODIFY `estado` ENUM('NUEVO', 'EN_REVISION', 'ACEPTADO', 'NO_PROCEDE', 'EN_EJECUCION', 'VERIFICACION', 'CERRADO', 'SIN_ESTADO') NOT NULL DEFAULT 'NUEVO';

-- CreateIndex
CREATE INDEX `registros_mcc_tipo_registro_idx` ON `registros_mcc`(`tipo_registro`);

-- CreateIndex
CREATE INDEX `registros_mcc_fecha_recepcion_idx` ON `registros_mcc`(`fecha_recepcion`);
