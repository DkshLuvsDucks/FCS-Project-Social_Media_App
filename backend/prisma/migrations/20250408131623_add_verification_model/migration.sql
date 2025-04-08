-- AlterTable
ALTER TABLE `user` ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `phoneVerified` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `VerificationCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `type` VARCHAR(10) NOT NULL,
    `value` VARCHAR(255) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `verified` BOOLEAN NOT NULL DEFAULT false,

    INDEX `VerificationCode_userId_idx`(`userId`),
    INDEX `VerificationCode_type_value_idx`(`type`, `value`),
    INDEX `VerificationCode_expiresAt_idx`(`expiresAt`),
    INDEX `VerificationCode_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VerificationCode` ADD CONSTRAINT `VerificationCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
