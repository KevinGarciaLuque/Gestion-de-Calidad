-- CreateTable
CREATE TABLE `matriz_riesgo` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `escalaProbabilidad` JSON NOT NULL,
    `escalaImpacto` JSON NOT NULL,
    `umbralMedio` INTEGER NOT NULL,
    `umbralAlto` INTEGER NOT NULL,
    `umbralCritico` INTEGER NOT NULL,
    `meses_revision_default` INTEGER NOT NULL DEFAULT 12,
    `actualizado_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `riesgos` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `tipo` ENUM('RIESGO', 'OPORTUNIDAD') NOT NULL DEFAULT 'RIESGO',
    `proceso_id` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `causa` TEXT NULL,
    `consecuencia` TEXT NULL,
    `probabilidad_inherente` INTEGER NOT NULL,
    `impacto_inherente` INTEGER NOT NULL,
    `nivel_inherente` INTEGER NOT NULL,
    `categoria_inherente` ENUM('BAJO', 'MEDIO', 'ALTO', 'CRITICO') NOT NULL,
    `controles` TEXT NULL,
    `eficacia_control` ENUM('NO_EVALUADA', 'INEFICAZ', 'PARCIAL', 'EFICAZ') NOT NULL DEFAULT 'NO_EVALUADA',
    `plan_tratamiento` TEXT NULL,
    `responsable_id` VARCHAR(191) NULL,
    `fecha_compromiso` DATETIME(3) NULL,
    `probabilidad_residual` INTEGER NULL,
    `impacto_residual` INTEGER NULL,
    `nivel_residual` INTEGER NULL,
    `categoria_residual` ENUM('BAJO', 'MEDIO', 'ALTO', 'CRITICO') NULL,
    `estado` ENUM('IDENTIFICADO', 'EN_TRATAMIENTO', 'MONITOREADO', 'CERRADO', 'MATERIALIZADO') NOT NULL DEFAULT 'IDENTIFICADO',
    `fecha_revision` DATETIME(3) NULL,
    `ultima_revision_at` DATETIME(3) NULL,
    `requiere_reevaluacion` BOOLEAN NOT NULL DEFAULT false,
    `archivado_at` DATETIME(3) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `riesgos_codigo_key`(`codigo`),
    INDEX `riesgos_proceso_id_idx`(`proceso_id`),
    INDEX `riesgos_tipo_idx`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `revisiones_riesgo` (
    `id` VARCHAR(191) NOT NULL,
    `riesgo_id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revisado_por_id` VARCHAR(191) NULL,
    `comentario` TEXT NULL,
    `probabilidad` INTEGER NULL,
    `impacto` INTEGER NULL,
    `nivel` INTEGER NULL,
    `categoria` ENUM('BAJO', 'MEDIO', 'ALTO', 'CRITICO') NULL,
    `es_residual` BOOLEAN NOT NULL DEFAULT true,

    INDEX `revisiones_riesgo_riesgo_id_idx`(`riesgo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `riesgos` ADD CONSTRAINT `riesgos_proceso_id_fkey` FOREIGN KEY (`proceso_id`) REFERENCES `procesos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riesgos` ADD CONSTRAINT `riesgos_responsable_id_fkey` FOREIGN KEY (`responsable_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revisiones_riesgo` ADD CONSTRAINT `revisiones_riesgo_riesgo_id_fkey` FOREIGN KEY (`riesgo_id`) REFERENCES `riesgos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revisiones_riesgo` ADD CONSTRAINT `revisiones_riesgo_revisado_por_id_fkey` FOREIGN KEY (`revisado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
