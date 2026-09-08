-- CreateTable
CREATE TABLE `procesos` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ESTRATEGICO', 'MISIONAL', 'APOYO') NOT NULL,
    `objetivo` TEXT NOT NULL,
    `area_id` VARCHAR(191) NULL,
    `responsable_id` VARCHAR(191) NULL,
    `suplente_id` VARCHAR(191) NULL,
    `estado` ENUM('BORRADOR', 'VIGENTE', 'ARCHIVADO') NOT NULL DEFAULT 'BORRADOR',
    `ultima_aprobacion_at` DATETIME(3) NULL,
    `proxima_revision_at` DATETIME(3) NULL,
    `archivado_at` DATETIME(3) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `procesos_codigo_key`(`codigo`),
    INDEX `procesos_tipo_idx`(`tipo`),
    INDEX `procesos_area_id_idx`(`area_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procesos_versiones` (
    `id` VARCHAR(191) NOT NULL,
    `proceso_id` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `estado` ENUM('BORRADOR', 'EN_REVISION', 'APROBADA', 'OBSOLETA') NOT NULL DEFAULT 'BORRADOR',
    `alcance` TEXT NOT NULL,
    `entradas` JSON NOT NULL,
    `actividades` JSON NOT NULL,
    `salidas` JSON NOT NULL,
    `recursos` JSON NOT NULL,
    `notas` TEXT NULL,
    `propuesta_por_id` VARCHAR(191) NULL,
    `revisada_por_id` VARCHAR(191) NULL,
    `aprobada_por_id` VARCHAR(191) NULL,
    `enviada_revision_at` DATETIME(3) NULL,
    `aprobada_at` DATETIME(3) NULL,
    `comentario_revision` TEXT NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    INDEX `procesos_versiones_proceso_id_estado_idx`(`proceso_id`, `estado`),
    UNIQUE INDEX `procesos_versiones_proceso_id_numero_key`(`proceso_id`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procesos_relaciones` (
    `id` VARCHAR(191) NOT NULL,
    `origen_id` VARCHAR(191) NOT NULL,
    `destino_id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('PROVEEDOR', 'CLIENTE') NOT NULL,
    `descripcion` TEXT NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `procesos_relaciones_destino_id_idx`(`destino_id`),
    UNIQUE INDEX `procesos_relaciones_origen_id_destino_id_tipo_key`(`origen_id`, `destino_id`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios_roles` ADD CONSTRAINT `usuarios_roles_proceso_id_fkey` FOREIGN KEY (`proceso_id`) REFERENCES `procesos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procesos` ADD CONSTRAINT `procesos_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `unidades_organizativas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procesos` ADD CONSTRAINT `procesos_responsable_id_fkey` FOREIGN KEY (`responsable_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procesos` ADD CONSTRAINT `procesos_suplente_id_fkey` FOREIGN KEY (`suplente_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procesos_versiones` ADD CONSTRAINT `procesos_versiones_proceso_id_fkey` FOREIGN KEY (`proceso_id`) REFERENCES `procesos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procesos_versiones` ADD CONSTRAINT `procesos_versiones_propuesta_por_id_fkey` FOREIGN KEY (`propuesta_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procesos_relaciones` ADD CONSTRAINT `procesos_relaciones_origen_id_fkey` FOREIGN KEY (`origen_id`) REFERENCES `procesos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procesos_relaciones` ADD CONSTRAINT `procesos_relaciones_destino_id_fkey` FOREIGN KEY (`destino_id`) REFERENCES `procesos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
