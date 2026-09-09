-- CreateTable
CREATE TABLE `mapa_procesos_config` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `entradas` JSON NOT NULL,
    `salidas` JSON NOT NULL,
    `franja_superior` JSON NOT NULL,
    `nota_pie` TEXT NULL,
    `actualizado_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
