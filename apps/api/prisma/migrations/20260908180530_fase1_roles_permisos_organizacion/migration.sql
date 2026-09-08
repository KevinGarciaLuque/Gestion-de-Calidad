-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `debe_cambiar_password` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `roles` (
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `es_sistema` BOOLEAN NOT NULL DEFAULT false,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`codigo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permisos` (
    `codigo` VARCHAR(191) NOT NULL,
    `modulo` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,

    INDEX `permisos_modulo_idx`(`modulo`),
    PRIMARY KEY (`codigo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles_permisos` (
    `rol_codigo` VARCHAR(191) NOT NULL,
    `permiso_codigo` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`rol_codigo`, `permiso_codigo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios_roles` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `rol_codigo` VARCHAR(191) NOT NULL,
    `tipo_alcance` ENUM('GLOBAL', 'UNIDAD', 'PROCESO') NOT NULL DEFAULT 'GLOBAL',
    `unidad_id` VARCHAR(191) NULL,
    `proceso_id` VARCHAR(191) NULL,
    `expira_at` DATETIME(3) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `usuarios_roles_usuario_id_idx`(`usuario_id`),
    UNIQUE INDEX `usuarios_roles_usuario_id_rol_codigo_tipo_alcance_unidad_id__key`(`usuario_id`, `rol_codigo`, `tipo_alcance`, `unidad_id`, `proceso_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `familia` VARCHAR(191) NOT NULL,
    `expira_at` DATETIME(3) NOT NULL,
    `revocado_at` DATETIME(3) NULL,
    `reemplazado_por` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    INDEX `refresh_tokens_usuario_id_idx`(`usuario_id`),
    INDEX `refresh_tokens_familia_idx`(`familia`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unidades_organizativas` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `tipo` ENUM('HOSPITAL', 'DIRECCION', 'SUBDIRECCION', 'DEPARTAMENTO', 'SERVICIO', 'AREA') NOT NULL,
    `padre_id` VARCHAR(191) NULL,
    `responsable_id` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `creado_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `unidades_organizativas_codigo_key`(`codigo`),
    INDEX `unidades_organizativas_padre_id_idx`(`padre_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `roles_permisos` ADD CONSTRAINT `roles_permisos_rol_codigo_fkey` FOREIGN KEY (`rol_codigo`) REFERENCES `roles`(`codigo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles_permisos` ADD CONSTRAINT `roles_permisos_permiso_codigo_fkey` FOREIGN KEY (`permiso_codigo`) REFERENCES `permisos`(`codigo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_roles` ADD CONSTRAINT `usuarios_roles_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_roles` ADD CONSTRAINT `usuarios_roles_rol_codigo_fkey` FOREIGN KEY (`rol_codigo`) REFERENCES `roles`(`codigo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_roles` ADD CONSTRAINT `usuarios_roles_unidad_id_fkey` FOREIGN KEY (`unidad_id`) REFERENCES `unidades_organizativas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unidades_organizativas` ADD CONSTRAINT `unidades_organizativas_padre_id_fkey` FOREIGN KEY (`padre_id`) REFERENCES `unidades_organizativas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unidades_organizativas` ADD CONSTRAINT `unidades_organizativas_responsable_id_fkey` FOREIGN KEY (`responsable_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
