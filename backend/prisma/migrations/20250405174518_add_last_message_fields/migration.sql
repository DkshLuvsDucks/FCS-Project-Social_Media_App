-- AlterTable
ALTER TABLE `conversation` ADD COLUMN `lastMessage` TEXT NULL,
    ADD COLUMN `lastMessageMediaType` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `groupchat` ADD COLUMN `lastMessage` TEXT NULL,
    ADD COLUMN `lastMessageMediaType` VARCHAR(50) NULL;
