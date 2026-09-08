-- CreateTable
CREATE TABLE `notificaciones` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `nivel` ENUM('INFO', 'AVISO', 'URGENTE') NOT NULL DEFAULT 'AVISO',
    `titulo` VARCHAR(191) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `entidad` VARCHAR(191) NULL,
    `entidad_id` VARCHAR(191) NULL,
    `ruta` VARCHAR(191) NULL,
    `clave_dedup` VARCHAR(191) NULL,
    `leida_at` DATETIME(3) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notificaciones_usuario_id_leida_at_idx`(`usuario_id`, `leida_at`),
    UNIQUE INDEX `notificaciones_usuario_id_clave_dedup_key`(`usuario_id`, `clave_dedup`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reglas_automatizacion` (
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `config` JSON NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `actualizado_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`codigo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ejecuciones_motor` (
    `id` VARCHAR(191) NOT NULL,
    `inicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fin` DATETIME(3) NULL,
    `notificaciones` INTEGER NOT NULL DEFAULT 0,
    `detalle` JSON NOT NULL,
    `manual` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notificaciones` ADD CONSTRAINT `notificaciones_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
