-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `ultimo_acceso_at` DATETIME(3) NULL,
    `intentos_fallidos` INTEGER NOT NULL DEFAULT 0,
    `bloqueado_hasta` DATETIME(3) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bitacora` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actor_id` VARCHAR(191) NULL,
    `actor_email` VARCHAR(191) NULL,
    `accion` VARCHAR(191) NOT NULL,
    `entidad` VARCHAR(191) NULL,
    `entidad_id` VARCHAR(191) NULL,
    `valor_anterior` JSON NULL,
    `valor_nuevo` JSON NULL,
    `ip` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,

    INDEX `bitacora_fecha_idx`(`fecha`),
    INDEX `bitacora_actor_id_idx`(`actor_id`),
    INDEX `bitacora_entidad_entidad_id_idx`(`entidad`, `entidad_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bitacora` ADD CONSTRAINT `bitacora_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
