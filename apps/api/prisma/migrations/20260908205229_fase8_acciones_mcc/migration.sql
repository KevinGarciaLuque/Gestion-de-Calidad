-- CreateTable
CREATE TABLE `acciones` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `tipo` ENUM('CORRECCION', 'ACCION_CORRECTIVA', 'TRATAMIENTO_RIESGO', 'MEJORA') NOT NULL,
    `descripcion` TEXT NOT NULL,
    `resultado_esperado` TEXT NULL,
    `origen` ENUM('HALLAZGO', 'RIESGO', 'INDICADOR', 'AUDITORIA', 'COMITE', 'MCC', 'OTRO') NOT NULL,
    `origen_libre` VARCHAR(191) NULL,
    `hallazgo_id` VARCHAR(191) NULL,
    `riesgo_id` VARCHAR(191) NULL,
    `medicion_id` VARCHAR(191) NULL,
    `proceso_id` VARCHAR(191) NULL,
    `mcc_id` VARCHAR(191) NULL,
    `responsable_id` VARCHAR(191) NULL,
    `fecha_inicio` DATETIME(3) NULL,
    `fecha_compromiso` DATETIME(3) NULL,
    `prioridad` ENUM('BAJA', 'MEDIA', 'ALTA') NOT NULL DEFAULT 'MEDIA',
    `evidencia_requerida` TEXT NULL,
    `avance` INTEGER NOT NULL DEFAULT 0,
    `estado` ENUM('PENDIENTE', 'EN_CURSO', 'COMPLETADA', 'VERIFICADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    `verificacion_eficacia` TEXT NULL,
    `eficaz` BOOLEAN NULL,
    `verificado_por_id` VARCHAR(191) NULL,
    `verificado_at` DATETIME(3) NULL,
    `fecha_cierre` DATETIME(3) NULL,
    `archivado_at` DATETIME(3) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `acciones_codigo_key`(`codigo`),
    INDEX `acciones_hallazgo_id_idx`(`hallazgo_id`),
    INDEX `acciones_riesgo_id_idx`(`riesgo_id`),
    INDEX `acciones_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `acciones_colaboradores` (
    `accion_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`accion_id`, `usuario_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `avances_accion` (
    `id` VARCHAR(191) NOT NULL,
    `accion_id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `avance` INTEGER NOT NULL,
    `comentario` TEXT NULL,
    `estado_nuevo` ENUM('PENDIENTE', 'EN_CURSO', 'COMPLETADA', 'VERIFICADA', 'CANCELADA') NULL,
    `por_id` VARCHAR(191) NULL,
    `por_nombre` VARCHAR(191) NULL,

    INDEX `avances_accion_accion_id_idx`(`accion_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registros_mcc` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `origen` ENUM('COLABORADOR', 'AREA', 'ENCUESTA', 'INDICADOR', 'AUDITORIA', 'COMITE', 'OTRO') NOT NULL,
    `origen_detalle` VARCHAR(191) NULL,
    `area_id` VARCHAR(191) NULL,
    `propuesto_por_id` VARCHAR(191) NULL,
    `estado` ENUM('NUEVO', 'EN_REVISION', 'ACEPTADO', 'NO_PROCEDE', 'EN_EJECUCION', 'VERIFICACION', 'CERRADO') NOT NULL DEFAULT 'NUEVO',
    `impacto` VARCHAR(191) NULL,
    `prioridad` ENUM('BAJA', 'MEDIA', 'ALTA') NULL,
    `clasificado_por_id` VARCHAR(191) NULL,
    `decision_justificacion` TEXT NULL,
    `evaluacion_resultado` TEXT NULL,
    `aprendizaje` TEXT NULL,
    `fecha_cierre` DATETIME(3) NULL,
    `archivado_at` DATETIME(3) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `registros_mcc_codigo_key`(`codigo`),
    INDEX `registros_mcc_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `eventos_mcc` (
    `id` VARCHAR(191) NOT NULL,
    `mcc_id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tipo` VARCHAR(191) NOT NULL,
    `detalle` TEXT NULL,
    `estado_nuevo` ENUM('NUEVO', 'EN_REVISION', 'ACEPTADO', 'NO_PROCEDE', 'EN_EJECUCION', 'VERIFICACION', 'CERRADO') NULL,
    `actor_nombre` VARCHAR(191) NULL,

    INDEX `eventos_mcc_mcc_id_idx`(`mcc_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `acciones` ADD CONSTRAINT `acciones_hallazgo_id_fkey` FOREIGN KEY (`hallazgo_id`) REFERENCES `hallazgos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `acciones` ADD CONSTRAINT `acciones_riesgo_id_fkey` FOREIGN KEY (`riesgo_id`) REFERENCES `riesgos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `acciones` ADD CONSTRAINT `acciones_medicion_id_fkey` FOREIGN KEY (`medicion_id`) REFERENCES `mediciones_indicador`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `acciones` ADD CONSTRAINT `acciones_proceso_id_fkey` FOREIGN KEY (`proceso_id`) REFERENCES `procesos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `acciones` ADD CONSTRAINT `acciones_mcc_id_fkey` FOREIGN KEY (`mcc_id`) REFERENCES `registros_mcc`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `acciones` ADD CONSTRAINT `acciones_responsable_id_fkey` FOREIGN KEY (`responsable_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `acciones` ADD CONSTRAINT `acciones_verificado_por_id_fkey` FOREIGN KEY (`verificado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `acciones_colaboradores` ADD CONSTRAINT `acciones_colaboradores_accion_id_fkey` FOREIGN KEY (`accion_id`) REFERENCES `acciones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `acciones_colaboradores` ADD CONSTRAINT `acciones_colaboradores_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avances_accion` ADD CONSTRAINT `avances_accion_accion_id_fkey` FOREIGN KEY (`accion_id`) REFERENCES `acciones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avances_accion` ADD CONSTRAINT `avances_accion_por_id_fkey` FOREIGN KEY (`por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_mcc` ADD CONSTRAINT `registros_mcc_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `unidades_organizativas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_mcc` ADD CONSTRAINT `registros_mcc_propuesto_por_id_fkey` FOREIGN KEY (`propuesto_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_mcc` ADD CONSTRAINT `registros_mcc_clasificado_por_id_fkey` FOREIGN KEY (`clasificado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `eventos_mcc` ADD CONSTRAINT `eventos_mcc_mcc_id_fkey` FOREIGN KEY (`mcc_id`) REFERENCES `registros_mcc`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
