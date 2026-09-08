-- AlterTable
ALTER TABLE `hallazgos` ADD COLUMN `correccion_inmediata` TEXT NULL,
    ADD COLUMN `eficacia_confirmada` BOOLEAN NULL,
    ADD COLUMN `fecha_cierre` DATETIME(3) NULL,
    ADD COLUMN `motivo_reapertura` TEXT NULL,
    ADD COLUMN `plan_accion` TEXT NULL,
    ADD COLUMN `plan_aprobado_at` DATETIME(3) NULL,
    ADD COLUMN `plan_aprobado_por_id` VARCHAR(191) NULL,
    ADD COLUMN `validado_at` DATETIME(3) NULL,
    ADD COLUMN `validado_por_id` VARCHAR(191) NULL,
    ADD COLUMN `verificacion_eficacia` TEXT NULL,
    ADD COLUMN `verificado_at` DATETIME(3) NULL,
    ADD COLUMN `verificado_por_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `analisis_causa` (
    `id` VARCHAR(191) NOT NULL,
    `hallazgo_id` VARCHAR(191) NOT NULL,
    `metodologia` ENUM('CINCO_PORQUES', 'ISHIKAWA', 'LLUVIA_CAUSAS', 'OTRO') NOT NULL,
    `contenido` JSON NOT NULL,
    `causa_inmediata` TEXT NULL,
    `causa_contribuyente` TEXT NULL,
    `causa_raiz` TEXT NULL,
    `comentarios_equipo` TEXT NULL,
    `elaborado_por_id` VARCHAR(191) NULL,
    `elaborado_at` DATETIME(3) NULL,
    `actualizado_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `analisis_causa_hallazgo_id_key`(`hallazgo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `eventos_hallazgo` (
    `id` VARCHAR(191) NOT NULL,
    `hallazgo_id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tipo` VARCHAR(191) NOT NULL,
    `detalle` TEXT NULL,
    `estado_nuevo` ENUM('ABIERTO', 'EN_ANALISIS', 'PLAN_APROBADO', 'EN_EJECUCION', 'PENDIENTE_EFICACIA', 'CERRADO', 'REABIERTO') NULL,
    `actor_id` VARCHAR(191) NULL,
    `actor_nombre` VARCHAR(191) NULL,

    INDEX `eventos_hallazgo_hallazgo_id_idx`(`hallazgo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `analisis_causa` ADD CONSTRAINT `analisis_causa_hallazgo_id_fkey` FOREIGN KEY (`hallazgo_id`) REFERENCES `hallazgos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `eventos_hallazgo` ADD CONSTRAINT `eventos_hallazgo_hallazgo_id_fkey` FOREIGN KEY (`hallazgo_id`) REFERENCES `hallazgos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
