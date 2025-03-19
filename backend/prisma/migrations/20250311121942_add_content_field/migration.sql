-- AlterTable
ALTER TABLE `message` ADD COLUMN `content` VARCHAR(191) NULL,
    MODIFY `algorithm` VARCHAR(191) NULL,
    MODIFY `encryptedContent` VARCHAR(191) NULL,
    MODIFY `hmac` VARCHAR(191) NULL,
    MODIFY `iv` VARCHAR(191) NULL,
    MODIFY `authTag` VARCHAR(191) NULL;
