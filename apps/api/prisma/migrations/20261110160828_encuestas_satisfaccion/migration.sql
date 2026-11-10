-- CreateTable
CREATE TABLE `encuestas_satisfaccion` (
    `id` VARCHAR(191) NOT NULL,
    `proceso_id` VARCHAR(191) NOT NULL,
    `calificacion_general` INTEGER NOT NULL,
    `atencion_personal` INTEGER NOT NULL,
    `tiempo_espera` INTEGER NOT NULL,
    `limpieza` INTEGER NOT NULL,
    `recomendaria` BOOLEAN NULL,
    `comentario` TEXT NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `encuestas_satisfaccion_proceso_id_creado_at_idx`(`proceso_id`, `creado_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `encuestas_satisfaccion` ADD CONSTRAINT `encuestas_satisfaccion_proceso_id_fkey` FOREIGN KEY (`proceso_id`) REFERENCES `procesos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
