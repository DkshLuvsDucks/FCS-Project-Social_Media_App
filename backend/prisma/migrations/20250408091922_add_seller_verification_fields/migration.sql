-- AlterTable
ALTER TABLE `user` ADD COLUMN `isSeller` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sellerStatus` VARCHAR(20) NULL,
    ADD COLUMN `sellerVerificationDoc` VARCHAR(2048) NULL;
