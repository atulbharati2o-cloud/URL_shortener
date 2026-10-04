-- CreateTable
CREATE TABLE `TicketServer` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TicketServer_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketRange` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `startValue` BIGINT NOT NULL,
    `endValue` BIGINT NOT NULL,
    `currentValue` BIGINT NOT NULL,
    `serverId` BIGINT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TicketRange_serverId_idx`(`serverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TicketRange` ADD CONSTRAINT `TicketRange_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `TicketServer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
