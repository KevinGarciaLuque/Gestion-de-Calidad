-- AlterTable
ALTER TABLE `hallazgos` ADD COLUMN `mcc_id` VARCHAR(191) NULL,
    MODIFY `origen` ENUM('AUDITORIA', 'INDICADOR', 'QUEJA', 'INCIDENTE', 'INSPECCION', 'REVISION_DIRECCION', 'CONTROL_MCC', 'OTRO') NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `hallazgos_mcc_id_key` ON `hallazgos`(`mcc_id`);

-- AddForeignKey
ALTER TABLE `hallazgos` ADD CONSTRAINT `hallazgos_mcc_id_fkey` FOREIGN KEY (`mcc_id`) REFERENCES `registros_mcc`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

