-- AlterTable
ALTER TABLE `message` ADD COLUMN `deletedForReceiver` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `deletedForSender` BOOLEAN NOT NULL DEFAULT false;
