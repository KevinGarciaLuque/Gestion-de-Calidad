-- CreateTable
CREATE TABLE `archivos_documento` (
    `id` VARCHAR(191) NOT NULL,
    `nombre_original` VARCHAR(191) NOT NULL,
    `ruta_relativa` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `tamano_bytes` INTEGER NOT NULL,
    `hash_sha256` VARCHAR(191) NOT NULL,
    `subido_por_id` VARCHAR(191) NULL,
    `subido_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `tipo` ENUM('POLITICA', 'MANUAL', 'PROCEDIMIENTO', 'PROTOCOLO', 'INSTRUCTIVO', 'FORMATO', 'REGISTRO', 'GUIA', 'LISTA_MAESTRA', 'EXTERNO') NOT NULL,
    `proceso_id` VARCHAR(191) NULL,
    `area_id` VARCHAR(191) NULL,
    `propietario_id` VARCHAR(191) NULL,
    `restringido` BOOLEAN NOT NULL DEFAULT false,
    `palabras_clave` TEXT NULL,
    `archivado_at` DATETIME(3) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `documentos_codigo_key`(`codigo`),
    INDEX `documentos_tipo_idx`(`tipo`),
    INDEX `documentos_proceso_id_idx`(`proceso_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos_versiones` (
    `id` VARCHAR(191) NOT NULL,
    `documento_id` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `estado` ENUM('BORRADOR', 'EN_REVISION', 'VIGENTE', 'OBSOLETA') NOT NULL DEFAULT 'BORRADOR',
    `motivo_cambio` TEXT NULL,
    `archivo_id` VARCHAR(191) NULL,
    `fecha_emision` DATETIME(3) NULL,
    `fecha_vigencia_desde` DATETIME(3) NULL,
    `proxima_revision_at` DATETIME(3) NULL,
    `propuesta_por_id` VARCHAR(191) NULL,
    `revisor_id` VARCHAR(191) NULL,
    `aprobador_id` VARCHAR(191) NULL,
    `enviada_revision_at` DATETIME(3) NULL,
    `aprobada_at` DATETIME(3) NULL,
    `comentario_revision` TEXT NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    INDEX `documentos_versiones_documento_id_estado_idx`(`documento_id`, `estado`),
    UNIQUE INDEX `documentos_versiones_documento_id_numero_key`(`documento_id`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `archivos_documento` ADD CONSTRAINT `archivos_documento_subido_por_id_fkey` FOREIGN KEY (`subido_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_proceso_id_fkey` FOREIGN KEY (`proceso_id`) REFERENCES `procesos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `unidades_organizativas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_propietario_id_fkey` FOREIGN KEY (`propietario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_versiones` ADD CONSTRAINT `documentos_versiones_documento_id_fkey` FOREIGN KEY (`documento_id`) REFERENCES `documentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_versiones` ADD CONSTRAINT `documentos_versiones_archivo_id_fkey` FOREIGN KEY (`archivo_id`) REFERENCES `archivos_documento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_versiones` ADD CONSTRAINT `documentos_versiones_propuesta_por_id_fkey` FOREIGN KEY (`propuesta_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_versiones` ADD CONSTRAINT `documentos_versiones_revisor_id_fkey` FOREIGN KEY (`revisor_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_versiones` ADD CONSTRAINT `documentos_versiones_aprobador_id_fkey` FOREIGN KEY (`aprobador_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
