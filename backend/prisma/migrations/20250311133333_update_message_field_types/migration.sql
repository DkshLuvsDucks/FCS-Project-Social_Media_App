-- AlterTable
ALTER TABLE `message` MODIFY `algorithm` VARCHAR(255) NULL,
    MODIFY `encryptedContent` TEXT NULL,
    MODIFY `hmac` TEXT NULL,
    MODIFY `iv` TEXT NULL,
    MODIFY `authTag` TEXT NULL,
    MODIFY `content` TEXT NULL;
