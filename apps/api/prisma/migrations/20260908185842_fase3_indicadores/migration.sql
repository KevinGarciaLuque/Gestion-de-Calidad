-- CreateTable
CREATE TABLE `indicadores` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `objetivo` TEXT NOT NULL,
    `proceso_id` VARCHAR(191) NOT NULL,
    `formula` TEXT NOT NULL,
    `usa_num_den` BOOLEAN NOT NULL DEFAULT true,
    `expresar_porcentaje` BOOLEAN NOT NULL DEFAULT true,
    `unidad` VARCHAR(191) NOT NULL,
    `fuente_datos` TEXT NULL,
    `frecuencia` ENUM('MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL') NOT NULL,
    `sentido` ENUM('CRECIENTE', 'DECRECIENTE') NOT NULL DEFAULT 'CRECIENTE',
    `meta` DOUBLE NOT NULL,
    `umbral_amarillo` DOUBLE NULL,
    `responsable_captura_id` VARCHAR(191) NULL,
    `responsable_analisis_id` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `archivado_at` DATETIME(3) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `indicadores_codigo_key`(`codigo`),
    INDEX `indicadores_proceso_id_idx`(`proceso_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mediciones_indicador` (
    `id` VARCHAR(191) NOT NULL,
    `indicador_id` VARCHAR(191) NOT NULL,
    `anio` INTEGER NOT NULL,
    `periodo` INTEGER NOT NULL,
    `etiqueta` VARCHAR(191) NOT NULL,
    `numerador` DOUBLE NULL,
    `denominador` DOUBLE NULL,
    `valor` DOUBLE NOT NULL,
    `semaforo` ENUM('VERDE', 'AMARILLO', 'ROJO') NOT NULL,
    `analisis` TEXT NULL,
    `plan_accion` TEXT NULL,
    `evidencia_url` VARCHAR(191) NULL,
    `capturado_por_id` VARCHAR(191) NULL,
    `capturado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `analizado_por_id` VARCHAR(191) NULL,
    `analizado_at` DATETIME(3) NULL,
    `actualizado_at` DATETIME(3) NOT NULL,

    INDEX `mediciones_indicador_indicador_id_idx`(`indicador_id`),
    UNIQUE INDEX `mediciones_indicador_indicador_id_anio_periodo_key`(`indicador_id`, `anio`, `periodo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `indicadores` ADD CONSTRAINT `indicadores_proceso_id_fkey` FOREIGN KEY (`proceso_id`) REFERENCES `procesos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indicadores` ADD CONSTRAINT `indicadores_responsable_captura_id_fkey` FOREIGN KEY (`responsable_captura_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indicadores` ADD CONSTRAINT `indicadores_responsable_analisis_id_fkey` FOREIGN KEY (`responsable_analisis_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediciones_indicador` ADD CONSTRAINT `mediciones_indicador_indicador_id_fkey` FOREIGN KEY (`indicador_id`) REFERENCES `indicadores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediciones_indicador` ADD CONSTRAINT `mediciones_indicador_capturado_por_id_fkey` FOREIGN KEY (`capturado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediciones_indicador` ADD CONSTRAINT `mediciones_indicador_analizado_por_id_fkey` FOREIGN KEY (`analizado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
