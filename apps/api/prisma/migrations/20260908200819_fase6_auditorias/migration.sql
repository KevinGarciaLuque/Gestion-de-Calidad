-- CreateTable
CREATE TABLE `programas_auditoria` (
    `id` VARCHAR(191) NOT NULL,
    `anio` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `objetivo` TEXT NULL,
    `estado` ENUM('BORRADOR', 'APROBADO') NOT NULL DEFAULT 'BORRADOR',
    `aprobado_por_id` VARCHAR(191) NULL,
    `aprobado_at` DATETIME(3) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `programas_auditoria_anio_key`(`anio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditorias` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `programa_id` VARCHAR(191) NULL,
    `tipo` ENUM('INTERNA', 'EXTERNA', 'SEGUIMIENTO') NOT NULL DEFAULT 'INTERNA',
    `proceso_id` VARCHAR(191) NULL,
    `area_id` VARCHAR(191) NULL,
    `objetivo` TEXT NOT NULL,
    `alcance` TEXT NOT NULL,
    `criterios` TEXT NOT NULL,
    `auditor_lider_id` VARCHAR(191) NULL,
    `fecha_planificada` DATETIME(3) NOT NULL,
    `fecha_inicio_real` DATETIME(3) NULL,
    `fecha_fin_real` DATETIME(3) NULL,
    `estado` ENUM('PLANIFICADA', 'EN_CURSO', 'EJECUTADA', 'INFORME_APROBADO', 'CERRADA', 'CANCELADA') NOT NULL DEFAULT 'PLANIFICADA',
    `reprogramaciones` JSON NOT NULL,
    `informe_resumen` TEXT NULL,
    `informe_conclusiones` TEXT NULL,
    `informe_aprobado_por_id` VARCHAR(191) NULL,
    `informe_aprobado_at` DATETIME(3) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `auditorias_codigo_key`(`codigo`),
    INDEX `auditorias_programa_id_idx`(`programa_id`),
    INDEX `auditorias_proceso_id_idx`(`proceso_id`),
    INDEX `auditorias_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditorias_auditores` (
    `auditoria_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`auditoria_id`, `usuario_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditorias_items` (
    `id` VARCHAR(191) NOT NULL,
    `auditoria_id` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `criterio` TEXT NOT NULL,
    `proceso_id` VARCHAR(191) NULL,
    `resultado` ENUM('PENDIENTE', 'CUMPLE', 'NO_CUMPLE', 'OBSERVACION', 'NO_APLICA') NOT NULL DEFAULT 'PENDIENTE',
    `notas` TEXT NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    INDEX `auditorias_items_auditoria_id_idx`(`auditoria_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hallazgos` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `origen` ENUM('AUDITORIA', 'INDICADOR', 'QUEJA', 'INCIDENTE', 'INSPECCION', 'REVISION_DIRECCION', 'OTRO') NOT NULL,
    `auditoria_id` VARCHAR(191) NULL,
    `auditoria_item_id` VARCHAR(191) NULL,
    `proceso_id` VARCHAR(191) NULL,
    `area_id` VARCHAR(191) NULL,
    `descripcion` TEXT NOT NULL,
    `clasificacion` ENUM('NO_CONFORMIDAD_MAYOR', 'NO_CONFORMIDAD_MENOR', 'OBSERVACION', 'OPORTUNIDAD_MEJORA') NOT NULL,
    `requisito` VARCHAR(191) NULL,
    `evidencia` TEXT NULL,
    `fecha_deteccion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `detectado_por_id` VARCHAR(191) NULL,
    `responsable_id` VARCHAR(191) NULL,
    `fecha_compromiso` DATETIME(3) NULL,
    `prioridad` ENUM('BAJA', 'MEDIA', 'ALTA') NOT NULL DEFAULT 'MEDIA',
    `estado` ENUM('ABIERTO', 'EN_ANALISIS', 'PLAN_APROBADO', 'EN_EJECUCION', 'PENDIENTE_EFICACIA', 'CERRADO', 'REABIERTO') NOT NULL DEFAULT 'ABIERTO',
    `archivado_at` DATETIME(3) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hallazgos_codigo_key`(`codigo`),
    UNIQUE INDEX `hallazgos_auditoria_item_id_key`(`auditoria_item_id`),
    INDEX `hallazgos_origen_idx`(`origen`),
    INDEX `hallazgos_estado_idx`(`estado`),
    INDEX `hallazgos_proceso_id_idx`(`proceso_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evidencias` (
    `id` VARCHAR(191) NOT NULL,
    `entidad` VARCHAR(191) NOT NULL,
    `entidad_id` VARCHAR(191) NOT NULL,
    `nombre_original` VARCHAR(191) NOT NULL,
    `ruta_relativa` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `tamano_bytes` INTEGER NOT NULL,
    `hash_sha256` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `subido_por_id` VARCHAR(191) NULL,
    `subido_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `evidencias_entidad_entidad_id_idx`(`entidad`, `entidad_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auditorias` ADD CONSTRAINT `auditorias_programa_id_fkey` FOREIGN KEY (`programa_id`) REFERENCES `programas_auditoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditorias` ADD CONSTRAINT `auditorias_proceso_id_fkey` FOREIGN KEY (`proceso_id`) REFERENCES `procesos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditorias` ADD CONSTRAINT `auditorias_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `unidades_organizativas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditorias` ADD CONSTRAINT `auditorias_auditor_lider_id_fkey` FOREIGN KEY (`auditor_lider_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditorias_auditores` ADD CONSTRAINT `auditorias_auditores_auditoria_id_fkey` FOREIGN KEY (`auditoria_id`) REFERENCES `auditorias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditorias_auditores` ADD CONSTRAINT `auditorias_auditores_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditorias_items` ADD CONSTRAINT `auditorias_items_auditoria_id_fkey` FOREIGN KEY (`auditoria_id`) REFERENCES `auditorias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditorias_items` ADD CONSTRAINT `auditorias_items_proceso_id_fkey` FOREIGN KEY (`proceso_id`) REFERENCES `procesos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallazgos` ADD CONSTRAINT `hallazgos_auditoria_id_fkey` FOREIGN KEY (`auditoria_id`) REFERENCES `auditorias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallazgos` ADD CONSTRAINT `hallazgos_auditoria_item_id_fkey` FOREIGN KEY (`auditoria_item_id`) REFERENCES `auditorias_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallazgos` ADD CONSTRAINT `hallazgos_proceso_id_fkey` FOREIGN KEY (`proceso_id`) REFERENCES `procesos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallazgos` ADD CONSTRAINT `hallazgos_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `unidades_organizativas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallazgos` ADD CONSTRAINT `hallazgos_detectado_por_id_fkey` FOREIGN KEY (`detectado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallazgos` ADD CONSTRAINT `hallazgos_responsable_id_fkey` FOREIGN KEY (`responsable_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidencias` ADD CONSTRAINT `evidencias_subido_por_id_fkey` FOREIGN KEY (`subido_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
